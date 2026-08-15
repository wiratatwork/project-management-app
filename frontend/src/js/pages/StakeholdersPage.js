import { api } from '../api.js';
import { escapeHtml } from '../utils.js';
import { confirmDialog, toast } from '../components/ui.js';
import { renderDataTable } from '../components/table.js';
import { stakeholderFormModal } from '../components/forms.js';

export default {
  async mount(container) {
    container.innerHTML = `
      <div class="page-title">Stakeholders</div>
      <div class="page-subtitle">People involved in projects and tasks</div>
      <div class="toolbar">
        <button class="btn btn-primary" id="newStakeholderBtn">+ New Stakeholder</button>
      </div>
      <div class="card"><div id="stakeholdersTable"></div></div>
    `;

    const table = renderDataTable(container.querySelector('#stakeholdersTable'), {
      columns: [
        { key: 'name', label: 'Name', render: (r) => `<strong>${escapeHtml(r.name)}</strong>` },
        { key: 'email', label: 'Email' },
        { key: 'position', label: 'Position', render: (r) => escapeHtml(r.position || '—') },
        { key: 'department', label: 'Department', render: (r) => escapeHtml(r.department || '—') },
        { key: 'organization', label: 'Organization', render: (r) => escapeHtml(r.organization || '—') },
        { key: 'phone', label: 'Phone', sortable: false, render: (r) => escapeHtml(r.phone || '—') },
        { key: 'projectCount', label: 'Projects' },
        { key: 'taskCount', label: 'Tasks' },
      ],
      fetch: (qs) => api.get(`/api/stakeholders?${qs}`),
      actions: [
        { label: 'Edit', className: 'btn-secondary', onClick: (row) => openEdit(row) },
        { label: 'Delete', className: 'btn-danger', onClick: (row) => remove(row) },
      ],
      emptyText: 'No stakeholders yet.',
    });

    const openCreate = () => {
      stakeholderFormModal({
        onSubmit: async (payload) => {
          await api.post('/api/stakeholders', payload);
          toast('Stakeholder created');
          await table.refresh();
        },
      });
    };

    const openEdit = (stakeholder) => {
      stakeholderFormModal({
        stakeholder,
        onSubmit: async (payload) => {
          await api.put(`/api/stakeholders/${stakeholder.id}`, payload);
          toast('Stakeholder updated');
          await table.refresh();
        },
      });
    };

    const remove = async (stakeholder) => {
      const ok = await confirmDialog(
        `Delete stakeholder "${stakeholder.name}"? Their project/task links will be removed.`,
        { title: 'Delete stakeholder' }
      );
      if (!ok) return;
      try {
        await api.del(`/api/stakeholders/${stakeholder.id}`);
        toast('Stakeholder deleted');
        await table.refresh();
      } catch (err) {
        toast(err.message, 'error');
      }
    };

    const removeMany = async (ids) => {
      const results = await Promise.allSettled(ids.map((id) => api.del(`/api/stakeholders/${id}`)));
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length) {
        toast(`Deleted ${ids.length - failed.length} of ${ids.length} — ${failed[0].reason?.message || 'some items could not be deleted'}`, 'error');
      } else {
        toast(`${ids.length} stakeholder(s) deleted`);
      }
    };

    container.querySelector('#newStakeholderBtn').addEventListener('click', openCreate);
  },
};
