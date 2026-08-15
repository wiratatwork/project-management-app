import { api } from '../api.js';
import { escapeHtml, formatDate, RISK_STATUSES, RISK_LEVEL_COLORS } from '../utils.js';
import { statusBadge, riskLevelBadge, confirmDialog, toast } from '../components/ui.js';
import { renderDataTable } from '../components/table.js';
import { riskFormModal } from '../components/forms.js';
import { renderRiskMatrix } from '../components/RiskMatrix.js';
import { selectHTML, mountSelects } from '../components/select.js';
import { renderBars } from '../components/charts.js';

export default {
  async mount(container) {
    const [projects, stakeholders, dashboardRisks] = await Promise.all([
      api.get('/api/projects'),
      api.get('/api/stakeholders'),
      api.get('/api/dashboard/risks'),
    ]);

    container.innerHTML = `
      <div class="page-title">Risks</div>
      <div class="page-subtitle">Risk score = probability × impact</div>
      <div class="stat-grid">
        <div class="card stat-card ${dashboardRisks.open > 0 ? 'danger' : 'success'}"><div class="stat-label">Open Risks</div><div class="stat-value">${dashboardRisks.open}</div></div>
        <div class="card stat-card ${dashboardRisks.critical > 0 ? 'danger' : ''}"><div class="stat-label">Critical</div><div class="stat-value">${dashboardRisks.critical}</div></div>
        <div class="card stat-card ${dashboardRisks.high > 0 ? 'warning' : ''}"><div class="stat-label">High</div><div class="stat-value">${dashboardRisks.high}</div></div>
        <div class="card stat-card primary"><div class="stat-label">Mitigated</div><div class="stat-value">${dashboardRisks.mitigated}</div></div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-header"><h2>Risk Matrix (open risks)</h2></div>
          <div class="card-body"><div id="riskMatrix"></div></div></div>
        <div class="card"><div class="card-header"><h2>Risk Distribution by Level</h2></div>
          <div class="card-body"><div id="riskDistribution"></div></div></div>
      </div>
      <div class="toolbar">
        <button class="btn btn-primary" id="newRiskBtn">+ New Risk</button>
        <span class="spacer"></span>
        <div class="filters">
          ${selectHTML({ name: 'filterProject', options: [['', 'All projects'], ...projects.map((p) => [p.id, `${p.projectCode} — ${p.name}`])], value: '', placeholder: 'All projects', attrs: 'id="filterProject"' })}
          ${selectHTML({ name: 'filterStatus', options: [['', 'All statuses'], ...RISK_STATUSES.map((s) => [s, s])], value: '', placeholder: 'All statuses', attrs: 'id="filterStatus"' })}
        </div>
      </div>
      <div class="card"><div id="risksTable"></div></div>
    `;

    mountSelects(container);
    renderRiskMatrix(container.querySelector('#riskMatrix'), dashboardRisks.matrix);
    renderBars(
      container.querySelector('#riskDistribution'),
      dashboardRisks.byLevel.map((l) => ({ label: l.level, value: l.count, color: RISK_LEVEL_COLORS[l.level] || '#94a3b8' }))
    );

    const state = { projectId: '', status: '' };

    const table = renderDataTable(container.querySelector('#risksTable'), {
      columns: [
        { key: 'title', label: 'Risk', render: (r) => `<strong>${escapeHtml(r.title)}</strong>` },
        { key: 'project', label: 'Project', sortable: false, render: (r) => escapeHtml(r.project?.projectCode || '') },
        { key: 'probability', label: 'P', render: (r) => r.probability },
        { key: 'impact', label: 'I', render: (r) => r.impact },
        { key: 'riskScore', label: 'Score', render: (r) => `<strong>${r.riskScore}</strong>` },
        { key: 'riskLevel', label: 'Level', render: (r) => riskLevelBadge(r.riskLevel) },
        { key: 'status', label: 'Status', render: (r) => statusBadge(r.status) },
        { key: 'owner', label: 'Owner', sortable: false, render: (r) => escapeHtml(r.owner?.name || '—') },
        { key: 'identifiedDate', label: 'Identified', render: (r) => formatDate(r.identifiedDate) },
      ],
      fetch: (qs) => api.get(`/api/risks?${qs}`),
      extraParams: { projectId: state.projectId, status: state.status },
      onRowClick: (row) => openDetail(row),
      actions: [
        { label: 'Edit', className: 'btn-secondary', onClick: (row) => openEdit(row) },
        { label: 'Delete', className: 'btn-danger', onClick: (row) => remove(row) },
      ],
      emptyText: 'No risks match the filters.',
      selectable: true,
      onBulkDelete: (ids) => removeMany(ids),
      confirmBulkDelete: (n) => `Delete ${n} selected risk(s)?`,
    });

    const openDetail = async (risk) => {
      const { openModal } = await import('../components/ui.js');
      const detail = await api.get(`/api/risks/${risk.id}`);
      openModal({
        title: detail.title,
        wide: true,
        body: `
          <dl class="kv">
            <dt>Project</dt><dd>${escapeHtml(detail.project?.name || '')}</dd>
            <dt>Description</dt><dd>${escapeHtml(detail.description || '—')}</dd>
            <dt>Probability / Impact</dt><dd>${detail.probability} × ${detail.impact} = <strong>${detail.riskScore}</strong> (${detail.riskLevel})</dd>
            <dt>Status</dt><dd>${statusBadge(detail.status)}</dd>
            <dt>Owner</dt><dd>${escapeHtml(detail.owner?.name || '—')}</dd>
            <dt>Identified</dt><dd>${formatDate(detail.identifiedDate)}</dd>
            ${detail.resolvedDate ? `<dt>Resolved</dt><dd>${formatDate(detail.resolvedDate)}</dd>` : ''}
            <dt>Mitigation Plan</dt><dd>${escapeHtml(detail.mitigationPlan || '—')}</dd>
            <dt>Contingency Plan</dt><dd>${escapeHtml(detail.contingencyPlan || '—')}</dd>
          </dl>`,
      });
    };

    const openCreate = () => {
      riskFormModal({
        projects,
        stakeholders,
        onSubmit: async (payload) => {
          if (!payload.projectId) {
            toast('Please select a project', 'error');
            return;
          }
          await api.post(`/api/projects/${payload.projectId}/risks`, payload);
          toast('Risk created');
          await table.refresh();
        },
      });
    };

    const openEdit = (risk) => {
      riskFormModal({
        risk,
        stakeholders,
        onSubmit: async (payload) => {
          await api.put(`/api/risks/${risk.id}`, payload);
          toast('Risk updated');
          await table.refresh();
        },
      });
    };

    const remove = async (risk) => {
      const ok = await confirmDialog(`Delete risk "${risk.title}"?`, { title: 'Delete risk' });
      if (!ok) return;
      try {
        await api.del(`/api/risks/${risk.id}`);
        toast('Risk deleted');
        await table.refresh();
      } catch (err) {
        toast(err.message, 'error');
      }
    };

    const removeMany = async (ids) => {
      const results = await Promise.allSettled(ids.map((id) => api.del(`/api/risks/${id}`)));
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length) {
        toast(`Deleted ${ids.length - failed.length} of ${ids.length} — ${failed[0].reason?.message || 'some items could not be deleted'}`, 'error');
      } else {
        toast(`${ids.length} risk(s) deleted`);
      }
    };

    container.querySelector('#newRiskBtn').addEventListener('click', openCreate);
    container.querySelector('#filterProject').addEventListener('change', (e) => {
      state.projectId = e.target.value;
      table.setExtraParams({ projectId: state.projectId, status: state.status });
    });
    container.querySelector('#filterStatus').addEventListener('change', (e) => {
      state.status = e.target.value;
      table.setExtraParams({ projectId: state.projectId, status: state.status });
    });
  },
};
