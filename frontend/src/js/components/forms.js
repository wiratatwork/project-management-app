import { api } from '../api.js';
import { escapeHtml, toDateInput, isWeekend, PROJECT_STATUSES, TASK_STATUSES, RISK_STATUSES, ROLES, STATUS_COLORS } from '../utils.js';
import { openModal, toast, confirmDialog } from './ui.js';
import { selectHTML, mountSelects } from './select.js';

// ---------------------------------------------------------------------------
// Field builders
// ---------------------------------------------------------------------------

export function field({ name, label, type = 'text', value = '', required = false, options = [], placeholder = '', help = '', min, max, step, full = false, rows, disabled = false }) {
  const req = required ? '<span class="req"> *</span>' : '';
  const cls = full ? 'full' : '';
  const dis = disabled ? ' disabled' : '';
  let input = '';
  if (type === 'select') {
    input = selectHTML({ name, options, value, required, placeholder });
  } else if (type === 'textarea') {
    input = `<textarea name="${name}" ${required ? 'required' : ''} rows="${rows || 3}"${dis}>${escapeHtml(value ?? '')}</textarea>`;
  } else {
    input = `<input type="${type}" name="${name}" value="${escapeHtml(value ?? '')}"${dis}
      ${required ? 'required' : ''} ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined ? `max="${max}"` : ''}
      ${step !== undefined ? `step="${step}"` : ''} ${placeholder ? `placeholder="${escapeHtml(placeholder)}"` : ''} />`;
  }
  return `<div class="form-field ${cls}">
    <label for="${name}">${escapeHtml(label)}${req}</label>${input}
    ${help ? `<div class="help">${help}</div>` : ''}
  </div>`;
}

/**
 * Read-only value shown as plain text instead of a disabled input — used for
 * fields the user cannot change (e.g. Task Code on edit, locked Project).
 */
export function staticField({ label, value = '', full = false, mono = false }) {
  const v = value === null || value === undefined ? '—' : String(value);
  return `<div class="form-field ${full ? 'full' : ''}">
    <label>${escapeHtml(label)}</label>
    <div class="field-static${mono ? ' mono' : ''}">${escapeHtml(v)}</div>
  </div>`;
}

/**
 * Selectable pill group (radio-style chips with a color accent) — used for
 * Status / Priority in forms instead of a dropdown. Values are read by
 * `collectForm` exactly like a radio group.
 */
export function pillGroup({ name, label, value = '', options = [], required = false, help = '', full = false }) {
  const pills = options
    .map(([val, text, color]) => {
      const selected = value !== '' && String(val) === String(value);
      return `<label class="pill-opt${selected ? ' selected' : ''}" style="--pill-color:${color || '#64748b'}">
        <input type="radio" name="${name}" value="${escapeHtml(val)}" ${selected ? 'checked' : ''} ${required ? 'required' : ''} />
        <span class="pill-dot" aria-hidden="true"></span>${escapeHtml(text)}
      </label>`;
    })
    .join('');
  return `<div class="form-field${full ? ' full' : ''}">
    <label>${escapeHtml(label)}${required ? '<span class="req"> *</span>' : ''}</label>
    <div class="pill-group">${pills}</div>
    ${help ? `<div class="help">${help}</div>` : ''}
  </div>`;
}

const AVATAR_COLORS = ['#4f46e5', '#0ea5e9', '#16a34a', '#d97706', '#dc2626', '#7c3aed'];
const initialsOf = (n) =>
  (n || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function collectForm(formEl) {
  const data = {};
  for (const el of formEl.querySelectorAll('[name]')) {
    if (el.type === 'checkbox') {
      if (el.checked) {
        if (!data[el.name]) data[el.name] = [];
        data[el.name].push(el.value);
      } else if (data[el.name] === undefined) {
        data[el.name] = [];
      }
    } else if (el.type === 'radio') {
      if (el.checked) data[el.name] = el.value;
    } else if (el.type === 'number') {
      data[el.name] = el.value === '' ? null : Number(el.value);
    } else if (el.type === 'date') {
      data[el.name] = el.value || null;
    } else {
      data[el.name] = el.value;
    }
  }
  return data;
}

function formShell({ formFields, error = '' }) {
  return `
    ${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}
    <form id="entityForm" class="form-grid" novalidate>
      ${formFields}
    </form>`;
}

function showFieldError(formEl, message) {
  const box = formEl.querySelector('.form-error');
  if (box) box.remove();
  const err = document.createElement('div');
  err.className = 'form-error';
  err.textContent = message;
  formEl.prepend(err);
}

function setFieldError(input, message) {
  clearFieldError(input);
  input.classList.add('field-invalid');
  const err = document.createElement('div');
  err.className = 'field-error';
  err.innerHTML = `<i class="bi bi-exclamation-circle"></i> ${escapeHtml(message)}`;
  input.insertAdjacentElement('afterend', err);
}

function clearFieldError(input) {
  input.classList.remove('field-invalid');
  input.closest('.form-field')?.querySelectorAll('.field-error').forEach((e) => e.remove());
}

/**
 * Prevent impossible dates in every date picker of a form:
 *  - Saturday/Sunday reverts the field and shows an inline error,
 *  - end-before-start re-validates the ordering live.
 */
function bindWeekendGuard(form) {
  const lastValid = new Map();
  form.querySelectorAll('input[type="date"]').forEach((input) => {
    lastValid.set(input, input.value);
    input.addEventListener('change', () => {
      if (input.value && isWeekend(input.value)) {
        setFieldError(input, 'Weekends (Sat/Sun) are not allowed');
        input.value = lastValid.get(input) ?? ''; // revert the weekend pick
      } else {
        clearFieldError(input);
        lastValid.set(input, input.value);
        validateDates(form); // live: end/start ordering (e.g. end before start)
      }
    });
  });
}

/**
 * Returns the first invalid date field, or null when every date is valid
 * (weekday and end >= start). Rules apply to whichever fields exist on the
 * form, so the same check covers both the Task and the Project modal.
 */
function validateDates(form) {
  let firstBad = null;
  const mark = (input, msg) => {
    if (!input) return;
    setFieldError(input, msg);
    if (!firstBad) firstBad = input;
  };
  const val = (n) => form.querySelector(`[name="${n}"]`)?.value || '';
  // Weekends (Sat/Sun) are not allowed anywhere.
  form.querySelectorAll('input[type="date"]').forEach((input) => {
    if (input.value && isWeekend(input.value)) mark(input, 'Weekends (Sat/Sun) are not allowed');
    else clearFieldError(input);
  });
  // End must never come before start (or the due date before planned start).
  const rules = [
    ['plannedEndDate', 'plannedStartDate', 'End date must be on or after start date'],
    ['dueDate', 'plannedStartDate', 'Due date must be on or after start date'],
    ['actualEndDate', 'actualStartDate', 'Actual end date must be on or after actual start date'],
  ];
  for (const [endName, startName, msg] of rules) {
    const end = val(endName);
    const start = val(startName);
    if (end && start && end < start) mark(form.querySelector(`[name="${endName}"]`), msg);
  }
  return firstBad;
}

/**
 * Generic modal form. `fields` is a string of field HTML.
 * onSubmit(values) -> Promise; errors are shown in the modal.
 */
export function entityFormModal({ title, fields, submitText = 'Save', onSubmit, wide = false }) {
  const modal = openModal({
    title,
    body: formShell({ formFields: fields }),
    footer: `
      <button class="btn btn-secondary" data-act="cancel">Cancel</button>
      <button class="btn btn-primary" data-act="submit">${escapeHtml(submitText)}</button>`,
    wide,
  });

  mountSelects(modal.overlay);
  bindWeekendGuard(modal.body.querySelector('#entityForm'));
  modal.overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => modal.close());
  modal.overlay.querySelector('[data-act="submit"]').addEventListener('click', async () => {
    const form = modal.body.querySelector('#entityForm');
    const bad = validateDates(form);
    if (bad) {
      bad.focus();
      return;
    }
    const values = collectForm(form);
    const btn = modal.overlay.querySelector('[data-act="submit"]');
    btn.disabled = true;
    try {
      await onSubmit(values);
      modal.close();
      toast('Saved successfully');
    } catch (err) {
      showFieldError(form, err.message);
      btn.disabled = false;
    }
  });
  return modal;
}

// ---------------------------------------------------------------------------
// Project form
// ---------------------------------------------------------------------------

export async function projectFormModal({ project, stakeholders = [], onSubmit }) {
  const s = project || {};
  // Authoritative selection — lives in a Set (outside the DOM); rows are added
  // and removed against it, so Save always sends exactly what the user picked.
  const prjSel = new Set((project?.stakeholders || []).map((x) => String(x.stakeholderId)));

  // Stakeholder rows match the New/Edit Task modal: avatar + name + remove button.
  const prjStkRow = (st, i) => {
    const c = AVATAR_COLORS[i % AVATAR_COLORS.length];
    const meta = [st.position, st.department].filter(Boolean).join(' · ');
    return `<div class="stk-add-row" data-stkrow="${st.id}">
      <input type="hidden" name="stkId" value="${st.id}" />
      <span class="stk-avatar" style="background:${c}1f;color:${c}" aria-hidden="true">${escapeHtml(initialsOf(st.name))}</span>
      <span class="stk-info">
        <span class="stk-name">${escapeHtml(st.name)}</span>
        <span class="stk-meta">${escapeHtml(meta || st.email || 'Stakeholder')}</span>
      </span>
      <button type="button" class="btn btn-icon btn-ghost" data-remove-stk title="Remove" aria-label="Remove"><i class="bi bi-x-lg"></i></button>
    </div>`;
  };
  const prjRows = stakeholders.filter((st) => prjSel.has(String(st.id))).map(prjStkRow).join('');

  const fields = `
    ${field({ name: 'projectCode', label: 'Project Code', value: s.projectCode, required: true, placeholder: 'PRJ-010', full: true })}
    ${field({ name: 'name', label: 'Project Name', value: s.name, required: true, full: true })}
    ${field({ name: 'description', label: 'Description', value: s.description, type: 'textarea', full: true, rows: 3 })}
    <div class="schedule-cols">
      <div class="schedule-col plan">
        <div class="schedule-col-title"><i class="bi bi-calendar2-check"></i> Plan</div>
        ${field({ name: 'plannedStartDate', label: 'Start', value: toDateInput(s.plannedStartDate), type: 'date', required: true })}
        ${field({ name: 'plannedEndDate', label: 'End', value: toDateInput(s.plannedEndDate), type: 'date', required: true })}
      </div>
      <div class="schedule-col actual">
        <div class="schedule-col-title"><i class="bi bi-clock-history"></i> Actual</div>
        ${field({ name: 'actualStartDate', label: 'Start', value: toDateInput(s.actualStartDate), type: 'date' })}
        ${field({ name: 'actualEndDate', label: 'End', value: toDateInput(s.actualEndDate), type: 'date', help: '<i class="bi bi-info-circle"></i> Optional — filled in as work happens.' })}
      </div>
    </div>
    ${pillGroup({
      name: 'status',
      label: 'Status',
      value: s.status || 'PLANNED',
      options: PROJECT_STATUSES.map((st) => [st, st.replace('_', ' '), STATUS_COLORS[st] || '#64748b']),
      full: true,
    })}
    <div class="form-field full">
      <label>Stakeholders <span class="stk-count" id="prjStkCount">${prjSel.size} of ${stakeholders.length} selected</span></label>
      <div id="prjStkRows" class="stk-add-list">${prjRows}</div>
      <div class="stk-add-bar">
        ${selectHTML({ name: 'prjAddSelect', options: [['', 'Select stakeholder…'], ...stakeholders.map((st) => [st.id, `${st.name} (${st.email})`])], value: '', placeholder: 'Select stakeholder…', attrs: 'id="prjStkAddSelect" style="flex:1"' })}
        <button type="button" class="btn btn-secondary btn-sm" id="prjStkAddBtn"><i class="bi bi-person-plus"></i> Add</button>
      </div>
      <div class="help"><i class="bi bi-info-circle"></i> Choose who is involved in this project.</div>
    </div>
  `;

  const modal = entityFormModal({
    title: project ? `Edit Project — ${s.projectCode}` : 'New Project',
    fields,
    submitText: project ? 'Update' : 'Create',
    wide: true,
    onSubmit: async (values) => {
      const payload = {
        projectCode: values.projectCode,
        name: values.name,
        description: values.description || null,
        plannedStartDate: values.plannedStartDate,
        plannedEndDate: values.plannedEndDate,
        actualStartDate: values.actualStartDate || null,
        actualEndDate: values.actualEndDate || null,
        status: values.status,
        stakeholderIds: [...prjSel].map(Number),
      };
      await onSubmit(payload);
    },
  });

  // Stakeholder rows: delegated remove + Add bar (searchable select), matching
  // the New/Edit Task modal's Task Stakeholders section.
  const pForm = modal.body.querySelector('#entityForm');
  const rowsEl = pForm?.querySelector('#prjStkRows');
  const addSelect = pForm?.querySelector('#prjStkAddSelect');
  const addBtn = pForm?.querySelector('#prjStkAddBtn');
  const countEl = pForm?.querySelector('#prjStkCount');
  const updateCount = () => {
    if (countEl) countEl.textContent = `${prjSel.size} of ${stakeholders.length} selected`;
  };
  rowsEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-stk]');
    if (!btn) return;
    const row = btn.closest('[data-stkrow]');
    if (row) {
      prjSel.delete(row.dataset.stkrow);
      row.remove();
      updateCount();
    }
  });
  addBtn?.addEventListener('click', () => {
    const id = addSelect.value;
    if (!id) return;
    if (prjSel.has(id)) {
      toast('Already added', 'error');
      return;
    }
    prjSel.add(id);
    const st = stakeholders.find((x) => String(x.id) === id);
    if (st) {
      const holder = document.createElement('div');
      holder.innerHTML = prjStkRow(st, rowsEl.children.length);
      rowsEl.appendChild(holder.firstElementChild);
    }
    addSelect.value = '';
    updateCount();
  });

  return modal;
}

// ---------------------------------------------------------------------------
// Task form (project-bound or free project selection)
// ---------------------------------------------------------------------------

export async function taskFormModal({ task, project, projects = [], priorities = [], stakeholders = [], onSubmit, onDelete }) {
  const t = task || {};
  const currentProjectId = task ? task.projectId : project?.id;

  const stkOptions = stakeholders.map((st) => [st.id, `${st.name} (${st.email})`]);
  const taskStakeholders = (t.stakeholders || []).map((s) => ({
    id: s.stakeholderId,
    role: s.role || 'RESPONSIBLE',
  }));
  const depIds = (t.dependencies || []).map((d) => d.dependsOnTaskId);

  const projectField = project
    ? staticField({ label: 'Project', value: `${project.projectCode} — ${project.name}`, full: true })
    : field({
        name: 'projectId',
        label: 'Project',
        value: currentProjectId || '',
        type: 'select',
        options: [['', 'Select project…'], ...projects.map((p) => [p.id, `${p.projectCode} — ${p.name}`])],
        placeholder: 'Select project…',
        required: true,
      });

  // Dependency checkboxes (tasks of the same project, excluding self)
  let depField = '';
  if (project && project.tasks) {
    const options = project.tasks
      .filter((pt) => pt.id !== (task?.id ?? null))
      .map((pt) => [pt.id, `${pt.taskCode} — ${pt.name}`]);
    depField = `<div class="form-field full">
      <label>Dependencies (finish-to-start) <span class="stk-count" id="depCount">0 selected</span></label>
      <div class="dep-search">
        <i class="bi bi-search" aria-hidden="true"></i>
        <input type="text" id="depSearch" placeholder="Search by task code or name…" autocomplete="off" />
      </div>
      <div class="checkbox-list deps-list">${
        options.length
          ? options
              .map(([id, text]) => {
                const checked = depIds.includes(id) ? 'checked' : '';
                return `<label class="cl-row" data-dep-label="${escapeHtml(text.toLowerCase())}"><input type="checkbox" name="dependencyIds" value="${id}" ${checked}><span class="cl-check"><i class="bi bi-check-lg"></i></span><span class="cl-text">${escapeHtml(text)}</span></label>`;
              })
              .join('')
          : '<div class="help">No other tasks in this project yet.</div>'
      }</div>
      <div class="help"><i class="bi bi-info-circle"></i> The system prevents circular dependencies.</div>
    </div>`;
  }

  // Stakeholder rows with avatar + role select
  const initialsOf = (n) =>
    (n || '?')
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  const AVATAR_COLORS = ['#4f46e5', '#0ea5e9', '#16a34a', '#d97706', '#dc2626', '#7c3aed'];
  const stkRowHTML = (id, labelText, role, i) => {
    const name = String(labelText || '').split(' (')[0] || labelText || '';
    const c = AVATAR_COLORS[i % AVATAR_COLORS.length];
    return `<div class="stk-add-row" data-stkrow="${i}">
      <input type="hidden" name="stkId" value="${id}" />
      <span class="stk-avatar" style="background:${c}1f;color:${c}" aria-hidden="true">${escapeHtml(initialsOf(name))}</span>
      <span class="stk-info"><span class="stk-name">${escapeHtml(labelText || '')}</span></span>
      ${selectHTML({ name: 'stkRole', options: ROLES, value: role, attrs: 'style="width:130px"' })}
      <button type="button" class="btn btn-icon btn-ghost" data-remove-stk title="Remove" aria-label="Remove"><i class="bi bi-x-lg"></i></button>
    </div>`;
  };

  const stkRows = taskStakeholders.length
    ? taskStakeholders
        .map((s, i) => stkRowHTML(s.id, stkOptions.find((o) => Number(o[0]) === s.id)?.[1] || `Stakeholder #${s.id}`, s.role, i))
        .join('')
    : '';

  const fields = `
    <section class="form-section">
      <h4 class="form-section-title"><i class="bi bi-briefcase"></i> Details</h4>
      ${projectField}
      ${task ? staticField({ label: 'Task Code', value: t.taskCode, mono: true }) : ''}
      ${field({ name: 'name', label: 'Task Name', value: t.name, required: true })}
      ${pillGroup({ name: 'priorityId', label: 'Priority', value: t.priorityId ? String(t.priorityId) : '', options: priorities.map((p) => [String(p.id), p.name, p.color]), required: true })}
      ${field({ name: 'description', label: 'Description', value: t.description, type: 'textarea', rows: 2, full: true })}
    </section>
    <section class="form-section">
      <h4 class="form-section-title"><i class="bi bi-calendar3"></i> Schedule</h4>
      <div class="schedule-cols">
        <div class="schedule-col plan">
          <div class="schedule-col-title"><i class="bi bi-calendar2-check"></i> Plan</div>
          ${field({ name: 'plannedStartDate', label: 'Start', value: toDateInput(t.plannedStartDate), type: 'date', required: true })}
          ${field({ name: 'plannedEndDate', label: 'End', value: toDateInput(t.plannedEndDate), type: 'date', required: true })}
          ${field({ name: 'dueDate', label: 'Due', value: toDateInput(t.dueDate), type: 'date', required: true, help: '<i class="bi bi-info-circle"></i> Must be on or after the planned start.' })}
        </div>
        <div class="schedule-col actual">
          <div class="schedule-col-title"><i class="bi bi-clock-history"></i> Actual</div>
          ${field({ name: 'actualStartDate', label: 'Start', value: toDateInput(t.actualStartDate), type: 'date' })}
          ${field({ name: 'actualEndDate', label: 'End', value: toDateInput(t.actualEndDate), type: 'date', help: '<i class="bi bi-info-circle"></i> Optional — filled in as work happens.' })}
        </div>
      </div>
      <div class="form-field">
        <label>Status</label>
        <div class="pill-group" id="statusPills">
          ${TASK_STATUSES.map((s) => `
            <label class="pill-opt" style="--pill-color:${STATUS_COLORS[s] || '#64748b'}">
              <input type="radio" name="statusPill" value="${s}" ${(t.status || '') === s ? 'checked' : ''} />
              <span class="pill-dot" aria-hidden="true"></span>${s.replace('_', ' ')}
            </label>`).join('')}
        </div>
        <input type="hidden" name="status" value="${t.status || ''}" />
        <div class="help" id="statusHint"></div>
      </div>
      <div class="form-field">
        <label>Progress <span class="text-muted" style="font-weight:600" id="progressValue">${t.progressPercentage ?? 0}%</span></label>
        <div class="pill-group" id="progressPills">
          ${[0, 20, 40, 60, 80, 100].map((v) => `
            <label class="pill-opt" style="--pill-color:${v === 100 ? '#16a34a' : '#6366f1'}">
              <input type="radio" name="progressPill" value="${v}" ${Number(t.progressPercentage ?? 0) === v ? 'checked' : ''} />
              ${v}
            </label>`).join('')}
        </div>
        <input type="hidden" name="progressPercentage" value="${t.progressPercentage ?? 0}" />
        <div class="help" id="progressHint"></div>
      </div>
    </section>
    <section class="form-section">
      <h4 class="form-section-title"><i class="bi bi-link-45deg"></i> Dependencies</h4>
      ${depField}
    </section>
    <section class="form-section">
      <h4 class="form-section-title"><i class="bi bi-people"></i> Task Stakeholders &amp; Roles</h4>
      <div class="form-field full">
        <div id="stkRows" class="stk-add-list">${stkRows}</div>
        <div class="stk-add-bar">
          ${selectHTML({ name: 'stkAddSelect', options: [['', 'Select stakeholder…'], ...stkOptions], value: '', placeholder: 'Select stakeholder…', attrs: 'id="stkAddSelect" style="flex:1"' })}
          <button type="button" class="btn btn-secondary btn-sm" id="stkAddBtn"><i class="bi bi-person-plus"></i> Add</button>
        </div>
        <div class="help"><i class="bi bi-info-circle"></i> Choose who works on this task and their role.</div>
      </div>
    </section>
  `;

  const modal = entityFormModal({
    title: task ? `Edit Task — ${t.taskCode}` : 'New Task',
    fields,
    submitText: task ? 'Update' : 'Create',
    wide: true,
    onSubmit: async (values) => {
      if (!task && !project && !values.projectId) {
        throw new Error('Please select a project first');
      }
      if (!values.priorityId) {
        throw new Error('Please select a priority');
      }
      const stkIds = Array.from(modal.body.querySelectorAll('[name="stkId"]'));
      const stkRoles = Array.from(formEl ? modal.body.querySelectorAll('[name="stkRole"]') : []);
      const payload = {
        taskCode: values.taskCode,
        name: values.name,
        description: values.description || null,
        priorityId: Number(values.priorityId),
        plannedStartDate: values.plannedStartDate,
        plannedEndDate: values.plannedEndDate,
        dueDate: values.dueDate,
        actualStartDate: values.actualStartDate || null,
        actualEndDate: values.actualEndDate || null,
        status: values.status || undefined,
        progressPercentage: Number(values.progressPercentage) || 0,
        dependencyIds: (values.dependencyIds || []).map(Number),
        stakeholders: stkIds.map((el, i) => ({
          stakeholderId: Number(el.value),
          role: stkRoles[i]?.value || 'RESPONSIBLE',
        })),
      };
      if (!task && !project) payload.projectId = Number(values.projectId);
      await onSubmit(payload);
    },
  });

  // Delete support (edit mode only): adds a Delete button to the modal footer.
  if (onDelete && task) {
    const footer = modal.overlay.querySelector('.modal-footer');
    if (footer) {
      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-danger';
      delBtn.textContent = 'Delete';
      delBtn.style.marginRight = 'auto';
      delBtn.addEventListener('click', async () => {
        const ok = await confirmDialog(`Delete task "${task.name}"?`, { title: 'Delete task' });
        if (!ok) return;
        try {
          await onDelete(task);
          modal.close();
          toast('Task deleted');
        } catch (err) {
          toast(err.message, 'error');
        }
      });
      footer.prepend(delBtn);
    }
  }

  // Stakeholder add/remove wiring
  const formEl = modal.body.querySelector('#entityForm');
  const addSelect = modal.body.querySelector('#stkAddSelect');
  const addBtn = modal.body.querySelector('#stkAddBtn');
  const stkRowsEl = modal.body.querySelector('#stkRows');

  stkRowsEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-stk]');
    if (btn) btn.closest('[data-stkrow]')?.remove();
  });

  addBtn?.addEventListener('click', () => {
    const id = addSelect.value;
    if (!id) return;
    const label = addSelect.selectedLabel;
    if (formEl.querySelector(`input[name="stkId"][value="${id}"]`)) return; // already added
    const holder = document.createElement('div');
    holder.innerHTML = stkRowHTML(id, label, 'RESPONSIBLE', stkRowsEl.children.length);
    const node = holder.firstElementChild;
    stkRowsEl.appendChild(node);
    mountSelects(node); // mount the actual appended row, not the empty holder
    addSelect.value = '';
  });

  // Status ⇄ Progress coupling: 100% auto-sets Status to COMPLETED (and locks
  // it); Status COMPLETED auto-sets Progress to 100% (and locks it).
  const statusInput = modal.body.querySelector('input[name="status"][type="hidden"]');
  const progressInput = modal.body.querySelector('input[name="progressPercentage"][type="hidden"]');
  const statusPillsEl = modal.body.querySelector('#statusPills');
  const progressPillsEl = modal.body.querySelector('#progressPills');
  const statusHintEl = modal.body.querySelector('#statusHint');
  const progressHintEl = modal.body.querySelector('#progressHint');
  const progressValueEl = modal.body.querySelector('#progressValue');

  const setPill = (container, value) => {
    container.querySelectorAll('input[type="radio"]').forEach((i) => {
      i.checked = String(i.value) === String(value);
    });
  };
  const setLocked = (container, locked) => {
    container.classList.toggle('locked', locked);
    container.querySelectorAll('input').forEach((i) => {
      i.disabled = locked;
    });
  };
  const setStatus = (s) => {
    statusInput.value = s;
    setPill(statusPillsEl, s);
  };
  const setProgress = (v) => {
    progressInput.value = String(v);
    setPill(progressPillsEl, v);
    if (progressValueEl) progressValueEl.textContent = `${v}%`;
  };
  const lockStatus = () => {
    setStatus('COMPLETED');
    setLocked(statusPillsEl, true);
    statusHintEl.innerHTML = '<i class="bi bi-lock"></i> Progress 100% — Status is locked to COMPLETED. Choose a lower progress to unlock it.';
    progressHintEl.textContent = '';
  };
  const lockProgress = () => {
    setProgress(100);
    setLocked(progressPillsEl, true);
    progressHintEl.innerHTML = '<i class="bi bi-lock"></i> Status COMPLETED — Progress is locked to 100%. Choose another status to unlock it.';
    statusHintEl.textContent = '';
  };
  const unlockBoth = () => {
    setLocked(statusPillsEl, false);
    setLocked(progressPillsEl, false);
    statusHintEl.textContent = '';
    progressHintEl.textContent = '';
  };

  progressPillsEl.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill-opt');
    if (!pill || progressPillsEl.classList.contains('locked')) return;
    const v = Number(pill.querySelector('input').value);
    if (progressInput.value === String(v)) return;
    setProgress(v);
    if (v === 100) {
      lockStatus();
    } else {
      unlockBoth();
      // COMPLETED can't stay at < 100% (the backend forces it back to 100).
      if (statusInput.value === 'COMPLETED') setStatus('IN_PROGRESS');
    }
  });

  statusPillsEl.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill-opt');
    if (!pill || statusPillsEl.classList.contains('locked')) return;
    const s = pill.querySelector('input').value;
    if (s === statusInput.value) return;
    setStatus(s);
    if (s === 'COMPLETED') {
      lockProgress();
    } else {
      unlockBoth();
      // Stepping away from COMPLETED: drop the auto-set 100% to the next pill.
      if (progressInput.value === '100') setProgress(80);
    }
  });

  // Respect the rules for data loaded into the form.
  if (progressInput.value === '100') lockStatus();
  else if (statusInput.value === 'COMPLETED') lockProgress();

  // Dependency selected-count chip
  const depsList = modal.body.querySelector('.deps-list');
  const depCountEl = modal.body.querySelector('#depCount');
  const updateDepCount = () => {
    if (depCountEl && depsList) {
      const total = depsList.querySelectorAll('input[type="checkbox"]').length;
      const checked = depsList.querySelectorAll('input[type="checkbox"]:checked').length;
      depCountEl.textContent = `${checked} of ${total} selected`;
    }
  };
  depsList?.addEventListener('change', updateDepCount);
  updateDepCount();

  // Dependency search — filters rows by task code or name (case-insensitive).
  const depSearch = modal.body.querySelector('#depSearch');
  depSearch?.addEventListener('input', () => {
    const q = depSearch.value.trim().toLowerCase();
    depsList?.querySelectorAll('.cl-row').forEach((row) => {
      const label = row.dataset.depLabel || '';
      row.style.display = !q || label.includes(q) ? '' : 'none';
    });
  });

  return modal;
}

// ---------------------------------------------------------------------------
// Stakeholder form
// ---------------------------------------------------------------------------

export function stakeholderFormModal({ stakeholder, onSubmit }) {
  const s = stakeholder || {};
  const fields = `
    ${field({ name: 'name', label: 'Name', value: s.name, required: true })}
    ${field({ name: 'email', label: 'Email', value: s.email, type: 'email', required: true })}
    ${field({ name: 'phone', label: 'Phone', value: s.phone })}
    ${field({ name: 'position', label: 'Position', value: s.position })}
    ${field({ name: 'department', label: 'Department', value: s.department })}
    ${field({ name: 'organization', label: 'Organization', value: s.organization })}
  `;
  return entityFormModal({
    title: stakeholder ? `Edit Stakeholder — ${s.name}` : 'New Stakeholder',
    fields,
    wide: true,
    onSubmit: async (values) => {
      await onSubmit({
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        position: values.position || null,
        department: values.department || null,
        organization: values.organization || null,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Priority form
// ---------------------------------------------------------------------------

const COLOR_PRESETS = [
  '#dc2626', '#ef4444', '#f97316', '#d97706',
  '#eab308', '#facc15', '#16a34a', '#22c55e',
  '#2563eb', '#3b82f6', '#0ea5e9', '#6366f1',
  '#8b5cf6', '#ec4899', '#64748b', '#6b7280',
];

const isHexColor = (v) => /^#[0-9a-fA-F]{6}$/.test((v || '').trim());

// Swatch grid + native color wheel + hex input. The chosen value lives in a
// hidden input named `color`, so collectForm() picks it up like any field.
function colorPickerField({ name = 'color', value = '' } = {}) {
  const current = (value || '').trim();
  const isPreset = COLOR_PRESETS.some((c) => c.toLowerCase() === current.toLowerCase());
  return `<div class="form-field full">
    <label>Color</label>
    <div class="color-picker" data-cp>
      <input type="hidden" name="${name}" value="${escapeHtml(current)}" />
      <div class="cp-swatches">
        ${COLOR_PRESETS.map((c) => `<button type="button" class="cp-swatch${isPreset && c.toLowerCase() === current.toLowerCase() ? ' selected' : ''}" style="--c:${c}" data-color="${c}" title="${c}" aria-label="Color ${c}"></button>`).join('')}
      </div>
      <div class="cp-actions">
        <input type="color" class="cp-native" value="${isHexColor(current) ? current : '#6366f1'}" title="Pick a custom color" />
        <span class="cp-hex" data-cp-hex>${isHexColor(current) ? escapeHtml(current.toUpperCase()) : '—'}</span>
        <span class="cp-preview" style="background:${isHexColor(current) ? current : 'transparent'}"></span>
      </div>
      <div class="help">Pick a swatch or use the color wheel — the hex code is filled in automatically.</div>
    </div>
  </div>`;
}

function bindColorPicker(overlay) {
  const cp = overlay.querySelector('[data-cp]');
  if (!cp) return;
  const hidden = cp.querySelector('input[type="hidden"]');
  const native = cp.querySelector('.cp-native');
  const hex = cp.querySelector('[data-cp-hex]');
  const preview = cp.querySelector('.cp-preview');
  const swatches = [...cp.querySelectorAll('.cp-swatch')];
  const apply = (v) => {
    const val = (v || '').trim();
    hidden.value = val;
    if (isHexColor(val)) {
      hex.textContent = val.toUpperCase();
      native.value = val;
      preview.style.background = val;
      swatches.forEach((s) => s.classList.toggle('selected', s.dataset.color.toLowerCase() === val.toLowerCase()));
    } else {
      hex.textContent = '—';
      preview.style.background = 'transparent';
      swatches.forEach((s) => s.classList.remove('selected'));
    }
  };
  swatches.forEach((s) => s.addEventListener('click', () => apply(s.dataset.color)));
  native.addEventListener('input', () => apply(native.value));
}

export function priorityFormModal({ priority, onSubmit }) {
  const p = priority || {};
  const fields = `
    ${field({ name: 'name', label: 'Name', value: p.name, required: true, help: 'e.g. Critical, High, Medium, Low' })}
    ${field({ name: 'level', label: 'Level', value: p.level ?? '', type: 'number', min: 1, max: 100, required: true, help: 'Lower number = higher priority (1 = Critical)' })}
    ${field({ name: 'description', label: 'Description', value: p.description, type: 'textarea', rows: 2, full: true })}
    ${colorPickerField({ value: p.color })}
  `;
  const modal = entityFormModal({
    title: priority ? `Edit Priority — ${p.name}` : 'New Priority',
    fields,
    wide: true,
    onSubmit: async (values) => {
      await onSubmit({
        name: values.name,
        level: Number(values.level),
        description: values.description || null,
        color: values.color || null,
      });
    },
  });
  bindColorPicker(modal.overlay);
  return modal;
}

// ---------------------------------------------------------------------------
// Risk form
// ---------------------------------------------------------------------------

const LEVEL_LABELS = { 1: '1 — Very Low', 2: '2 — Low', 3: '3 — Medium', 4: '4 — High', 5: '5 — Very High' };
const RISK_LEVEL_COLORS = { 1: '#16a34a', 2: '#65a30d', 3: '#eab308', 4: '#f97316', 5: '#dc2626' };

const RISK_LEVELS = [1, 2, 3, 4, 5].map((n) => [String(n), String(n), RISK_LEVEL_COLORS[n]]);

export function riskFormModal({ risk, project, projects = [], stakeholders = [], onSubmit }) {
  const r = risk || {};
  const lockedProject = risk ? r.project || project : project;
  const projectField = lockedProject
    ? staticField({ label: 'Project', value: `${lockedProject.projectCode || ''}${lockedProject.name ? ` — ${lockedProject.name}` : ''}`.trim() || '—', full: true })
    : field({
        name: 'projectId',
        label: 'Project',
        value: r.projectId || '',
        type: 'select',
        options: [['', 'Select project…'], ...projects.map((p) => [p.id, `${p.projectCode} — ${p.name}`])],
        placeholder: 'Select project…',
        required: true,
        full: true,
      });
  const fields = `
    ${projectField}
    ${field({ name: 'title', label: 'Title', value: r.title, required: true, full: true })}
    ${field({ name: 'description', label: 'Description', value: r.description, type: 'textarea', rows: 2, full: true })}
    <div class="risk-levels">
      ${pillGroup({ name: 'probability', label: 'Probability', value: r.probability !== undefined && r.probability !== null ? String(r.probability) : '', options: RISK_LEVELS, required: true, help: '1 = Very Low · 5 = Very High' })}
      ${pillGroup({ name: 'impact', label: 'Impact', value: r.impact !== undefined && r.impact !== null ? String(r.impact) : '', options: RISK_LEVELS, required: true, help: '1 = Very Low · 5 = Very High' })}
    </div>
    ${pillGroup({ name: 'status', label: 'Status', value: r.status || '', options: RISK_STATUSES.map((s) => [s, s.replace('_', ' '), STATUS_COLORS[s] || '#64748b']), full: true })}
    ${field({ name: 'ownerStakeholderId', label: 'Owner', value: r.ownerStakeholderId || '', type: 'select', options: [[ '', 'None' ], ...stakeholders.map((st) => [st.id, st.name])] })}
    ${field({ name: 'identifiedDate', label: 'Identified Date', value: toDateInput(r.identifiedDate), type: 'date' })}
    ${field({ name: 'mitigationPlan', label: 'Mitigation Plan', value: r.mitigationPlan, type: 'textarea', rows: 2, full: true })}
    ${field({ name: 'contingencyPlan', label: 'Contingency Plan', value: r.contingencyPlan, type: 'textarea', rows: 2, full: true })}
  `;
  return entityFormModal({
    title: risk ? `Edit Risk — ${r.title}` : 'New Risk',
    fields,
    submitText: risk ? 'Update' : 'Create',
    wide: true,
    onSubmit: async (values) => {
      const payload = {
        title: values.title,
        description: values.description || null,
        probability: Number(values.probability),
        impact: Number(values.impact),
        status: values.status,
        ownerStakeholderId: values.ownerStakeholderId ? Number(values.ownerStakeholderId) : null,
        identifiedDate: values.identifiedDate || null,
        mitigationPlan: values.mitigationPlan || null,
        contingencyPlan: values.contingencyPlan || null,
      };
      if (!risk && values.projectId) payload.projectId = Number(values.projectId);
      await onSubmit(payload);
    },
  });
}
