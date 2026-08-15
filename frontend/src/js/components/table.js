import { escapeHtml } from '../utils.js';
import { confirmDialog, toast } from './ui.js';
import { selectHTML, mountSelects } from './select.js';

const PAGE_SIZES = [10, 25, 50];

/**
 * Server-side DataTable — the one table component every list screen uses.
 *
 * columns: [{ key, label, sortable = true, sortKey (backend column), render(row), align }]
 * fetch:   async (params) => ({ rows, total, page, limit, totalPages })
 *          `params` is the query string built by the component (page, limit,
 *          search, sortBy, sortDir) — append any extra static params via
 *          `extraParams` (e.g. filters like projectId/status).
 *
 * selectable + onBulkDelete: shows a fixed checkbox column (non-reorderable,
 * non-resizable, non-sortable) as the FIRST column, with a header select-all
 * (current page) and a "Delete selected" toolbar button. The selection is
 * page-scoped (cleared on every reload).
 *
 * Returns { refresh } — call it after create/edit/delete to reload the
 * current page.
 */
export function renderDataTable(container, {
  columns,
  fetch,
  onRowClick,
  actions = [],
  emptyText = 'No records found',
  pageSize = 10,
  searchable = true,
  onCount,
  initialSort = {},
  extraParams = {},
  tableKey,
  rowClass = () => '',
  selectable = false,
  onBulkDelete,
  confirmBulkDelete,
} = {}) {
  const state = {
    page: 1,
    limit: pageSize,
    search: '',
    sortBy: initialSort.sortBy || '',
    sortDir: initialSort.sortDir || 'asc',
    loading: false,
    rows: [],
    total: 0,
    totalPages: 1,
  };

  const selected = new Set(); // ids ticked for bulk delete (page-scoped)

  let seq = 0; // guards against out-of-order responses

  // --- Column order: drag-to-reorder, remembered per table in localStorage ---
  // One reusable mechanism for every table in the system (they all go through
  // this component). The order is a list of column keys; new columns that
  // appear later are appended to the end.

  const ORDER_KEY = `pm_table_cols_${tableKey || container.id || 'table'}`;
  let cols = [...columns];
  let dragKey = null;
  let justDragged = false;

  const loadOrder = () => {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(ORDER_KEY));
    } catch {
      saved = null;
    }
    if (!Array.isArray(saved) || saved.length === 0) return;
    const byKey = new Map(cols.map((c) => [c.key, c]));
    const ordered = saved.map((k) => byKey.get(k)).filter(Boolean);
    for (const c of columns) if (!ordered.includes(c)) ordered.push(c);
    if (ordered.length === cols.length) cols = ordered;
  };

  const persistOrder = () => {
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(cols.map((c) => c.key)));
    } catch {
      /* storage unavailable — ignore */
    }
  };

  loadOrder();

  // --- Column widths: drag the header edge to resize, remembered per table ---

  const WIDTHS_KEY = `pm_table_widths_${tableKey || container.id || 'table'}`;
  let colWidths = {};
  try {
    colWidths = JSON.parse(localStorage.getItem(WIDTHS_KEY)) || {};
  } catch {
    colWidths = {};
  }
  let justResized = false;

  const persistWidths = () => {
    try {
      localStorage.setItem(WIDTHS_KEY, JSON.stringify(colWidths));
    } catch {
      /* ignore */
    }
  };

  const buildQuery = () => {
    const q = new URLSearchParams();
    q.set('page', String(state.page));
    q.set('limit', String(state.limit));
    if (state.search) q.set('search', state.search);
    if (state.sortBy) {
      q.set('sortBy', state.sortBy);
      q.set('sortDir', state.sortDir);
    }
    for (const [k, v] of Object.entries(extraParams)) {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    }
    return q.toString();
  };

  const sortKeyOf = (col) => col.sortKey || col.key;

  // --- Rendering -----------------------------------------------------------

  // Fixed checkbox column: first column, never draggable / resizable / sortable
  // (it has no `dt-col` class, no resize handle and no `data-sort`).
  const checkboxThHtml = () =>
    `<th class="dt-check" aria-label="Select rows">
      <input type="checkbox" data-dt-select-all title="Select all on this page" />
    </th>`;
  const checkboxTdHtml = (row) =>
    `<td class="dt-check"><input type="checkbox" data-dt-row="${row.id}" ${selected.has(row.id) ? 'checked' : ''} aria-label="Select row" /></td>`;

  const thFor = (col) => {
    const sortable = col.sortable !== false && sortKeyOf(col);
    const active = sortable && state.sortBy === sortKeyOf(col);
    const dir = active && state.sortDir === 'desc' ? 'desc' : 'asc';
    const icon = active ? (dir === 'desc' ? 'bi-arrow-down' : 'bi-arrow-up') : 'bi-arrow-down-up';
    const styles = [];
    if (col.align) styles.push(`text-align:${col.align}`);
    if (colWidths[col.key]) styles.push(`min-width:${colWidths[col.key]}px`);
    return `<th data-sort="${sortable ? escapeHtml(sortKeyOf(col)) : ''}" data-col="${escapeHtml(col.key)}" class="dt-col${sortable ? ' sortable' : ''}${active ? ' sorted' : ''}"${styles.length ? ` style="${styles.join(';')}"` : ''}>
      <span class="dt-col-resize" data-col="${escapeHtml(col.key)}" title="Drag to resize column" aria-hidden="true"></span>
      <i class="bi bi-grip-vertical dt-grip" title="Drag to reorder column" aria-hidden="true"></i>${escapeHtml(col.label)}${sortable ? `<i class="bi ${icon} sort-icon"></i>` : ''}
    </th>`;
  };

  const emptyRow = (message) =>
    `<tr class="empty-row"><td colspan="${cols.length + (actions.length ? 1 : 0) + (selectable ? 1 : 0)}">${escapeHtml(message)}</td></tr>`;

  const rowsHtml = () => {
    if (state.loading) return emptyRow('Loading…');
    if (state.rows.length === 0) return emptyRow(emptyText);
    return state.rows
      .map((row) => {
        const tds = `${selectable ? checkboxTdHtml(row) : ''}${cols
          .map((c) => {
            const styles = [];
            if (c.align) styles.push(`text-align:${c.align}`);
            if (colWidths[c.key]) styles.push(`min-width:${colWidths[c.key]}px`);
            return `<td${styles.length ? ` style="${styles.join(';')}"` : ''}>${c.render ? c.render(row) : escapeHtml(row[c.key] ?? '—')}</td>`;
          })
          .join('')}`;
        const actionTds = actions.length
          ? `<td class="cell-actions">${actions
              .map((a) => `<button class="btn btn-sm ${a.className || 'btn-secondary'}" data-act="${escapeHtml(a.label)}">${escapeHtml(a.label)}</button>`)
              .join('')}</td>`
          : '';
        return `<tr class="${onRowClick ? 'clickable' : ''} ${row._rowClass || ''} ${rowClass(row)}" data-id="${row.id}">${tds}${actionTds}</tr>`;
      })
      .join('');
  };

  const infoText = () => {
    if (state.total === 0) return 'Showing 0 of 0';
    const from = (state.page - 1) * state.limit + 1;
    const to = Math.min(state.total, state.page * state.limit);
    return `Showing ${from}–${to} of ${state.total}`;
  };

  const pageButtons = () => {
    const pages = new Set([1, state.totalPages]);
    for (let i = Math.max(2, state.page - 1); i <= Math.min(state.totalPages - 1, state.page + 1); i++) pages.add(i);
    const sorted = [...pages].sort((a, b) => a - b);
    let html = '';
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) html += '<span class="dt-ellipsis">…</span>';
      html += `<button type="button" class="dt-page${p === state.page ? ' active' : ''}" data-page="${p}">${p}</button>`;
      prev = p;
    }
    return html;
  };

  const pagerHtml = () => `
    <button type="button" class="dt-page" data-page="prev" ${state.page <= 1 ? 'disabled' : ''} title="Previous page"><i class="bi bi-chevron-left"></i></button>
    ${pageButtons()}
    <button type="button" class="dt-page" data-page="next" ${state.page >= state.totalPages ? 'disabled' : ''} title="Next page"><i class="bi bi-chevron-right"></i></button>`;

  container.innerHTML = `
    <div class="dt-toolbar">
      ${searchable ? `
        <div class="dt-search">
          <i class="bi bi-search"></i>
          <input type="text" placeholder="Search…" data-dt-search autocomplete="off" />
        </div>` : '<span></span>'}
      <div class="dt-toolbar-end">
        ${selectable && onBulkDelete ? `<button type="button" class="btn btn-sm btn-danger dt-bulk-delete" data-dt-bulk-delete hidden><i class="bi bi-trash"></i> <span data-dt-bulk-count>Delete selected</span></button>` : ''}
        <button type="button" class="btn btn-sm btn-secondary dt-col-reset" data-dt-col-reset hidden title="Restore the default column order"><i class="bi bi-arrow-counterclockwise"></i> Reset columns</button>
        <div class="dt-pagesize">
          <span>Show</span>
          ${selectHTML({ name: 'dtLimit', options: PAGE_SIZES.map((n) => [n, String(n)]), value: String(state.limit), attrs: 'class="dt-limit" title="Rows per page"' })}
          <span>per page</span>
        </div>
      </div>
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr>${selectable ? checkboxThHtml() : ''}${cols.map(thFor).join('')}${actions.length ? '<th class="cell-actions">Actions</th>' : ''}</tr></thead>
      <tbody data-dt-body>${rowsHtml()}</tbody>
    </table></div>
    <div class="dt-footer">
      <span class="dt-info">${infoText()}</span>
      <div class="dt-pager">${pagerHtml()}</div>
    </div>`;

  const body = container.querySelector('[data-dt-body]');
  const searchInput = container.querySelector('[data-dt-search]');
  const resetColsBtn = container.querySelector('[data-dt-col-reset]');

  // Show the reset button only while the column order differs from the default.
  const isCustomOrder = () => cols.some((c, i) => c !== columns[i]);
  const syncResetColsBtn = () => {
    if (resetColsBtn) resetColsBtn.hidden = !isCustomOrder();
  };
  syncResetColsBtn();

  // --- Loading / data ------------------------------------------------------

  const load = async () => {
    const id = ++seq;
    selected.clear(); // selection is page-scoped — reset on every reload
    state.loading = true;
    body.innerHTML = rowsHtml();
    try {
      const res = await fetch(buildQuery());
      if (id !== seq) return; // a newer request superseded this one
      state.rows = res.rows || [];
      state.total = res.total || 0;
      state.totalPages = Math.max(1, res.totalPages || 1);
      // After a delete the current page may be empty — jump to the last page.
      if (state.rows.length === 0 && state.page > state.totalPages) {
        state.page = state.totalPages;
        state.loading = false;
        await load();
        return;
      }
      onCount?.(state.total);
    } catch (err) {
      if (id === seq) toast(err.message, 'error');
    } finally {
      if (id === seq) {
        state.loading = false;
        body.innerHTML = rowsHtml();
        container.querySelector('.dt-info').innerHTML = infoText();
        container.querySelector('.dt-pager').innerHTML = pagerHtml();
        bindPager();
        bindRows();
        syncSelection();
      }
    }
  };

  // --- Interactions --------------------------------------------------------

  const bindRows = () => {
    container.querySelectorAll('tbody tr.clickable').forEach((tr) => {
      tr.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        if (e.target.closest('input')) return; // checkbox toggles, don't navigate
        const row = state.rows.find((r) => r.id === Number(tr.dataset.id));
        if (row) onRowClick(row);
      });
    });
    actions.forEach((action) => {
      container.querySelectorAll(`[data-act="${CSS.escape(action.label)}"]`).forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tr = btn.closest('tr');
          const row = state.rows.find((r) => r.id === Number(tr.dataset.id));
          if (row) action.onClick(row);
        });
      });
    });
  };

  const bindPager = () => {
    container.querySelectorAll('.dt-page[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.page;
        const next = target === 'prev' ? state.page - 1 : target === 'next' ? state.page + 1 : Number(target);
        if (next < 1 || next > state.totalPages || next === state.page) return;
        state.page = next;
        load();
      });
    });
  };

  if (searchInput) {
    let timer = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.search = searchInput.value.trim();
        state.page = 1;
        load();
      }, 300);
    });
  }

  const head = container.querySelector('thead tr');

  // Drag-to-reorder: dragging a header onto another swaps their positions,
  // persists the order to localStorage, and re-renders header + body.
  const bindHeaderDrag = () => {
    container.querySelectorAll('thead th.dt-col').forEach((th) => {
      th.draggable = true;
      th.addEventListener('dragstart', (e) => {
        dragKey = th.dataset.col;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragKey);
        th.classList.add('dt-drag-source');
      });
      th.addEventListener('dragover', (e) => {
        if (!dragKey || dragKey === th.dataset.col) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        container.querySelectorAll('thead th.dt-col').forEach((t) => t.classList.remove('dt-drag-over'));
        th.classList.add('dt-drag-over');
      });
      th.addEventListener('dragleave', () => th.classList.remove('dt-drag-over'));
      th.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetKey = th.dataset.col;
        if (!dragKey || dragKey === targetKey) return;
        const from = cols.findIndex((c) => c.key === dragKey);
        const to = cols.findIndex((c) => c.key === targetKey);
        if (from < 0 || to < 0) return;
        const [moved] = cols.splice(from, 1);
        // Swap semantics: the dragged column takes the drop target's slot.
        cols.splice(to, 0, moved);
        persistOrder();
        renderHeader();
        // Re-render the body immediately so the cells follow the new column
        // order (no refresh needed), and keep row click/action bindings alive.
        body.innerHTML = rowsHtml();
        bindRows();
        syncResetColsBtn();
      });
      th.addEventListener('dragend', () => {
        dragKey = null;
        justDragged = true;
        setTimeout(() => {
          justDragged = false;
        }, 60);
        container.querySelectorAll('thead th.dt-col').forEach((t) => t.classList.remove('dt-drag-source', 'dt-drag-over'));
      });
    });
  };

  // Drag the right edge of a header to resize that column (live preview,
  // persisted on release). Works with the header-drag + sort bindings.
  const bindColResize = () => {
    container.querySelectorAll('.dt-col-resize').forEach((handle) => {
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault(); // stops native drag/text selection from starting
        e.stopPropagation();
        const th = handle.closest('th');
        const key = handle.dataset.col;
        const colIdx = cols.findIndex((c) => c.key === key);
        if (colIdx < 0) return;
        const startX = e.clientX;
        const startW = th.getBoundingClientRect().width;
        // The fixed checkbox column (when selectable) shifts every body cell
        // one slot to the right of the header column index.
        const cellOffset = selectable ? 1 : 0;
        const cells = [...container.querySelectorAll('tbody tr')].map((tr) => tr.children[colIdx + cellOffset]).filter(Boolean);
        const applyW = (w) => {
          const cw = Math.round(Math.max(60, Math.min(w, 700)));
          th.style.minWidth = `${cw}px`;
          cells.forEach((td) => {
            td.style.minWidth = `${cw}px`;
          });
        };
        const onMove = (ev) => applyW(startW + (ev.clientX - startX));
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          document.body.classList.remove('dt-resizing');
          colWidths[key] = Math.round(Math.max(60, Math.min(th.getBoundingClientRect().width, 700)));
          persistWidths();
          justResized = true;
          setTimeout(() => {
            justResized = false;
          }, 60);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        document.body.classList.add('dt-resizing');
      });
    });
  };

  // Re-render the header row (keeps sort arrows + drag/reorder/resize in sync).
  const renderHeader = () => {
    head.innerHTML = (selectable ? checkboxThHtml() : '') + cols.map(thFor).join('') + (actions.length ? '<th class="cell-actions">Actions</th>' : '');
    bindSortHeaders();
    bindHeaderDrag();
    bindColResize();
    syncSelection();
  };

  // Keep the select-all checkbox + bulk-delete button in sync with `selected`.
  const syncSelection = () => {
    if (!selectable) return;
    const all = container.querySelector('[data-dt-select-all]');
    if (all) {
      const pageIds = state.rows.map((r) => r.id);
      const onPage = pageIds.filter((id) => selected.has(id)).length;
      all.checked = pageIds.length > 0 && onPage === pageIds.length;
      all.indeterminate = onPage > 0 && onPage < pageIds.length;
    }
    const btn = container.querySelector('[data-dt-bulk-delete]');
    if (btn) {
      btn.hidden = selected.size === 0;
      const label = btn.querySelector('[data-dt-bulk-count]');
      if (label) label.textContent = `Delete selected (${selected.size})`;
    }
  };

  // Row checkboxes + select-all + bulk delete (delegated, so re-renders are fine).
  const bindSelection = () => {
    if (!selectable) return;
    container.addEventListener('change', (e) => {
      const rowBox = e.target.closest('[data-dt-row]');
      if (rowBox) {
        const id = Number(rowBox.dataset.dtRow);
        if (rowBox.checked) selected.add(id);
        else selected.delete(id);
        syncSelection();
        return;
      }
      if (e.target.matches('[data-dt-select-all]')) {
        const pageIds = state.rows.map((r) => r.id);
        if (e.target.checked) pageIds.forEach((id) => selected.add(id));
        else pageIds.forEach((id) => selected.delete(id));
        container.querySelectorAll('[data-dt-row]').forEach((cb) => {
          cb.checked = e.target.checked;
        });
        syncSelection();
      }
    });
    container.querySelector('[data-dt-bulk-delete]')?.addEventListener('click', async () => {
      const ids = [...selected];
      if (!ids.length || typeof onBulkDelete !== 'function') return;
      const msg = typeof confirmBulkDelete === 'function' ? confirmBulkDelete(ids.length) : confirmBulkDelete;
      const ok = await confirmDialog(msg || `Delete ${ids.length} selected item(s)?`);
      if (!ok) return;
      try {
        await onBulkDelete(ids);
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        selected.clear();
        // The page may have re-rendered (detached container) — only refresh
        // when this table instance is still on screen.
        if (container.isConnected) await load();
      }
    });
  };

  const bindSortHeaders = () => {
    container.querySelectorAll('th[data-sort]').forEach((th) => {
      th.addEventListener('click', () => {
        if (justDragged || justResized) return; // a drag/resize ended here — not a sort
        const key = th.dataset.sort;
        if (!key) return;
        if (state.sortBy === key) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortBy = key;
          state.sortDir = 'asc';
        }
        state.page = 1;
        renderHeader();
        load();
      });
    });
  };
  renderHeader();

  bindSelection();

  resetColsBtn?.addEventListener('click', () => {
    cols = [...columns];
    try {
      localStorage.removeItem(ORDER_KEY);
    } catch {
      /* ignore */
    }
    renderHeader();
    body.innerHTML = rowsHtml();
    bindRows();
    syncResetColsBtn();
  });

  mountSelects(container);
  container.querySelector('.dt-limit')?.addEventListener('change', (e) => {
    state.limit = Number(e.target.value) || state.limit;
    state.page = 1;
    load();
  });

  bindPager();
  load();

  return {
    refresh: () => load(),
    /** Merge new static query params (e.g. filters) and reload page 1. */
    setExtraParams: (extra) => {
      Object.assign(extraParams, extra);
      state.page = 1;
      load();
    },
    state,
  };
}
