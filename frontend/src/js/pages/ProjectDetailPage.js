import { api } from '../api.js';
import {
  escapeHtml,
  formatDate,
  TASK_STATUSES,
  STATUS_COLORS,
} from '../utils.js';
import {
  statusBadge,
  priorityChip,
  progressBar,
  confirmDialog,
  toast,
  loadingHtml,
  riskLevelBadge,
} from '../components/ui.js';
import { renderDataTable } from '../components/table.js';
import { taskFormModal, riskFormModal, projectFormModal } from '../components/forms.js';
import { setCrumbCurrent } from '../components/breadcrumbs.js';
import { renderGantt, snapToBusinessDay } from '../components/GanttChart.js';
import { renderRiskMatrix } from '../components/RiskMatrix.js';
import { renderDonut } from '../components/charts.js';

export default {
  async mount(container, params) {
    const projectId = Number(params.id);
    const [project, stakeholders, priorities] = await Promise.all([
      api.get(`/api/projects/${projectId}`),
      api.get('/api/stakeholders'),
      api.get('/api/priorities'),
    ]);
    setCrumbCurrent(project.name);

    // Remember the last-selected sub-tab per project (survives refresh).
    const TAB_KEY = `pm_project_tab_${projectId}`;
    const VALID_TABS = ['overview', 'tasks', 'gantt', 'stakeholders', 'risks'];
    const storedTab = localStorage.getItem(TAB_KEY);
    let currentTab = VALID_TABS.includes(storedTab) ? storedTab : 'overview';

    const renderHeader = () => {
      container.innerHTML = `
        <div class="detail-header">
          <div class="info-main">
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              <h1>${escapeHtml(project.name)}</h1>
              ${statusBadge(project.status)}
              ${project.delayed ? '<span class="badge" style="background:#dc26261a;color:#dc2626">Delayed</span>' : ''}
            </div>
            <div class="detail-meta">
              <span><strong>${escapeHtml(project.projectCode)}</strong></span>
              <span>Planned: ${formatDate(project.plannedStartDate)} → ${formatDate(project.plannedEndDate)}</span>
              <span>Planned duration: ${project.plannedDurationDays ?? '—'} days</span>
              ${project.actualStartDate ? `<span>Actual: ${formatDate(project.actualStartDate)} → ${formatDate(project.actualEndDate)}</span>` : ''}
              ${project.actualDurationDays != null ? `<span>Actual duration: ${project.actualDurationDays} days</span>` : ''}
            </div>
          </div>
          <div class="detail-stats">
            <div class="card stat-card"><div class="stat-label">Progress</div><div class="stat-value" style="font-size:20px">${project.progressPercentage}%</div></div>
            <div class="card stat-card"><div class="stat-label">Tasks</div><div class="stat-value" style="font-size:20px">${project.taskCount}</div></div>
            <div class="card stat-card"><div class="stat-label">Risks</div><div class="stat-value" style="font-size:20px">${project.riskCount}</div></div>
          </div>
        </div>
        <div class="tabs">
          <button class="tab" data-tab="overview">Overview</button>
          <button class="tab" data-tab="tasks">Tasks (${project.taskCount})</button>
          <button class="tab" data-tab="gantt">Gantt Chart</button>
          <button class="tab" data-tab="stakeholders">Stakeholders (${project.stakeholders.length})</button>
          <button class="tab" data-tab="risks">Risks (${project.riskCount})</button>
        </div>
        <div id="tabContent"></div>
      `;

      container.querySelectorAll('.tab').forEach((tab) => {
        tab.addEventListener('click', () => {
          currentTab = tab.dataset.tab;
          localStorage.setItem(TAB_KEY, currentTab);
          renderTab();
        });
      });
      tabButtons(); // highlight
      renderTab();
    };

    const tabButtons = () => {
      container.querySelectorAll('.tab').forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.tab === currentTab);
      });
    };

    const renderTab = () => {
      tabButtons();
      const content = container.querySelector('#tabContent');
      const renderers = {
        overview: renderOverview,
        tasks: renderTasks,
        gantt: renderGanttTab,
        stakeholders: renderStakeholdersTab,
        risks: renderRisksTab,
      };
      (renderers[currentTab] || renderOverview)(content);
    };

    // ------------------------------------------------------------------
    // Overview
    // ------------------------------------------------------------------
    const renderOverview = async (content) => {
      content.innerHTML = loadingHtml();

      // Live-fetch project to include tasks/risks details
      const detail = await api.get(`/api/projects/${project.id}`);
      Object.assign(project, detail);

      const statusCounts = {};
      detail.tasks.forEach((t) => {
        statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      });

      const stkChips = (detail.stakeholders || [])
        .map((s) => `<span class="chip"><i class="bi bi-person"></i> ${escapeHtml(s.name)}${s.position ? ` — ${escapeHtml(s.position)}` : ''}</span>`)
        .join('');

      content.innerHTML = `
        <div class="grid-2">
          <div class="card">
            <div class="card-header"><h2>Project Information</h2></div>
            <div class="card-body">
              <dl class="kv">
                <dt>Description</dt><dd>${escapeHtml(detail.description || '—')}</dd>
                <dt>Status</dt><dd>${statusBadge(detail.status)}</dd>
                <dt>Progress</dt><dd>${progressBar(detail.progressPercentage)}</dd>
                <dt>Planned duration</dt><dd>${detail.plannedDurationDays ?? '—'} days</dd>
                <dt>Actual duration</dt><dd>${detail.actualDurationDays != null ? `${detail.actualDurationDays} days` : '—'}</dd>
                <dt>Created</dt><dd>${formatDate(detail.createdAt)}</dd>
              </dl>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h2>Stakeholders</h2></div>
            <div class="card-body">
              <div class="chip-row">${stkChips || '<span class="text-muted">No stakeholders assigned</span>'}</div>
              <div style="margin-top:16px">
                <button class="btn btn-secondary btn-sm" id="editProjectBtn">Edit Project</button>
              </div>
            </div>
          </div>
        </div>
        <div class="grid-2">
          <div class="card">
            <div class="card-header"><h2>Task Summary</h2></div>
            <div class="card-body">
              <div class="stat-grid" style="margin-bottom:0">
                ${TASK_STATUSES.map((s) => {
                  const c = STATUS_COLORS[s] || '#94a3b8';
                  return `<div class="card stat-card"><div class="stat-label" style="color:${c}">${s.replace('_', ' ')}</div><div class="stat-value" style="font-size:20px">${statusCounts[s] || 0}</div></div>`;
                }).join('')}
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h2>Open Risks</h2></div>
            <div class="card-body">
              ${detail.risks.filter((r) => r.status === 'OPEN').length
                ? detail.risks
                    .filter((r) => r.status === 'OPEN')
                    .slice(0, 5)
                    .map(
                      (r) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
                        <span>${escapeHtml(r.title)}</span>
                        <span class="badge" style="background:${r.riskLevel === 'CRITICAL' ? '#dc2626' : r.riskLevel === 'HIGH' ? '#f97316' : '#64748b'}1a;color:${r.riskLevel === 'CRITICAL' ? '#dc2626' : r.riskLevel === 'HIGH' ? '#ea580c' : '#64748b'}">${r.riskLevel}</span>
                      </div>`
                    )
                    .join('')
                : '<div class="empty-state"><i class="bi bi-emoji-smile" style="font-size:28px"></i><br/>No open risks</div>'}
            </div>
          </div>
        </div>`;

      content.querySelector('#editProjectBtn')?.addEventListener('click', () => {
        projectFormModal({
          project,
          stakeholders,
          onSubmit: async (payload) => {
            await api.put(`/api/projects/${project.id}`, payload);
            toast('Project updated');
            renderHeader();
          },
        });
      });
    };

    // ------------------------------------------------------------------
    // Tasks tab
    // ------------------------------------------------------------------
    const renderTasks = async (content) => {
      content.innerHTML = loadingHtml();
      const tasks = await api.get(`/api/projects/${project.id}/tasks`);
      const liveProject = { ...project, tasks };

      content.innerHTML = `
        <div class="toolbar">
          <button class="btn btn-primary" id="newTaskBtn">+ New Task</button>
          <span class="spacer"></span>
          <span class="text-muted" style="font-size:13px" id="taskCountLabel">${tasks.length} task(s)</span>
        </div>
        <div class="card"><div id="tasksTable"></div></div>
      `;

      renderDataTable(content.querySelector('#tasksTable'), {
        columns: [
          { key: 'taskCode', label: 'Code', render: (r) => `<strong>${escapeHtml(r.taskCode)}</strong>` },
          { key: 'name', label: 'Task' },
          { key: 'priority', label: 'Priority', sortable: false, render: (r) => priorityChip(r.priority) },
          { key: 'status', label: 'Status', render: (r) => statusBadge(r.status) },
          { key: 'progressPercentage', label: 'Progress', render: (r) => progressBar(r.progressPercentage) },
          { key: 'plannedStartDate', label: 'Planned', render: (r) => `${formatDate(r.plannedStartDate)}<br/><span style="color:var(--text-muted)">→ ${formatDate(r.plannedEndDate)}</span>` },
          { key: 'dueDate', label: 'Due', render: (r) => formatDate(r.dueDate) },
          {
            key: 'overdue',
            label: 'Overdue',
            sortable: false,
            render: (r) => (r.overdue ? '<span class="badge" style="background:#dc26261a;color:#dc2626">Overdue</span>' : '—'),
          },
          {
            key: 'dependencies',
            label: 'Dependencies',
            sortable: false,
            render: (r) =>
              r.dependencies.length
                ? `<span title="${escapeHtml(r.dependencies.map((d) => d.name).join(', '))}">${escapeHtml(r.dependencies.map((d) => d.taskCode).join(', '))}</span>`
                : '—',
          },
        ],
        fetch: (qs) => api.get(`/api/projects/${project.id}/tasks?${qs}`),
        onRowClick: (row) => openTaskDetail(row.id),
        actions: [
          { label: 'Edit', className: 'btn-secondary', onClick: (row) => openEditTask(row) },
          { label: 'Delete', className: 'btn-danger', onClick: (row) => removeTask(row) },
        ],
        emptyText: 'No tasks yet.',
        onCount: (total) => {
          content.querySelector('#taskCountLabel').textContent = `${total} task(s)`;
        },
      });

      const openTaskDetail = async (taskId) => {
        const { openModal } = await import('../components/ui.js');
        const task = await api.get(`/api/tasks/${taskId}`);
        openModal({
          title: `${task.taskCode} — ${task.name}`,
          wide: true,
          body: `
            <dl class="kv">
              <dt>Description</dt><dd>${escapeHtml(task.description || '—')}</dd>
              <dt>Priority</dt><dd>${priorityChip(task.priority)}</dd>
              <dt>Status</dt><dd>${statusBadge(task.status)} ${task.overdue ? '<span class="badge" style="background:#dc26261a;color:#dc2626">Overdue</span>' : ''}</dd>
              <dt>Progress</dt><dd>${progressBar(task.progressPercentage)}</dd>
              <dt>Planned</dt><dd>${formatDate(task.plannedStartDate)} → ${formatDate(task.plannedEndDate)}</dd>
              <dt>Actual</dt><dd>${task.actualStartDate ? `${formatDate(task.actualStartDate)} → ${formatDate(task.actualEndDate)}` : '—'}</dd>
              <dt>Due date</dt><dd>${formatDate(task.dueDate)}</dd>
              <dt>Dependencies</dt><dd>${task.dependencies.length ? task.dependencies.map((d) => escapeHtml(d.name)).join(', ') : '—'}</dd>
              <dt>Stakeholders</dt><dd>${task.stakeholders.length ? task.stakeholders.map((s) => `${escapeHtml(s.name)} <span class="text-muted">(${s.role})</span>`).join(', ') : '—'}</dd>
            </dl>`,
        });
      };

      const openCreateTask = () => {
        taskFormModal({
          project: liveProject,
          priorities,
          stakeholders,
          onSubmit: async (payload) => {
            await api.post(`/api/projects/${project.id}/tasks`, payload);
            toast('Task created');
            reloadProject();
          },
        });
      };

      const openEditTask = (task) => {
        taskFormModal({
          task,
          project: liveProject,
          priorities,
          stakeholders,
          onSubmit: async (payload) => {
            await api.put(`/api/tasks/${task.id}`, payload);
            toast('Task updated');
            reloadProject();
          },
        });
      };

      const removeTask = async (task) => {
        const ok = await confirmDialog(`Delete task "${task.name}"?`, { title: 'Delete task' });
        if (!ok) return;
        try {
          await api.del(`/api/tasks/${task.id}`);
          toast('Task deleted');
          reloadProject();
        } catch (err) {
          toast(err.message, 'error');
        }
      };

      content.querySelector('#newTaskBtn').addEventListener('click', openCreateTask);
    };

    // ------------------------------------------------------------------
    // Gantt tab — full task CRUD directly on the timeline
    // ------------------------------------------------------------------
    const renderGanttTab = async (content) => {
      content.innerHTML = loadingHtml();

      const loadGantt = async () => {
        const data = await api.get(`/api/projects/${project.id}/gantt`);
        const liveProject = { ...project, tasks: data.tasks };
        renderGantt(content, data, {
          onNewTask: () => openCreateTask(liveProject),
          onTaskClick: (task) => openEditTask(task, liveProject),
          onReschedule: (task, deltaDays) => reschedule(task, deltaDays),
          onReorder: async (projectId, taskIds) => {
            try {
              await api.put(`/api/projects/${projectId}/tasks/reorder`, { taskIds });
              toast('Task order updated');
              reloadProject();
            } catch (err) {
              toast(err.message, 'error');
              reloadProject();
            }
          },
        });
      };

      const openCreateTask = (liveProject) => {
        taskFormModal({
          project: liveProject,
          priorities,
          stakeholders,
          onSubmit: async (payload) => {
            await api.post(`/api/projects/${project.id}/tasks`, payload);
            toast('Task created');
            reloadProject(); // re-renders header + refetches the gantt tab
          },
        });
      };

      const openEditTask = (task, liveProject) => {
        taskFormModal({
          task,
          project: liveProject,
          priorities,
          stakeholders,
          onSubmit: async (payload) => {
            await api.put(`/api/tasks/${task.id}`, payload);
            toast('Task updated');
            reloadProject();
          },
          onDelete: async () => {
            await api.del(`/api/tasks/${task.id}`);
            toast('Task deleted');
            reloadProject();
          },
        });
      };

      const reschedule = async (task, deltaDays) => {
        const shift = (iso, n) => {
          const d = new Date(iso);
          d.setUTCHours(0, 0, 0, 0);
          d.setUTCDate(d.getUTCDate() + n);
          return d.toISOString().slice(0, 10);
        };
        try {
          await api.put(`/api/tasks/${task.id}`, {
            plannedStartDate: shift(task.plannedStartDate, deltaDays),
            // End and due dates can land on a weekend even when the start is
            // fine — snap them to business days so the API accepts the move.
            plannedEndDate: snapToBusinessDay(shift(task.plannedEndDate, deltaDays)),
            dueDate: snapToBusinessDay(shift(task.dueDate, deltaDays)),
          });
          toast(`${task.taskCode} rescheduled by ${deltaDays} day(s)`);
          reloadProject();
        } catch (err) {
          toast(err.message, 'error');
          reloadProject();
        }
      };

      await loadGantt();
    };

    // ------------------------------------------------------------------
    // Stakeholders tab
    // ------------------------------------------------------------------
    const renderStakeholdersTab = async (content) => {
      content.innerHTML = loadingHtml();
      const detail = await api.get(`/api/projects/${project.id}`);
      const assigned = new Set((detail.stakeholders || []).map((s) => s.stakeholderId));
      // Authoritative selection — lives outside the DOM so a search filter can
      // hide rows without losing (or accidentally saving) their state.
      const selected = new Set(assigned);

      const AVATAR_COLORS = ['#4f46e5', '#0ea5e9', '#16a34a', '#d97706', '#dc2626', '#7c3aed'];
      const initialsOf = (name) =>
        (name || '?')
          .split(/\s+/)
          .map((w) => w[0])
          .filter(Boolean)
          .slice(0, 2)
          .join('')
          .toUpperCase();

      const stkRow = (s, i) => {
        const checked = selected.has(s.id) ? 'checked' : '';
        const meta = [s.position, s.department].filter(Boolean).join(' · ');
        const c = AVATAR_COLORS[i % AVATAR_COLORS.length];
        return `<label class="stk-row" data-id="${s.id}">
          <input type="checkbox" value="${s.id}" ${checked} />
          <span class="stk-avatar" style="background:${c}1f;color:${c}" aria-hidden="true">${escapeHtml(initialsOf(s.name))}</span>
          <span class="stk-info">
            <span class="stk-name">${escapeHtml(s.name)}</span>
            <span class="stk-meta">${escapeHtml(meta || 'Stakeholder')}</span>
          </span>
          <span class="stk-email">${escapeHtml(s.email)}</span>
          <span class="stk-check" aria-hidden="true"><i class="bi bi-check-lg"></i></span>
        </label>`;
      };

      const renderList = (q = '') => {
        const term = q.trim().toLowerCase();
        const matches = term
          ? stakeholders.filter((s) =>
              [s.name, s.position, s.department, s.organization, s.email]
                .filter(Boolean)
                .some((f) => String(f).toLowerCase().includes(term))
            )
          : stakeholders;
        const list = content.querySelector('#stkList');
        list.innerHTML = matches.length
          ? matches.map((s, i) => stkRow(s, i)).join('')
          : `<div class="empty-state" role="status"><div class="empty-icon"><i class="bi bi-people"></i></div>${
              stakeholders.length
                ? `No stakeholders match &quot;${escapeHtml(q.trim())}&quot;.`
                : 'No stakeholders defined yet.'
            }<br/><button type="button" class="btn btn-secondary btn-sm" id="stkEmptyAction">${
              stakeholders.length ? 'Clear search' : 'Create stakeholders'
            }</button></div>`;
        content.querySelector('#stkResults').textContent = matches.length
          ? `${matches.length} of ${stakeholders.length} shown`
          : '';
        content.querySelector('#stkEmptyAction')?.addEventListener('click', () => {
          if (stakeholders.length) {
            content.querySelector('#stkSearch').value = '';
            renderList();
          } else {
            location.hash = '#/stakeholders';
          }
        });
      };

      content.innerHTML = `
        <div class="card">
          <div class="card-header stk-header">
            <h2>Assign Stakeholders to Project</h2>
            <span class="stk-count" id="stkCount">${assigned.size} of ${stakeholders.length} assigned</span>
            <span class="spacer"></span>
            <button class="btn btn-primary btn-sm" id="saveStakeholders"><i class="bi bi-check-lg"></i> Save</button>
          </div>
          <div class="card-body">
            <div class="stk-toolbar">
              <div class="stk-search">
                <i class="bi bi-search"></i>
                <input type="search" id="stkSearch" placeholder="Search by name, role, department…" aria-label="Search stakeholders" />
              </div>
              <span class="stk-results" id="stkResults" aria-live="polite"></span>
            </div>
            <div class="stk-list" id="stkList"></div>
          </div>
        </div>`;

      renderList();

      content.querySelector('#stkSearch').addEventListener('input', (e) => renderList(e.target.value));

      const countEl = content.querySelector('#stkCount');
      // Delegated: rows are re-created on every search, so bind once on the list.
      content.querySelector('#stkList').addEventListener('change', (e) => {
        if (e.target.matches('input[type="checkbox"]')) {
          const id = Number(e.target.value);
          if (e.target.checked) selected.add(id);
          else selected.delete(id);
          countEl.textContent = `${selected.size} of ${stakeholders.length} assigned`;
        }
      });

      const saveBtn = content.querySelector('#saveStakeholders');
      saveBtn.addEventListener('click', async () => {
        const ids = [...selected];
        saveBtn.disabled = true;
        saveBtn.classList.add('loading');
        saveBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Saving…';
        try {
          await api.put(`/api/projects/${project.id}`, { stakeholderIds: ids });
          toast('Stakeholders updated');
          project.stakeholders = ids.map((id) => ({
            stakeholderId: id,
            name: stakeholders.find((s) => s.id === id)?.name || '',
          }));
          renderHeader();
        } catch (err) {
          toast(err.message, 'error');
          saveBtn.disabled = false;
          saveBtn.classList.remove('loading');
          saveBtn.innerHTML = '<i class="bi bi-check-lg"></i> Save';
        }
      });
    };

    // ------------------------------------------------------------------
    // Risks tab
    // ------------------------------------------------------------------
    const renderRisksTab = async (content) => {
      content.innerHTML = loadingHtml();
      const risks = await api.get(`/api/projects/${project.id}/risks`);

      content.innerHTML = `
        <div class="toolbar">
          <button class="btn btn-primary" id="newRiskBtn">+ New Risk</button>
          <span class="spacer"></span>
          <span class="text-muted" style="font-size:13px" id="riskCountLabel">${risks.length} risk(s)</span>
        </div>
        <div class="grid-2" style="margin-bottom:16px">
          <div class="card"><div class="card-header"><h2>Risk Matrix (open risks)</h2></div>
            <div class="card-body"><div id="riskMatrix"></div></div></div>
          <div class="card"><div class="card-header"><h2>Risk Details</h2></div>
            <div class="card-body"><div id="riskTable"></div></div></div>
        </div>
      `;

      renderRiskMatrix(content.querySelector('#riskMatrix'), risks.filter((r) => r.status === 'OPEN').map((r) => ({ probability: r.probability, impact: r.impact, count: 1 })));

      renderDataTable(content.querySelector('#riskTable'), {
        columns: [
          { key: 'title', label: 'Risk' },
          { key: 'riskScore', label: 'Score', render: (r) => `<strong>${r.riskScore}</strong>` },
          { key: 'riskLevel', label: 'Level', render: (r) => riskLevelBadge(r.riskLevel) },
          { key: 'status', label: 'Status', render: (r) => statusBadge(r.status) },
          { key: 'owner', label: 'Owner', sortable: false, render: (r) => escapeHtml(r.owner?.name || '—') },
        ],
        fetch: (qs) => api.get(`/api/projects/${project.id}/risks?${qs}`),
        onRowClick: (row) => openRiskDetail(row),
        actions: [
          { label: 'Edit', className: 'btn-secondary', onClick: (row) => openEditRisk(row) },
          { label: 'Delete', className: 'btn-danger', onClick: (row) => removeRisk(row) },
        ],
        emptyText: 'No risks registered.',
        onCount: (total) => {
          content.querySelector('#riskCountLabel').textContent = `${total} risk(s)`;
        },
      });

      const openRiskDetail = async (risk) => {
        const { openModal } = await import('../components/ui.js');
        openModal({
          title: risk.title,
          wide: true,
          body: `
            <dl class="kv">
              <dt>Description</dt><dd>${escapeHtml(risk.description || '—')}</dd>
              <dt>Probability / Impact</dt><dd>${risk.probability} × ${risk.impact} = <strong>${risk.riskScore}</strong> (${risk.riskLevel})</dd>
              <dt>Status</dt><dd>${statusBadge(risk.status)}</dd>
              <dt>Owner</dt><dd>${escapeHtml(risk.owner?.name || '—')}</dd>
              <dt>Identified</dt><dd>${formatDate(risk.identifiedDate)}</dd>
              ${risk.resolvedDate ? `<dt>Resolved</dt><dd>${formatDate(risk.resolvedDate)}</dd>` : ''}
              <dt>Mitigation</dt><dd>${escapeHtml(risk.mitigationPlan || '—')}</dd>
              <dt>Contingency</dt><dd>${escapeHtml(risk.contingencyPlan || '—')}</dd>
            </dl>`,
        });
      };

      const openCreateRisk = () => {
        riskFormModal({
          stakeholders,
          onSubmit: async (payload) => {
            await api.post(`/api/projects/${project.id}/risks`, payload);
            toast('Risk created');
            renderRisksTab(content);
            reloadProject();
          },
        });
      };

      const openEditRisk = (risk) => {
        riskFormModal({
          risk,
          stakeholders,
          onSubmit: async (payload) => {
            await api.put(`/api/risks/${risk.id}`, payload);
            toast('Risk updated');
            renderRisksTab(content);
            reloadProject();
          },
        });
      };

      const removeRisk = async (risk) => {
        const ok = await confirmDialog(`Delete risk "${risk.title}"?`, { title: 'Delete risk' });
        if (!ok) return;
        try {
          await api.del(`/api/risks/${risk.id}`);
          toast('Risk deleted');
          renderRisksTab(content);
          reloadProject();
        } catch (err) {
          toast(err.message, 'error');
        }
      };

      content.querySelector('#newRiskBtn').addEventListener('click', openCreateRisk);
    };

    const reloadProject = async () => {
      const fresh = await api.get(`/api/projects/${project.id}`);
      Object.assign(project, fresh);
      renderHeader();
    };

    renderHeader();
  },
};
