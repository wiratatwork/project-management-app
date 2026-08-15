import { api } from '../api.js';
import { escapeHtml } from '../utils.js';
import { confirmDialog, toast } from '../components/ui.js';
import { renderDataTable } from '../components/table.js';
import { priorityFormModal } from '../components/forms.js';

export default {
  async mount(container) {
    container.innerHTML = `
      <div class="page-title">Priorities</div>
      <div class="page-subtitle">Task priorities are configurable — level 1 is the highest priority</div>
      <div class="toolbar">
        <button class="btn btn-primary" id="newPriorityBtn">+ New Priority</button>
      </div>
      <div class="card"><div id="prioritiesTable"></div></div>
    `;

    const table = renderDataTable(container.querySelector('#prioritiesTable'), {
      columns: [
        { key: 'name', label: 'Name', sortable: false, render: (r) => prioritySwatch(r) },
        { key: 'level', label: 'Level', render: (r) => `<strong>${r.level}</strong>` },
        { key: 'description', label: 'Description', render: (r) => escapeHtml(r.description || '—') },
        { key: 'taskCount', label: 'Tasks using it', sortable: false },
      ],
      fetch: (qs) => api.get(`/api/priorities?${qs}`),
      actions: [
        { label: 'Edit', className: 'btn-secondary', onClick: (row) => openEdit(row) },
        { label: 'Delete', className: 'btn-danger', onClick: (row) => remove(row) },
      ],
      emptyText: 'No priorities defined.',
      selectable: true,
      onBulkDelete: (ids) => removeMany(ids),
      confirmBulkDelete: (n) => `Delete ${n} selected priorit${n === 1 ? 'y' : 'ies'}?`,
    });

    const prioritySwatch = (p) => `
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span style="width:14px;height:14px;border-radius:4px;background:${escapeHtml(p.color || '#94a3b8')}"></span>
        <strong>${escapeHtml(p.name)}</strong>
      </span>`;

    const openCreate = () => {
      priorityFormModal({
        onSubmit: async (payload) => {
          await api.post('/api/priorities', payload);
          toast('Priority created');
          await table.refresh();
        },
      });
    };

    const openEdit = (priority) => {
      priorityFormModal({
        priority,
        onSubmit: async (payload) => {
          await api.put(`/api/priorities/${priority.id}`, payload);
          toast('Priority updated');
          await table.refresh();
        },
      });
    };

    const remove = async (priority) => {
      const ok = await confirmDialog(
        `Delete priority "${priority.name}"?`,
        { title: 'Delete priority' }
      );
      if (!ok) return;
      try {
        await api.del(`/api/priorities/${priority.id}`);
        toast('Priority deleted');
        await table.refresh();
      } catch (err) {
        toast(err.message, 'error');
      }
    };

    const removeMany = async (ids) => {
      const results = await Promise.allSettled(ids.map((id) => api.del(`/api/priorities/${id}`)));
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length) {
        toast(`Deleted ${ids.length - failed.length} of ${ids.length} — ${failed[0].reason?.message || 'some items could not be deleted'}`, 'error');
      } else {
        toast(`${ids.length} priorit${ids.length === 1 ? 'y' : 'ies'} deleted`);
      }
    };

    container.querySelector('#newPriorityBtn').addEventListener('click', openCreate);
  },
};
