import { escapeHtml, STATUS_COLORS } from '../utils.js';

// ---------------------------------------------------------------------------
// Badges & chips
// ---------------------------------------------------------------------------

export function statusBadge(status) {
  const color = STATUS_COLORS[status] || '#64748b';
  const label = String(status || '—').replace(/_/g, ' ');
  return `<span class="badge" style="background:${color}1a;color:${color}">
    <span class="badge-dot"></span>${escapeHtml(label)}</span>`;
}

export function priorityChip(priority) {
  if (!priority) return '<span class="text-muted">—</span>';
  const color = priority.color || '#64748b';
  return `<span class="priority-chip" style="background:${escapeHtml(color)}">${escapeHtml(priority.name)}</span>`;
}

export function riskLevelBadge(level) {
  const colors = { LOW: '#16a34a', MEDIUM: '#ca8a04', HIGH: '#ea580c', CRITICAL: '#dc2626' };
  const color = colors[level] || '#64748b';
  return `<span class="badge" style="background:${color}1a;color:${color}">${escapeHtml(level || '—')}</span>`;
}

export function progressBar(percent, { showLabel = true, color } = {}) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const fillColor = color || (p >= 100 ? '#16a34a' : p > 0 ? '#4f46e5' : '#94a3b8');
  return `<div class="progress-cell"><div class="progress-track">
      <div class="progress-fill" style="width:${p}%;background:${fillColor}"></div>
    </div>${showLabel ? `<span class="pct">${p}%</span>` : ''}</div>`;
}

// ---------------------------------------------------------------------------
// Toast notifications
// ---------------------------------------------------------------------------

export function toast(message, type = 'success', ms = 3500) {
  const root = document.getElementById('toast-root');
  const node = document.createElement('div');
  node.className = `toast toast-${type}`;
  node.textContent = message;
  root.appendChild(node);
  setTimeout(() => {
    node.style.opacity = '0';
    node.style.transition = 'opacity 0.3s';
    setTimeout(() => node.remove(), 300);
  }, ms);
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function openModal({ title, body = '', footer = '', wide = false, onClose } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal ${wide ? 'modal-wide' : ''}">
      <div class="modal-header">
        <h3>${escapeHtml(title)}</h3>
        <button class="modal-close" aria-label="Close"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="modal-body"></div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>`;

  const bodyEl = overlay.querySelector('.modal-body');
  bodyEl.innerHTML = body;

  const close = () => {
    overlay.remove();
    onClose?.();
  };

  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', esc);
    }
  });

  document.body.appendChild(overlay);
  return { close, body: bodyEl, overlay };
}

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------

export function confirmDialog(message, { title = 'Are you sure?', confirmText = 'Delete', danger = true } = {}) {
  return new Promise((resolve) => {
    const modal = openModal({
      title,
      body: `<p style="font-size:14px">${escapeHtml(message)}</p>`,
      footer: `
        <button class="btn btn-secondary" data-act="cancel">Cancel</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="confirm">${escapeHtml(confirmText)}</button>`,
      onClose: () => resolve(false),
    });
    modal.overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => {
      modal.close();
      resolve(false);
    });
    modal.overlay.querySelector('[data-act="confirm"]').addEventListener('click', () => {
      // Resolve BEFORE closing: close() runs onClose, which would otherwise
      // settle the promise with `false` first and swallow the confirmation.
      resolve(true);
      modal.close();
    });
  });
}

// ---------------------------------------------------------------------------
// Loading / error helpers
// ---------------------------------------------------------------------------

export function loadingHtml() {
  return '<div class="page-loading">Loading…</div>';
}
