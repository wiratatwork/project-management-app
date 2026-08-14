import { api } from '../api.js';
import { escapeHtml, formatDate } from '../utils.js';
import { statusBadge, progressBar, confirmDialog, toast } from '../components/ui.js';
import { renderDataTable } from '../components/table.js';
import { projectFormModal } from '../components/forms.js';
import { navigate } from '../router.js';

export default {
  async mount(container) {
    const [stakeholders] = await Promise.all([api.get('/api/stakeholders')]);

    container.innerHTML = `
      <div class="page-title">Projects</div>
      <div class="page-subtitle" id="projectsCount">Loading…</div>
      <div class="toolbar">
        <button class="btn btn-primary" id="newProjectBtn">+ New Project</button>
      </div>
      <div class="card"><div id="projectsTable"></div></div>
    `;

    const table = renderDataTable(container.querySelector('#projectsTable'), {
      columns: [
        { key: 'projectCode', label: 'Code', render: (r) => `<strong>${escapeHtml(r.projectCode)}</strong>` },
        { key: 'name', label: 'Name' },
        { key: 'status', label: 'Status', render: (r) => statusBadge(r.status) },
        { key: 'progressPercentage', label: 'Progress', render: (r) => progressBar(r.progressPercentage) },
        { key: 'plannedStartDate', label: 'Planned Start', render: (r) => formatDate(r.plannedStartDate) },
        { key: 'plannedEndDate', label: 'Planned End', render: (r) => formatDate(r.plannedEndDate) },
        { key: 'taskCount', label: 'Tasks' },
        { key: 'riskCount', label: 'Risks' },
        {
          key: 'delayed',
          label: 'Delay',
          sortable: false,
          render: (r) => (r.delayed ? '<span class="badge" style="background:#dc26261a;color:#dc2626">Delayed</span>' : '—'),
        },
      ],
      fetch: (qs) => api.get(`/api/projects?${qs}`),
      onRowClick: (row) => navigate(`projects/${row.id}`),
      actions: [
        { label: 'Edit', className: 'btn-secondary', onClick: (row) => openEdit(row) },
        { label: 'Delete', className: 'btn-danger', onClick: (row) => remove(row) },
      ],
      emptyText: 'No projects yet. Click "New Project" to create one.',
      onCount: (total) => {
        container.querySelector('#projectsCount').textContent = `${total} project(s)`;
      },
    });

    const openCreate = () => {
      projectFormModal({
        stakeholders,
        onSubmit: async (payload) => {
          await api.post('/api/projects', payload);
          await table.refresh();
        },
      });
    };

    const openEdit = (project) => {
      projectFormModal({
        project,
        stakeholders,
        onSubmit: async (payload) => {
          await api.put(`/api/projects/${project.id}`, payload);
          await table.refresh();
        },
      });
    };

    const remove = async (project) => {
      const ok = await confirmDialog(
        `Delete project "${project.name}"? This also deletes its tasks, dependencies and risks.`,
        { title: 'Delete project', confirmText: 'Delete' }
      );
      if (!ok) return;
      try {
        await api.del(`/api/projects/${project.id}`);
        toast('Project deleted');
        await table.refresh();
      } catch (err) {
        toast(err.message, 'error');
      }
    };

    container.querySelector('#newProjectBtn').addEventListener('click', openCreate);
  },
};
