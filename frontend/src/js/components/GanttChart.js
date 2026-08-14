import { escapeHtml } from '../utils.js';
import { statusBadge } from './ui.js';
import { selectHTML, mountSelects } from './select.js';

const ROW_H = 44;
const GROUP_H = 38;
const LABEL_W = 240; // default task-name column width (drag its right edge to resize)
const MIN_LABEL_W = 160;
const MAX_LABEL_W = 480;
const BAR_H = 14;
const BAR_PLANNED_Y = 11;
const BAR_ACTUAL_Y = 31;
const HEADER_H = 44;

// Timeline scales: px per day + how the header ticks are drawn.
const SCALES = {
  day: { px: 8, name: 'Day', kind: 'day' },
  week: { px: 4, name: 'Week', kind: 'week' },
  biweek: { px: 2.2, name: '2 Weeks', kind: 'biweek' },
  month: { px: 1.2, name: 'Month', kind: 'month' },
  quarter: { px: 0.45, name: 'Quarter', kind: 'quarter' },
};

// Zoom levels (multiplier on the base px/day of the current scale).
const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3, 4];

// --- View-state persistence (scale, sort, column mode/width, zoom) ----------
// Saved to localStorage so the Gantt looks the same across pages and sessions;
// the container dataset is the lighter per-render layer on top of it.
const VIEW_KEY = 'ganttView';
const SORT_MODES = ['order', 'start', 'delay', 'name'];
const COL_MODES = ['scroll', 'pin', 'hide'];

function loadView() {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}
function saveView(partial) {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify({ ...(loadView() || {}), ...partial }));
  } catch {
    /* storage unavailable — view settings just won't persist */
  }
}

const SCHEDULE_META = {
  DELAYED: { label: 'Delayed', color: '#dc2626' },
  AT_RISK: { label: 'At risk', color: '#d97706' },
  ON_TRACK: { label: 'On track', color: '#16a34a' },
};

function dayKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}
function dateFromKey(key) {
  return new Date(`${key}T00:00:00Z`);
}
function addDays(key, n) {
  const d = dateFromKey(key);
  d.setUTCDate(d.getUTCDate() + n);
  return dayKey(d);
}

/**
 * Snap an ISO date to a business day (Mon–Fri): Saturday snaps back to Friday,
 * Sunday snaps forward to Monday. Returns the "YYYY-MM-DD" key.
 */
export function snapToBusinessDay(iso) {
  if (!iso) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  if (day === 0) d.setUTCDate(d.getUTCDate() + 1); // Sun -> Mon
  else if (day === 6) d.setUTCDate(d.getUTCDate() - 1); // Sat -> Fri
  return d.toISOString().slice(0, 10);
}

/**
 * Calendar-day shift to apply so the resulting date is a business day (Mon–Fri).
 */
function businessDayShift(dateStr, deltaDays) {
  if (!dateStr) return deltaDays;
  const start = new Date(dateStr);
  const snapped = dateFromKey(snapToBusinessDay(addDays(dayKey(dateStr), deltaDays)));
  return Math.round((snapped - start) / 86400000);
}

/** "MMM d" with the year only when it differs from the current year. */
function compactDate(iso) {
  const d = new Date(iso);
  const opts = { month: 'short', day: 'numeric', timeZone: 'UTC' };
  if (d.getUTCFullYear() !== new Date().getUTCFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('en-US', opts);
}

function sortTasks(tasks, mode) {
  const sorted = [...tasks];
  if (mode === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (mode === 'delay') {
    const rank = { DELAYED: 0, AT_RISK: 1, ON_TRACK: 2 };
    sorted.sort((a, b) => {
      const byStatus = (rank[a.scheduleStatus] ?? 3) - (rank[b.scheduleStatus] ?? 3);
      if (byStatus !== 0) return byStatus;
      return dayKey(a.plannedStartDate).localeCompare(dayKey(b.plannedStartDate));
    });
  } else {
    // 'order' (default): manual drag order first, then planned start.
    sorted.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || dayKey(a.plannedStartDate).localeCompare(dayKey(b.plannedStartDate)));
  }
  return sorted;
}

/**
 * Render a Gantt chart.
 *
 * data — either { project, tasks, schedule } (single) or
 *        { projects: [{ project, tasks, schedule, _total? }], schedule } (global).
 *
 * options:
 *   onTaskClick(task)             — open the task editor
 *   onNewTask()                   — open the create-task form
 *   onReschedule(task, deltaDays) — shift planned dates (drag the bar)
 *   onResizeEnd(task, deltaDays)  — change planned end (drag the right edge)
 *   onReorder(projectId, taskIds) — persist a new display order within a project
 */
export function renderGantt(container, data, { onTaskClick, onNewTask, onReschedule, onResizeEnd, onReorder } = {}) {
  const globalMode = Boolean(data.projects);
  const groups = (data.projects || [{ project: data.project, tasks: data.tasks || [], schedule: data.schedule }]).map((g) => ({
    ...g,
    _tasks: sortTasks(g.tasks || [], container.dataset.ganttSort || 'order'),
  }));

  const allTasks = groups.flatMap((g) => g._tasks);
  if (allTasks.length === 0) {
    container.innerHTML = `
      <div class="card"><div class="card-body">
        <div class="toolbar">
          <button class="btn btn-primary" data-gantt-new>+ New Task</button>
        </div>
        <div class="empty-state"><div class="empty-icon"><i class="bi bi-calendar3"></i></div>No tasks match the current filters.</div>
      </div></div>`;
    container.querySelector('[data-gantt-new]')?.addEventListener('click', () => onNewTask?.());
    return;
  }

  // --- Timeline geometry ------------------------------------------------------
  // Resolve the view settings from (in order): the current container dataset
  // (mid-session re-renders), localStorage (across pages/sessions), defaults.
  const stored = loadView();
  const storedVal = (k) => (stored && stored[k] !== undefined && stored[k] !== null && stored[k] !== '' ? stored[k] : undefined);

  let colMode = container.dataset.ganttCol || storedVal('col') || 'pin'; // 'scroll' | 'pin' | 'hide'
  if (!COL_MODES.includes(colMode)) colMode = 'pin';
  let scaleKey = container.dataset.ganttScale || storedVal('scale') || 'day';
  if (!SCALES[scaleKey]) scaleKey = 'day';
  let sortMode = container.dataset.ganttSort || storedVal('sort') || 'order';
  if (!SORT_MODES.includes(sortMode)) sortMode = 'order';
  let zoom = Number(container.dataset.ganttZoom || (storedVal('zoom') ?? 1));
  if (!ZOOM_STEPS.includes(zoom)) zoom = 1;
  let labelW = Number(container.dataset.ganttLabelW || storedVal('labelW') || LABEL_W);
  labelW = Number.isFinite(labelW) ? Math.max(MIN_LABEL_W, Math.min(MAX_LABEL_W, labelW)) : LABEL_W;

  // Hydrate the dataset so all downstream reads (and this session's re-renders)
  // keep working unchanged.
  container.dataset.ganttCol = colMode;
  container.dataset.ganttScale = scaleKey;
  container.dataset.ganttSort = sortMode;
  container.dataset.ganttZoom = String(zoom);
  container.dataset.ganttLabelW = String(labelW);

  const scale = SCALES[scaleKey];
  const zoomIdx = ZOOM_STEPS.indexOf(zoom);
  const isDefaultView = scaleKey === 'day' && sortMode === 'order' && colMode === 'pin' && zoom === 1 && labelW === LABEL_W;

  const keys = allTasks.flatMap((t) => {
    const list = [dayKey(t.plannedStartDate), dayKey(t.plannedEndDate)];
    if (t.actualStartDate) list.push(dayKey(t.actualStartDate));
    if (t.actualEndDate) list.push(dayKey(t.actualEndDate));
    return list;
  });
  groups.forEach((g) => {
    if (g.project.plannedStartDate) keys.push(dayKey(g.project.plannedStartDate));
    if (g.project.plannedEndDate) keys.push(dayKey(g.project.plannedEndDate));
  });
  keys.push(dayKey(new Date()));
  keys.sort();

  const startKey = addDays(keys[0], -7);
  const endKey = addDays(keys[keys.length - 1], 7);
  const startMs = dateFromKey(startKey).getTime();
  const endMs = dateFromKey(endKey).getTime();
  const totalDays = Math.max(1, Math.round((endMs - startMs) / 86400000));
  // Compressed scales (Week / 2 Weeks / Month / Quarter) must never shrink the
  // timeline below the visible viewport — otherwise the chart squeezes into the
  // top-left corner with unreadable bars and overlapping axis labels. The day
  // scale keeps its natural width and scrolls horizontally instead.
  const naturalW = totalDays * scale.px * zoom;
  const colWidth = colMode === 'hide' ? 0 : labelW;
  const viewportW = Math.max(320, container.clientWidth - colWidth);
  const timelineW = Math.max(naturalW, viewportW);
  const pxPerDay = timelineW / totalDays;

  const xFor = (iso) => {
    if (!iso) return null;
    const k = dayKey(iso);
    if (k < startKey) return 0;
    if (k > endKey) return timelineW;
    return Math.round(((dateFromKey(k).getTime() - startMs) / 86400000) * pxPerDay);
  };
  const widthFor = (a, b) => Math.max(pxPerDay, xFor(b) - xFor(a));

  // --- Header (months + scale ticks) -------------------------------------------
  const monthLabels = [];
  const ticks = [];
  const monthShort = (d) => d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  for (let i = 0; i <= totalDays; i += 1) {
    const key = addDays(startKey, i);
    const d = dateFromKey(key);
    const dom = d.getUTCDate();
    const month = d.getUTCMonth();
    const isMonthStart = dom === 1 || i === 0;
    const isEnd = i === totalDays;

    if (isMonthStart) {
      monthLabels.push({ key, label: `${monthShort(d)} '${String(d.getUTCFullYear()).slice(2)}` });
    }

    if (scale.kind === 'day') {
      if (isMonthStart || dom % 5 === 0 || isEnd) ticks.push({ key, label: String(dom) });
    } else if (scale.kind === 'week' || scale.kind === 'biweek') {
      const every = scale.kind === 'week' ? 7 : 14;
      if (i % every === 0 || isEnd) ticks.push({ key, label: `${monthShort(d)} ${dom}` });
    } else if (scale.kind === 'month') {
      if (isMonthStart) ticks.push({ key, label: String(dom) });
    } else if (scale.kind === 'quarter') {
      const q = Math.floor(month / 3) + 1;
      const qStart = [0, 3, 6, 9].includes(month) && dom === 1;
      const lastQ = ticks[ticks.length - 1]?.label;
      if (qStart) {
        ticks.push({ key, label: `Q${q} '${String(d.getUTCFullYear()).slice(2)}` });
      } else if (isEnd && lastQ !== `Q${q} '${String(d.getUTCFullYear()).slice(2)}`) {
        ticks.push({ key, label: `Q${q} '${String(d.getUTCFullYear()).slice(2)}` });
      }
    }
  }
  const seen = new Set();
  const uniqTicks = ticks.filter((t) => (seen.has(t.key) ? false : (seen.add(t.key), true)));

  // Drop tick labels that would overlap the previous one (grid lines below
  // still use the full set, so the day structure stays visible).
  const tickLabels = [];
  let lastTickX = -Infinity;
  for (const t of uniqTicks) {
    const x = xFor(t.key);
    if (x - lastTickX < 38) continue;
    tickLabels.push(t);
    lastTickX = x;
  }

  // --- Row model -----------------------------------------------------------------
  const rows = [];
  groups.forEach((g, gi) => {
    rows.push({ kind: 'group', gi, top: 0 });
    g._tasks.forEach((t) => rows.push({ kind: 'task', gi, task: t, top: 0 }));
  });
  let cursor = 0;
  const taskRowIndex = new Map();
  rows.forEach((r, i) => {
    r.top = cursor;
    r.height = r.kind === 'group' ? GROUP_H : ROW_H;
    cursor += r.height;
    if (r.kind === 'task') taskRowIndex.set(r.task.id, i);
  });
  const contentH = cursor;
  const taskById = new Map(allTasks.map((t) => [t.id, t]));

  const groupComplete = (g) => g._tasks.length === (g._total ?? g.tasks.length);
  const reorderEnabled = sortMode === 'order' && typeof onReorder === 'function';

  const dragGlyph = (t, g) => {
    if (!reorderEnabled) return '';
    if (!groupComplete(g)) return '<span class="gantt-drag disabled" title="Clear filters to reorder tasks"><i class="bi bi-grip-vertical"></i></span>';
    if (t.dependencies && t.dependencies.length > 0) return '<span class="gantt-drag locked" title="Has dependencies — cannot be reordered"><i class="bi bi-lock"></i></span>';
    return '<span class="gantt-drag" title="Drag to reorder within this project"><i class="bi bi-grip-vertical"></i></span>';
  };

  // --- Timeline rows ----------------------------------------------------------------
  const timelineRows = rows
    .map((r) => {
      if (r.kind === 'group') {
        const g = groups[r.gi];
        const px = g.project.plannedStartDate ? xFor(g.project.plannedStartDate) : 0;
        const pw = g.project.plannedEndDate ? widthFor(g.project.plannedStartDate, g.project.plannedEndDate) : 0;
        const progW = Math.round((pw * (g.project.progressPercentage || 0)) / 100);
        return `<div class="gantt-row gantt-group-row" style="height:${r.height}px" data-gi="${r.gi}">
          <div class="gantt-bar project" style="left:${px}px;top:12px;width:${pw}px" title="${escapeHtml(g.project.name)}"></div>
          ${progW > 0 ? `<div class="gantt-bar project-progress" style="left:${px}px;top:12px;width:${progW}px"></div>` : ''}
        </div>`;
      }

      const t = r.task;
      const plannedX = xFor(t.plannedStartDate);
      const plannedW = widthFor(t.plannedStartDate, t.plannedEndDate);
      const progressW = Math.round((plannedW * (t.progressPercentage || 0)) / 100);
      const actualBar = t.actualStartDate
        ? `<div class="gantt-bar actual status-${t.status}" style="left:${xFor(t.actualStartDate)}px;top:${BAR_ACTUAL_Y}px;width:${widthFor(t.actualStartDate, t.actualEndDate || new Date())}px"></div>`
        : '';

      return `
        <div class="gantt-row ${t.scheduleStatus === 'DELAYED' ? 'delayed' : ''} ${t.scheduleStatus === 'AT_RISK' ? 'at-risk' : ''}" style="height:${r.height}px" data-task-id="${t.id}" data-gi="${r.gi}">
          <div class="gantt-bar planned status-${t.status}" style="left:${plannedX}px;top:${BAR_PLANNED_Y}px;width:${plannedW}px" title="${escapeHtml(t.name)} — ${compactDate(t.plannedStartDate)} → ${compactDate(t.plannedEndDate)} (drag to move)"></div>
          <div class="gantt-resize" style="left:${plannedX + plannedW - 3}px;top:${BAR_PLANNED_Y}px" title="Drag to change the planned end date"></div>
          ${t.progressPercentage > 0 ? `<div class="gantt-bar progress" style="left:${plannedX}px;top:${BAR_PLANNED_Y}px;width:${progressW}px"></div>` : ''}
          ${actualBar}
        </div>`;
    })
    .join('');

  // --- Labels (sticky column) ---------------------------------------------------------
  const varianceNote = (t) => {
    if (t.scheduleStatus === 'DELAYED' && t.scheduleDaysLate > 0) return `${t.scheduleDaysLate}d late`;
    if (t.scheduleStatus === 'AT_RISK') return t.startedLateDays > 0 ? `started ${t.startedLateDays}d late` : 'approaching end';
    return '';
  };

  const labelRows = rows
    .map((r) => {
      if (r.kind === 'group') {
        const g = groups[r.gi];
        return `<div class="gantt-row-label gantt-group-label" style="height:${r.height}px;width:${labelW}px">
          <span class="g-main">
            <span class="gname">${escapeHtml(g.project.name)}</span>
            <span class="gcode">${escapeHtml(g.project.projectCode)} · ${g._tasks.length} tasks · ${g.project.progressPercentage}%</span>
          </span>
          ${statusBadge(g.project.status)}
        </div>`;
      }

      const t = r.task;
      const varNote = varianceNote(t);
      const fullTitle = `${t.taskCode} — ${escapeHtml(t.name)}\nPlanned: ${compactDate(t.plannedStartDate)} → ${compactDate(t.plannedEndDate)}${t.actualStartDate ? `\nActual: ${compactDate(t.actualStartDate)} → ${compactDate(t.actualEndDate)}` : ''}${(t.dependencies || []).length ? `\nDepends on: ${t.dependencies.map((d) => d.taskCode).join(', ')}` : ''}`;
      return `
        <div class="gantt-row-label ${t.scheduleStatus === 'DELAYED' ? 'delayed' : ''} ${t.scheduleStatus === 'AT_RISK' ? 'at-risk' : ''}" style="height:${r.height}px;width:${labelW}px" data-task-id="${t.id}" data-gi="${r.gi}"
             title="${fullTitle}" ${reorderEnabled && groupComplete(groups[r.gi]) && !(t.dependencies && t.dependencies.length) ? 'draggable="true"' : ''}>
          ${dragGlyph(t, groups[r.gi])}
          ${t.scheduleStatus !== 'ON_TRACK' ? `<span class="gantt-sched ${t.scheduleStatus.toLowerCase()}" title="${SCHEDULE_META[t.scheduleStatus].label}"><span class="badge-dot gantt-dot" style="background:${SCHEDULE_META[t.scheduleStatus].color}"></span></span>` : ''}
          <span class="g-main">
            <span class="tname">${escapeHtml(t.name)}</span>
            <span class="tdates">${compactDate(t.plannedStartDate)} → ${compactDate(t.plannedEndDate)}${varNote ? ` <span class="tvar ${t.scheduleStatus.toLowerCase()}">${escapeHtml(varNote)}</span>` : ''}</span>
          </span>
        </div>`;
    })
    .join('');

  // --- Dependency links -----------------------------------------------------------------
  let links = '';
  allTasks.forEach((t) => {
    for (const dep of t.dependencies || []) {
      const pred = taskById.get(dep.dependsOnTaskId);
      const predRow = pred ? taskRowIndex.get(pred.id) : undefined;
      const tRow = taskRowIndex.get(t.id);
      if (predRow === undefined || tRow === undefined) continue;
      const predEndX = xFor(pred.plannedEndDate);
      const startX = xFor(t.plannedStartDate);
      const predY = rows[predRow].top + BAR_PLANNED_Y + BAR_H / 2;
      const tY = rows[tRow].top + BAR_PLANNED_Y + BAR_H / 2;
      const midY = (predY + tY) / 2;
      const gap = 4;
      links += `<path d="M ${predEndX} ${predY}
        L ${predEndX + gap} ${predY}
        L ${predEndX + gap} ${midY}
        L ${Math.max(startX - gap, 0)} ${midY}
        L ${Math.max(startX - gap, 0)} ${tY}
        L ${startX} ${tY}" />`;
    }
  });

  const todayX = xFor(new Date());
  const todayLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

  // --- Toolbar --------------------------------------------------------------------------
  const sched = data.schedule || { ON_TRACK: 0, AT_RISK: 0, DELAYED: 0 };
  const schedChips = ['DELAYED', 'AT_RISK', 'ON_TRACK']
    .map((k) => {
      const meta = SCHEDULE_META[k];
      return `<span class="gantt-chip ${k.toLowerCase()}" style="color:${meta.color};background:${meta.color}14"><span class="badge-dot" style="background:${meta.color}"></span>${meta.label}: <strong>${sched[k] ?? 0}</strong></span>`;
    })
    .join('');

  const sortOptionsArr = [
    ['order', 'Order (manual)'],
    ['start', 'Planned start'],
    ['delay', 'Delayed first'],
    ['name', 'Name'],
  ];

  container.innerHTML = `
    <div class="gantt" data-col="${colMode}">
      <div class="gantt-toolbar">
        <strong>${escapeHtml(globalMode ? 'All Projects' : groups[0].project.name)}</strong>
        <span>${allTasks.length} tasks${globalMode ? ` · ${groups.length} project(s)` : ''}</span>
        <span class="gantt-zoom">
          <button type="button" class="btn btn-sm" data-gantt-zoom-out title="Zoom out" ${zoomIdx === 0 ? 'disabled' : ''}>−</button>
          <span class="gantt-zoom-label" data-gantt-zoom-label title="Zoom level (100% = default)">${Math.round(zoom * 100)}%</span>
          <button type="button" class="btn btn-sm" data-gantt-zoom-in title="Zoom in" ${zoomIdx === ZOOM_STEPS.length - 1 ? 'disabled' : ''}>+</button>
        </span>
        ${selectHTML({ name: 'ganttScale', options: Object.entries(SCALES).map(([k, s]) => [k, s.name]), value: container.dataset.ganttScale || 'day', attrs: 'class="gantt-scale" title="Timeline scale"' })}
        ${selectHTML({ name: 'ganttSort', options: sortOptionsArr, value: sortMode, attrs: 'class="gantt-sort" title="Sort tasks"' })}
        ${selectHTML({ name: 'ganttCol', options: [['scroll', 'Scroll'], ['pin', 'Pin'], ['hide', 'Hide']], value: colMode, attrs: 'class="gantt-col" title="Task name column"' })}
        ${isDefaultView ? '' : '<button type="button" class="btn btn-sm" data-gantt-view-reset title="Reset scale, sort, column mode/width and zoom to defaults">⟲ Reset view</button>'}
        <span class="spacer"></span>
        <button class="btn btn-primary btn-sm" data-gantt-new>+ New Task</button>
      </div>
      <div class="gantt-summary">${schedChips}</div>
      <div class="gantt-legend">
        <span class="legend-item"><span class="legend-bar planned"></span> Planned (drag to reschedule)</span>
        <span class="legend-item"><span class="legend-bar actual"></span> Actual</span>
        <span class="legend-item"><span class="legend-bar progress"></span> Progress</span>
        <span class="legend-item"><span class="legend-bar today"></span> Today</span>
        ${reorderEnabled && colMode !== 'hide' ? '<span class="legend-item legend-hint"><i class="bi bi-grip-vertical"></i> drag a task to reorder it (same project only)</span>' : ''}
      </div>
      <div class="gantt-scroll">
        <div class="gantt-body" style="width:${colWidth + timelineW}px">
          <div class="gantt-left" style="width:${labelW}px">
            <div class="gantt-left-head" style="height:${HEADER_H}px">
              <div class="gantt-left-title">Task</div>
            </div>
            <div class="gantt-labels" style="width:${labelW}px">${labelRows}</div>
            <div class="gantt-col-resize" data-gantt-col-resize title="Drag to resize the task-name column"></div>
          </div>
          <div class="gantt-right" style="width:${timelineW}px">
            <div class="gantt-header" style="height:${HEADER_H}px;width:${timelineW}px">
              ${monthLabels.map((m) => `<div class="gantt-header-month" style="left:${xFor(m.key)}px">${escapeHtml(m.label)}</div>`).join('')}
              ${tickLabels.map((t) => `<div class="gantt-header-day" style="left:${xFor(t.key)}px;transform:translateX(-50%)">${escapeHtml(t.label)}</div>`).join('')}
              <div class="gantt-today-label" style="left:${todayX}px;top:24px">${escapeHtml(todayLabel)}</div>
            </div>
            <div class="gantt-grid" style="position:relative;width:${timelineW}px;height:${contentH}px">
              ${uniqTicks.map((t) => `<div class="gantt-grid-line" style="left:${xFor(t.key)}px"></div>`).join('')}
              <div class="gantt-grid-line today" style="left:${todayX}px"></div>
              <div class="gantt-rows">${timelineRows}</div>
              <svg class="gantt-links" width="${timelineW}" height="${contentH}">${links}</svg>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  // --- Interactions -----------------------------------------------------------------------
  let suppressClick = false;

  const reRender = () => {
    container.dataset.ganttSort = container.querySelector('.gantt-sort')?.value || 'order';
    container.dataset.ganttScale = container.querySelector('.gantt-scale')?.value || 'day';
    container.dataset.ganttCol = container.querySelector('.gantt-col')?.value || 'pin';
    saveView({ sort: container.dataset.ganttSort, scale: container.dataset.ganttScale, col: container.dataset.ganttCol });
    renderGantt(container, data, { onTaskClick, onNewTask, onReschedule, onResizeEnd, onReorder });
  };

  container.querySelector('.gantt-sort')?.addEventListener('change', reRender);
  container.querySelector('.gantt-scale')?.addEventListener('change', reRender);
  container.querySelector('.gantt-col')?.addEventListener('change', reRender);

  const setZoom = (idx) => {
    const next = ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, idx))];
    if (next === zoom) return;
    container.dataset.ganttZoom = String(next);
    saveView({ zoom: next });
    renderGantt(container, data, { onTaskClick, onNewTask, onReschedule, onResizeEnd, onReorder });
  };
  container.querySelector('[data-gantt-zoom-out]')?.addEventListener('click', () => setZoom(zoomIdx - 1));
  container.querySelector('[data-gantt-zoom-in]')?.addEventListener('click', () => setZoom(zoomIdx + 1));

  container.querySelector('[data-gantt-view-reset]')?.addEventListener('click', () => {
    try {
      localStorage.removeItem(VIEW_KEY);
    } catch {
      /* storage unavailable */
    }
    delete container.dataset.ganttScale;
    delete container.dataset.ganttSort;
    delete container.dataset.ganttCol;
    delete container.dataset.ganttZoom;
    delete container.dataset.ganttLabelW;
    renderGantt(container, data, { onTaskClick, onNewTask, onReschedule, onResizeEnd, onReorder });
  });

  // --- Drag the task-name column's right edge to resize it -------------------------------
  const colResizeHandle = container.querySelector('[data-gantt-col-resize]');
  if (colResizeHandle) {
    const leftPane = container.querySelector('.gantt-left');
    const labelsPane = container.querySelector('.gantt-labels');
    const bodyEl = container.querySelector('.gantt-body');
    colResizeHandle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = labelW;
      const onMove = (ev) => {
        const w = Math.max(MIN_LABEL_W, Math.min(MAX_LABEL_W, startW + (ev.clientX - startX)));
        leftPane.style.width = `${w}px`;
        labelsPane.style.width = `${w}px`;
        leftPane.querySelectorAll('.gantt-row-label').forEach((el) => (el.style.width = `${w}px`));
        bodyEl.style.width = `${(colMode === 'hide' ? 0 : w) + timelineW}px`;
      };
      const onUp = (ev) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        const finalW = Math.max(MIN_LABEL_W, Math.min(MAX_LABEL_W, startW + (ev.clientX - startX)));
        if (Math.abs(finalW - labelW) >= 1) {
          container.dataset.ganttLabelW = String(finalW);
          saveView({ labelW: finalW });
        }
        renderGantt(container, data, { onTaskClick, onNewTask, onReschedule, onResizeEnd, onReorder });
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }
  container.querySelector('[data-gantt-new]')?.addEventListener('click', () => onNewTask?.());

  const openTask = (id) => {
    const task = taskById.get(id);
    if (task) onTaskClick?.(task);
  };
  container.querySelectorAll('.gantt-row[data-task-id]').forEach((row) => {
    row.addEventListener('click', () => {
      if (suppressClick) { suppressClick = false; return; }
      openTask(Number(row.dataset.taskId));
    });
  });
  container.querySelectorAll('.gantt-row-label[data-task-id]').forEach((label) => {
    label.addEventListener('click', () => {
      if (suppressClick) { suppressClick = false; return; }
      openTask(Number(label.dataset.taskId));
    });
  });

  // --- Drag to reschedule (shift) -----------------------------------------------------------
  const attachShiftDrag = (bar, task) => {
    bar.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      suppressClick = true;
      const startX = e.clientX;
      const progressEl = bar.parentElement.querySelector('.gantt-bar.progress');
      let deltaDays = 0;
      const onMove = (ev) => {
        const raw = Math.round((ev.clientX - startX) / pxPerDay);
        deltaDays = businessDayShift(task.plannedStartDate, raw);
        bar.style.transform = `translateX(${deltaDays * pxPerDay}px)`;
        if (progressEl) progressEl.style.transform = `translateX(${deltaDays * pxPerDay}px)`;
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        bar.style.transform = '';
        if (progressEl) progressEl.style.transform = '';
        if (deltaDays !== 0) onReschedule?.(task, deltaDays);
        else suppressClick = false;
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  };
  const attachResizeDrag = (handle, task) => {
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      suppressClick = true;
      const startX = e.clientX;
      const row = handle.parentElement;
      const bar = row.querySelector('.gantt-bar.planned');
      const progressEl = row.querySelector('.gantt-bar.progress');
      const baseW = bar.getBoundingClientRect().width;
      let deltaDays = 0;
      const onMove = (ev) => {
        const raw = Math.round((ev.clientX - startX) / pxPerDay);
        deltaDays = businessDayShift(task.plannedEndDate, raw);
        const w = Math.max(pxPerDay, baseW + deltaDays * pxPerDay);
        bar.style.width = `${w}px`;
        if (progressEl) progressEl.style.width = `${Math.round((w * (task.progressPercentage || 0)) / 100)}px`;
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        bar.style.width = '';
        if (progressEl) progressEl.style.width = '';
        if (deltaDays !== 0) onResizeEnd?.(task, deltaDays);
        else suppressClick = false;
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  };
  container.querySelectorAll('.gantt-bar.planned').forEach((bar) => {
    attachShiftDrag(bar, taskById.get(Number(bar.parentElement.dataset.taskId)));
  });
  container.querySelectorAll('.gantt-resize').forEach((handle) => {
    attachResizeDrag(handle, taskById.get(Number(handle.parentElement.dataset.taskId)));
  });

  // --- Drag to reorder (within the same project, order mode only) --------------------------
  if (reorderEnabled) {
    let draggingId = null;
    let draggingGi = null;

    container.querySelectorAll('.gantt-row-label[draggable="true"]').forEach((label) => {
      label.addEventListener('dragstart', (e) => {
        draggingId = Number(label.dataset.taskId);
        draggingGi = Number(label.dataset.gi);
        e.dataTransfer.setData('text/plain', String(draggingId));
        e.dataTransfer.effectAllowed = 'move';
        label.classList.add('dragging');
      });
      label.addEventListener('dragend', () => {
        container.querySelectorAll('.insert-before, .insert-after').forEach((el) => el.classList.remove('insert-before', 'insert-after'));
        label.classList.remove('dragging');
        draggingId = null;
        draggingGi = null;
      });
    });

    container.querySelectorAll('.gantt-row-label[data-task-id], .gantt-row[data-task-id]').forEach((target) => {
      target.addEventListener('dragover', (e) => {
        if (draggingId === null) return;
        const targetGi = Number(target.dataset.gi);
        if (targetGi !== draggingGi) return; // same project only
        const targetId = Number(target.dataset.taskId);
        if (targetId === draggingId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = target.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        container.querySelectorAll('.insert-before, .insert-after').forEach((el) => el.classList.remove('insert-before', 'insert-after'));
        target.classList.add(before ? 'insert-before' : 'insert-after');
      });
      target.addEventListener('dragleave', () => target.classList.remove('insert-before', 'insert-after'));
      target.addEventListener('drop', (e) => {
        e.preventDefault();
        container.querySelectorAll('.insert-before, .insert-after').forEach((el) => el.classList.remove('insert-before', 'insert-after'));
        if (draggingId === null) return;
        const targetGi = Number(target.dataset.gi);
        if (targetGi !== draggingGi) return;
        const targetId = Number(target.dataset.taskId);
        if (targetId === draggingId) return;

        const group = groups[targetGi];
        const order = group._tasks.map((t) => t.id);
        const from = order.indexOf(draggingId);
        let to = order.indexOf(targetId);
        if (from === -1 || to === -1) return;
        const rect = target.getBoundingClientRect();
        const after = e.clientY >= rect.top + rect.height / 2;
        order.splice(from, 1);
        if (to > from) to -= 1; // account for the removed row
        order.splice(after ? to + 1 : to, 0, draggingId);
        onReorder(group.project.id, order);
      });
    });
  }

  mountSelects(container);
}
