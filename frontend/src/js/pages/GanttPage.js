import { api } from '../api.js';
import { escapeHtml, TASK_STATUSES } from '../utils.js';
import { toast, loadingHtml } from '../components/ui.js';
import { taskFormModal } from '../components/forms.js';
import { renderGantt, snapToBusinessDay } from '../components/GanttChart.js';
import { selectHTML, mountSelects } from '../components/select.js';
import { avatarGroup } from '../components/avatars.js';
import { filterGanttGroups, scheduleOf, personSummaryHtml } from './ganttFilter.js';

/**
 * Global Gantt page: every project on one timeline, filterable by project,
 * stakeholder and task status. Tasks can be created/edited/deleted here,
 * rescheduled by dragging their planned bar, and moved to another project
 * by dragging their label onto a project header.
 */
export default {
  /**
   * params.stakeholder — deep-link from the Stakeholders list
   * (`#/gantt?stakeholder=<id>`): pre-filters the chart to that person's
   * tasks so you can see which projects/tasks they touch and which are
   * at-risk or already delayed.
   */
  async mount(container, params = {}) {
    let projects = []; // groups: { project, tasks, schedule }
    let stakeholders = [];
    let priorities = [];
    const filters = {
      projectId: '',
      stakeholderId: params.stakeholder ? String(params.stakeholder) : '',
      status: '',
    };

    const load = async () => {
      const [ganttData, stk, prio] = await Promise.all([
        api.get('/api/gantt'),
        api.get('/api/stakeholders'),
        api.get('/api/priorities'),
      ]);
      projects = ganttData.projects;
      stakeholders = stk;
      priorities = prio;
    };

    // Keep the deep-link URL in sync (replaceState doesn't fire hashchange,
    // so no re-render is triggered).
    const syncUrl = () => {
      try {
        history.replaceState(null, '', `#/gantt${filters.stakeholderId ? `?stakeholder=${filters.stakeholderId}` : ''}`);
      } catch {
        /* history unavailable — filter still works, only the URL lags */
      }
    };

    // The New Task form gets a fixed project ONLY when the page is already
    // filtered down to a single project; otherwise the user must pick one.
    const liveProject = () => {
      if (!filters.projectId) return null;
      const g = projects.find((p) => p.project.id === Number(filters.projectId));
      return g ? { ...g.project, tasks: g.tasks } : null;
    };

    const render = () => {
      const groups = filterGanttGroups(projects, filters);
      const data = { projects: groups, schedule: scheduleOf(groups) };
      const total = groups.reduce((n, g) => n + g.tasks.length, 0);
      const stk = stakeholders.find((s) => s.id === Number(filters.stakeholderId));
      const stkChip =
        filters.stakeholderId && stk
          ? `<span class="filter-chip" title="แสดงเฉพาะงานที่ ${escapeHtml(stk.name)} เกี่ยวข้อง">
              ${avatarGroup([{ id: stk.id, name: stk.name }], { size: 'sm' })}
              <span>${escapeHtml(stk.name)}</span>
              <button type="button" class="filter-chip-x" id="clearStkFilter" title="ล้างตัวกรองบุคคล">✕</button>
            </span>`
          : '';
      // Option A: one-line per-person summary (counts + at-risk/delayed).
      const stkSummary =
        filters.stakeholderId && stk
          ? personSummaryHtml({ taskCount: total, projectCount: groups.length, schedule: data.schedule })
          : '';

      container.innerHTML = `
        <div class="page-head">
          <h1>Gantt Chart</h1>
          <p class="page-sub">ทุกโปรเจกต์ในไทม์ไลน์เดียว — ลากแถบเพื่อเลื่อนกำหนด, ลากงานเพื่อเปลี่ยนลำดับ (ภายในโปรเจกต์เท่านั้น)</p>
        </div>
        <div class="card" style="margin-bottom:14px">
          <div class="card-body">
            <div class="filter-bar">
              <label>Project
                ${selectHTML({ name: 'filterProject', options: [['', 'All Projects'], ...projects.map((g) => [g.project.id, `${g.project.projectCode} — ${g.project.name}`])], value: filters.projectId, placeholder: 'All Projects', attrs: 'data-filter="projectId"' })}
              </label>
              <label>Stakeholder
                ${selectHTML({ name: 'filterStakeholder', options: [['', 'All Stakeholders'], ...stakeholders.map((s) => [s.id, s.name])], value: filters.stakeholderId, placeholder: 'All Stakeholders', attrs: 'data-filter="stakeholderId"' })}
              </label>
              <label>Status
                ${selectHTML({ name: 'filterStatus', options: [['', 'All Statuses'], ...TASK_STATUSES.map((s) => [s, s.replace('_', ' ')])], value: filters.status, placeholder: 'All Statuses', attrs: 'data-filter="status"' })}
              </label>
              ${stkChip}
              ${stkSummary}
              <button class="btn btn-secondary btn-sm" id="clearFilters">Clear</button>
              <span class="spacer"></span>
              <span class="text-muted" style="font-size:13px">${total} task(s) shown</span>
            </div>
          </div>
        </div>
        <div id="ganttRoot"></div>
      `;

      mountSelects(container);
      container.querySelectorAll('[data-filter]').forEach((sel) => {
        sel.addEventListener('change', () => {
          filters[sel.dataset.filter] = sel.value;
          if (sel.dataset.filter === 'stakeholderId') syncUrl();
          render();
        });
      });
      container.querySelector('#clearStkFilter')?.addEventListener('click', () => {
        filters.stakeholderId = '';
        syncUrl();
        render();
      });
      container.querySelector('#clearFilters').addEventListener('click', () => {
        filters.projectId = '';
        filters.stakeholderId = '';
        filters.status = '';
        syncUrl();
        render();
      });

      renderGantt(container.querySelector('#ganttRoot'), data, {
        onNewTask: () => openCreateTask(liveProject()),
        onTaskClick: (task) => openEditTask(task),
        onReschedule: (task, deltaDays) => reschedule(task, deltaDays),
        onResizeEnd: (task, deltaDays) => resizeEnd(task, deltaDays),
        onReorder: (projectId, taskIds) => reorder(projectId, taskIds),
      });
    };

    const reload = async () => {
      await load();
      render();
    };

    // --- CRUD ---------------------------------------------------------------
    const openCreateTask = (project) => {
      // project is set only when the Gantt filter is narrowed to one project.
      // Without it the form shows a required Project select the user must fill.
      taskFormModal({
        project: project || null,
        projects: projects.map((g) => g.project),
        priorities,
        stakeholders,
        onSubmit: async (payload) => {
          const projectId = project ? project.id : Number(payload.projectId);
          if (!projectId) {
            toast('Please select a project first', 'error');
            return;
          }
          await api.post(`/api/projects/${projectId}/tasks`, payload);
          toast('Task created');
          await reload();
        },
      });
    };

    const openEditTask = (task) => {
      const group = projects.find((g) => g.project.id === task.projectId);
      taskFormModal({
        task,
        project: group ? { ...group.project, tasks: group.tasks } : null,
        priorities,
        stakeholders,
        onSubmit: async (payload) => {
          await api.put(`/api/tasks/${task.id}`, payload);
          toast('Task updated');
          await reload();
        },
        onDelete: async () => {
          await api.del(`/api/tasks/${task.id}`);
          toast('Task deleted');
          await reload();
        },
      });
    };

    // --- Drag handlers ----------------------------------------------------------
    const shiftDay = (iso, n) => {
      const d = new Date(iso);
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };

    const reschedule = async (task, deltaDays) => {
      if (deltaDays === 0) return;
      const plannedStartDate = shiftDay(task.plannedStartDate, deltaDays);
      // The end and due dates are shifted by the same delta, which can land on a
      // weekend even when the start is fine — snap them to business days too.
      const plannedEndDate = snapToBusinessDay(shiftDay(task.plannedEndDate, deltaDays));
      // Keep dueDate valid: it must stay on/after the new planned start.
      let dueDate = snapToBusinessDay(shiftDay(task.dueDate, deltaDays));
      if (dueDate < plannedStartDate) dueDate = plannedStartDate;
      try {
        await api.put(`/api/tasks/${task.id}`, { plannedStartDate, plannedEndDate, dueDate });
        toast(`${task.taskCode} rescheduled by ${deltaDays} day(s)`);
        await reload();
      } catch (err) {
        toast(err.message, 'error');
        await reload();
      }
    };

    const resizeEnd = async (task, deltaDays) => {
      if (deltaDays === 0) return;
      const plannedStartDate = task.plannedStartDate;
      const plannedEndDate = shiftDay(task.plannedEndDate, deltaDays);
      if (plannedEndDate <= plannedStartDate) {
        toast('Planned end must be after planned start', 'error');
        return;
      }
      try {
        await api.put(`/api/tasks/${task.id}`, { plannedEndDate });
        toast(`${task.taskCode} planned end moved by ${deltaDays} day(s)`);
        await reload();
      } catch (err) {
        toast(err.message, 'error');
        await reload();
      }
    };

    const reorder = async (projectId, taskIds) => {
      try {
        await api.put(`/api/projects/${projectId}/tasks/reorder`, { taskIds });
        toast('Task order updated');
        await reload();
      } catch (err) {
        toast(err.message, 'error');
        await reload();
      }
    };

    container.innerHTML = loadingHtml();
    try {
      await load();
      render();
    } catch (err) {
      container.innerHTML = `<div class="page-error"><h2>Failed to load Gantt data</h2><p>${escapeHtml(err.message)}</p></div>`;
    }
  },
};
