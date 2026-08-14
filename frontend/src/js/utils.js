// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "2026-08-14T00:00:00.000Z" -> "2026-08-14" (UTC). */
export function toDateInput(iso) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

/** True when an ISO date string ("YYYY-MM-DD") falls on Saturday or Sunday. */
export function isWeekend(dateStr) {
  if (!dateStr) return false;
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

/** "2026-08-14T00:00:00.000Z" -> "Aug 14, 2026". */
export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Status / level metadata (display only; the values come from the API)
// ---------------------------------------------------------------------------

export const PROJECT_STATUSES = ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'];
export const RISK_STATUSES = ['OPEN', 'MITIGATED', 'CLOSED', 'ACCEPTED'];
export const ROLES = ['RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED'];
export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const STATUS_COLORS = {
  PLANNED: '#6366f1',
  IN_PROGRESS: '#2563eb',
  ON_HOLD: '#d97706',
  COMPLETED: '#16a34a',
  CANCELLED: '#64748b',
  TODO: '#64748b',
  BLOCKED: '#dc2626',
  OPEN: '#dc2626',
  MITIGATED: '#2563eb',
  CLOSED: '#16a34a',
  ACCEPTED: '#64748b',
};

export const RISK_LEVEL_COLORS = {
  LOW: '#16a34a',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  CRITICAL: '#dc2626',
};

// ---------------------------------------------------------------------------
// Small DOM helpers
// ---------------------------------------------------------------------------

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== undefined && value !== null) {
      node.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function debounce(fn, ms = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
