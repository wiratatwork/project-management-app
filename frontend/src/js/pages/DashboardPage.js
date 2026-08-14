import { api } from '../api.js';
import { escapeHtml, formatDate, STATUS_COLORS, RISK_LEVEL_COLORS } from '../utils.js';
import { statusBadge, progressBar, loadingHtml } from '../components/ui.js';
import { renderDonut, renderBars } from '../components/charts.js';
import { renderRiskMatrix } from '../components/RiskMatrix.js';
import { navigate } from '../router.js';

export default {
  async mount(container) {
    container.innerHTML = loadingHtml();

    const [summary, projects, tasks, risks] = await Promise.all([
      api.get('/api/dashboard/summary'),
      api.get('/api/dashboard/projects'),
      api.get('/api/dashboard/tasks'),
      api.get('/api/dashboard/risks'),
    ]);

    const cards = [
      { label: 'Total Projects', value: summary.totalProjects, icon: 'bi-folder', cls: '' },
      { label: 'Active Projects', value: summary.activeProjects, icon: 'bi-rocket', cls: 'primary' },
      { label: 'Completed Projects', value: summary.completedProjects, icon: 'bi-check-circle', cls: 'success' },
      { label: 'Delayed Projects', value: summary.delayedProjects, icon: 'bi-clock', cls: summary.delayedProjects > 0 ? 'danger' : 'success' },
      { label: 'Total Tasks', value: summary.totalTasks, icon: 'bi-puzzle', cls: '' },
      { label: 'Completed Tasks', value: summary.completedTasks, icon: 'bi-check2-circle', cls: 'success' },
      { label: 'Overdue Tasks', value: summary.overdueTasks, icon: 'bi-exclamation-triangle', cls: summary.overdueTasks > 0 ? 'danger' : 'success' },
      { label: 'Open Risks', value: summary.openRisks, icon: 'bi-shield', cls: summary.openRisks > 0 ? 'warning' : 'success' },
    ];

    const cardHtml = cards
      .map(
        (c) => `<div class="card stat-card ${c.cls}">
          <span class="stat-icon"><i class="bi ${c.icon}"></i></span>
          <div class="stat-label">${c.label}</div>
          <div class="stat-value">${c.value}</div>
        </div>`
      )
      .join('');

    // Project progress table
    const projectRows = projects
      .map((p) => `<tr class="${p.delayed ? 'overdue-row' : ''}" data-id="${p.id}">
        <td><strong>${escapeHtml(p.projectCode)}</strong></td>
        <td>${escapeHtml(p.name)}</td>
        <td>${progressBar(p.progressPercentage, { showLabel: true })}</td>
        <td>${statusBadge(p.status)}</td>
        <td>${formatDate(p.plannedEndDate)}</td>
        <td>${formatDate(p.actualEndDate)}</td>
        <td>${p.delayed ? '<span class="badge" style="background:#dc26261a;color:#dc2626">Delayed</span>' : '—'}</td>
      </tr>`)
      .join('');

    // Charts
    const statusColors = { TODO: '#94a3b8', IN_PROGRESS: '#2563eb', BLOCKED: '#dc2626', COMPLETED: '#16a34a', CANCELLED: '#64748b' };
    const byStatus = tasks.byStatus.map((s) => ({ label: s.status, value: s.count, color: statusColors[s.status] || '#94a3b8' }));
    const byPriority = tasks.byPriority.map((p) => ({ label: p.name, value: p.count, color: p.color || '#4f46e5' }));
    const byProject = tasks.byProject.map((p) => ({ label: p.name, value: p.count, color: '#4f46e5' }));
    const riskByStatus = risks.byStatus.map((s) => ({ label: s.status, value: s.count, color: STATUS_COLORS[s.status] || '#64748b' }));

    container.innerHTML = `
      <div class="page-title">Dashboard</div>
      <div class="page-subtitle">Overview of projects, tasks and risks</div>

      ${summary.delayedProjects > 0 || summary.overdueTasks > 0
        ? `<div class="delayed-banner"><i class="bi bi-exclamation-triangle"></i> <strong>Attention:</strong> ${summary.delayedProjects} delayed project(s) and ${summary.overdueTasks} overdue task(s) need review.</div>`
        : ''}

      <div class="stat-grid">${cardHtml}</div>

      <div class="card" style="margin-bottom:24px">
        <div class="card-header"><h2>Project Progress</h2></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>Code</th><th>Project</th><th>Progress</th><th>Status</th>
              <th>Planned End</th><th>Actual End</th><th>Delay</th>
            </tr></thead>
            <tbody>${projectRows || '<tr class="empty-row"><td colspan="7">No projects yet</td></tr>'}</tbody>
          </table>
        </div>
      </div>

      <div class="grid-2">
        <div class="card"><div class="card-header"><h2>Tasks by Status</h2></div>
          <div class="card-body"><div id="chartTasksStatus"></div></div></div>
        <div class="card"><div class="card-header"><h2>Tasks by Priority</h2></div>
          <div class="card-body"><div id="chartTasksPriority"></div></div></div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-header"><h2>Tasks by Project</h2></div>
          <div class="card-body"><div id="chartTasksProject"></div></div></div>
        <div class="card"><div class="card-header"><h2>Risk Distribution</h2></div>
          <div class="card-body"><div id="chartRiskStatus"></div></div></div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-header"><h2>Open Risk Matrix</h2></div>
          <div class="card-body"><div id="riskMatrix"></div></div></div>
        <div class="card"><div class="card-header"><h2>Risk Levels</h2></div>
          <div class="card-body"><div id="chartRiskLevels"></div></div></div>
      </div>
    `;

    renderDonut(container.querySelector('#chartTasksStatus'), byStatus);
    renderBars(container.querySelector('#chartTasksPriority'), byPriority);
    renderBars(container.querySelector('#chartTasksProject'), byProject);
    renderDonut(container.querySelector('#chartRiskStatus'), riskByStatus);
    renderRiskMatrix(container.querySelector('#riskMatrix'), risks.matrix);
    renderBars(
      container.querySelector('#chartRiskLevels'),
      risks.byLevel.map((l) => ({ label: l.level, value: l.count, color: RISK_LEVEL_COLORS[l.level] || '#94a3b8' }))
    );

    // Navigate to a project when a row is clicked
    container.querySelectorAll('tbody tr[data-id]').forEach((tr) => {
      tr.addEventListener('click', () => navigate(`projects/${tr.dataset.id}`));
    });
  },
};
