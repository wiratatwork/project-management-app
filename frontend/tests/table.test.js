// ---------------------------------------------------------------------------
// DataTable component — bulk-select & delete (checkbox column)
//
// Covers the selectable contract in `src/js/components/table.js`:
//   - checkbox column is the FIRST column, fixed (non-reorderable,
//     non-resizable, non-sortable)
//   - row checkboxes + header select-all (current page) + indeterminate state
//   - "Delete selected (N)" button appears/hides with the selection
//   - bulk delete flow: confirm dialog -> onBulkDelete(ids) -> reload
//   - checkbox clicks never trigger row navigation (onRowClick)
//   - selection is page-scoped and cleared on every reload
// ---------------------------------------------------------------------------
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/js/components/ui.js', () => ({
  confirmDialog: vi.fn(),
  toast: vi.fn(),
  statusBadge: vi.fn((s) => `<span>${s}</span>`),
  priorityChip: vi.fn(),
  riskLevelBadge: vi.fn(),
  progressBar: vi.fn(),
  loadingHtml: vi.fn(() => '<div>loading</div>'),
  openModal: vi.fn(),
}));

import { renderDataTable } from '../src/js/components/table.js';
import { confirmDialog, toast } from '../src/js/components/ui.js';

const confirmDialogMock = vi.mocked(confirmDialog);
const toastMock = vi.mocked(toast);

function makeTable({ rows = 3, selectable = false, onBulkDelete, confirmBulkDelete, onRowClick, actions = [] } = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const fetchMock = vi.fn(async () => ({
    rows: Array.from({ length: rows }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}`, code: `C-${i + 1}` })),
    total: rows,
    page: 1,
    limit: 10,
    totalPages: 1,
  }));
  const table = renderDataTable(container, {
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
    ],
    fetch: fetchMock,
    selectable,
    onBulkDelete,
    confirmBulkDelete,
    onRowClick,
    actions,
  });
  return { container, table, fetchMock };
}

const allCheckboxes = (container) => [...container.querySelectorAll('[data-dt-row]')];
const rowCheckbox = (container, n) => container.querySelector(`[data-dt-row="${n}"]`);
const selectAllBox = (container) => container.querySelector('[data-dt-select-all]');
const bulkBtn = (container) => container.querySelector('[data-dt-bulk-delete]');
const firstHeader = (container) => container.querySelector('thead th');

// Load completes asynchronously (fetch resolves in a microtask chain).
const settled = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  document.body.innerHTML = '';
  confirmDialogMock.mockReset();
  toastMock.mockReset();
  confirmDialogMock.mockResolvedValue(true);
});

describe('checkbox column rendering (selectable)', () => {
  it('renders the checkbox column as the FIRST header + first cell of every row', async () => {
    const { container } = makeTable({ selectable: true, onBulkDelete: vi.fn() });
    await settled();

    expect(firstHeader(container).textContent.trim()).toBe('');
    expect(firstHeader(container).querySelector('input[type="checkbox"]')).toBeTruthy();
    expect(allCheckboxes(container)).toHaveLength(3);
    const firstDataHeader = container.querySelectorAll('thead th')[1];
    expect(firstDataHeader.textContent).toContain('Code');
    // first cell of the first row is the checkbox, second is the data
    const firstRow = container.querySelector('tbody tr');
    expect(firstRow.querySelector('td input[data-dt-row]')).toBeTruthy();
    expect(firstRow.querySelectorAll('td')[1].textContent).toContain('C-1');
  });

  it('checkbox header has no sort/drag/resize affordances (fixed column)', async () => {
    const { container } = makeTable({ selectable: true, onBulkDelete: vi.fn() });
    await settled();
    const th = firstHeader(container);
    expect(th.className).toBe('dt-check');
    expect(th.hasAttribute('data-sort')).toBe(false);
    expect(th.querySelector('.dt-grip')).toBeNull(); // non-reorderable
    expect(th.querySelector('.dt-col-resize')).toBeNull(); // non-resizable
    expect(th.hasAttribute('draggable')).toBe(false);
  });

  it('does NOT render the checkbox column when selectable is false (default)', async () => {
    const { container } = makeTable();
    await settled();
    expect(firstHeader(container).textContent).toContain('Code');
    expect(container.querySelector('[data-dt-row]')).toBeNull();
    expect(container.querySelector('[data-dt-select-all]')).toBeNull();
    expect(bulkBtn(container)).toBeNull();
  });

  it('hides the bulk-delete button when nothing is selected', async () => {
    const { container } = makeTable({ selectable: true, onBulkDelete: vi.fn() });
    await settled();
    expect(bulkBtn(container).hidden).toBe(true);
  });
});

describe('selection state', () => {
  it('selecting a row shows the button with the count and syncs select-all', async () => {
    const { container } = makeTable({ selectable: true, onBulkDelete: vi.fn() });
    await settled();

    rowCheckbox(container, 1).click();
    await settled();

    expect(bulkBtn(container).hidden).toBe(false);
    expect(bulkBtn(container).textContent).toContain('Delete selected (1)');
    // select-all is mixed: 1 of 3 selected
    expect(selectAllBox(container).indeterminate).toBe(true);
    expect(selectAllBox(container).checked).toBe(false);
  });

  it('select-all checks every row on the page and unchecks them again', async () => {
    const { container } = makeTable({ selectable: true, onBulkDelete: vi.fn() });
    await settled();

    selectAllBox(container).click();
    await settled();
    expect(allCheckboxes(container).every((cb) => cb.checked)).toBe(true);
    expect(selectAllBox(container).checked).toBe(true);
    expect(selectAllBox(container).indeterminate).toBe(false);
    expect(bulkBtn(container).textContent).toContain('Delete selected (3)');

    selectAllBox(container).click();
    await settled();
    expect(allCheckboxes(container).every((cb) => !cb.checked)).toBe(true);
    expect(bulkBtn(container).hidden).toBe(true);
  });

  it('unchecking one row leaves select-all indeterminate', async () => {
    const { container } = makeTable({ selectable: true, onBulkDelete: vi.fn() });
    await settled();
    selectAllBox(container).click();
    rowCheckbox(container, 2).click(); // deselect one
    await settled();
    expect(selectAllBox(container).indeterminate).toBe(true);
    expect(bulkBtn(container).textContent).toContain('Delete selected (2)');
  });
});

describe('bulk delete flow', () => {
  it('calls onBulkDelete with the selected ids after confirmation, then clears + reloads', async () => {
    const onBulkDelete = vi.fn(async () => {});
    const { container, fetchMock } = makeTable({ selectable: true, onBulkDelete });
    await settled();

    rowCheckbox(container, 1).click();
    rowCheckbox(container, 3).click();
    bulkBtn(container).click();
    await settled();
    await settled();

    expect(confirmDialogMock).toHaveBeenCalledWith(expect.stringContaining('Delete 2 selected item(s)?'));
    expect(onBulkDelete).toHaveBeenCalledWith([1, 3]);
    // selection cleared + table reloaded (fetch called again)
    expect(allCheckboxes(container).every((cb) => !cb.checked)).toBe(true);
    expect(bulkBtn(container).hidden).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('passes the custom confirmBulkDelete message to the dialog', async () => {
    const { container } = makeTable({
      selectable: true,
      onBulkDelete: vi.fn(async () => {}),
      confirmBulkDelete: (n) => `Delete ${n} selected project(s)? This also deletes their tasks.`,
    });
    await settled();
    rowCheckbox(container, 1).click();
    bulkBtn(container).click();
    await settled();
    expect(confirmDialogMock).toHaveBeenCalledWith('Delete 1 selected project(s)? This also deletes their tasks.');
  });

  it('does NOT delete when the user cancels the dialog', async () => {
    confirmDialogMock.mockResolvedValue(false);
    const onBulkDelete = vi.fn(async () => {});
    const { container, fetchMock } = makeTable({ selectable: true, onBulkDelete });
    await settled();
    rowCheckbox(container, 1).click();
    bulkBtn(container).click();
    await settled();
    expect(onBulkDelete).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1); // no reload
  });

  it('toasts the error when onBulkDelete rejects and still reloads', async () => {
    const onBulkDelete = vi.fn(async () => {
      throw new Error('Delete failed');
    });
    const { container, fetchMock } = makeTable({ selectable: true, onBulkDelete });
    await settled();
    rowCheckbox(container, 1).click();
    bulkBtn(container).click();
    await settled();
    await settled();
    expect(toastMock).toHaveBeenCalledWith('Delete failed', 'error');
    expect(allCheckboxes(container).every((cb) => !cb.checked)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('interaction isolation', () => {
  it('a checkbox click does NOT trigger onRowClick (row navigation)', async () => {
    const onRowClick = vi.fn();
    const { container } = makeTable({ selectable: true, onBulkDelete: vi.fn(), onRowClick });
    await settled();

    rowCheckbox(container, 1).click();
    await settled();
    expect(onRowClick).not.toHaveBeenCalled();

    // clicking the row body (not the checkbox) still navigates
    const nameCell = container.querySelector('tbody tr td:nth-child(3)');
    nameCell.click();
    await settled();
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0][0]).toMatchObject({ id: 1 });
  });

  it('reload (refresh) clears the selection', async () => {
    const { container, table } = makeTable({ selectable: true, onBulkDelete: vi.fn() });
    await settled();
    rowCheckbox(container, 1).click();
    expect(bulkBtn(container).hidden).toBe(false);

    await table.refresh();
    await settled();
    expect(allCheckboxes(container).every((cb) => !cb.checked)).toBe(true);
    expect(bulkBtn(container).hidden).toBe(true);
  });
});
