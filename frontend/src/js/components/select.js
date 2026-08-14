import { escapeHtml } from '../utils.js';

// ---------------------------------------------------------------------------
// Unified searchable Select.
//
// One component for every dropdown in the app. `selectHTML` renders a
// `.select` wrapper that contains:
//   - a visually-hidden native <select> (keeps form semantics: `name`,
//     value, FormData / collectForm) — never used for interaction
//   - a trigger button showing the current label (or a placeholder)
//   - a panel with a search box + option list (search-as-you-type)
//
// `mountSelects(root)` enhances every `.select` in `root` and exposes:
//   - el.value (get/set)  — same API as a native select, so existing code
//     like `sel.value` keeps working unchanged
//   - el.selectedLabel    — label of the current value
//   - a bubbling `change` CustomEvent on the wrapper whenever the value
//     changes, so existing `addEventListener('change', ...)` handlers work
// ---------------------------------------------------------------------------

/**
 * options: array of [value, label] pairs or plain strings.
 */
export function selectHTML({ name, options, value = '', placeholder = '', required = false, attrs = '' }) {
  const opts = options
    .map((o) => {
      const [val, text] = Array.isArray(o) ? o : [o, o];
      const selected = value !== '' && String(value) === String(val) ? 'selected' : '';
      return `<option value="${escapeHtml(val)}" ${selected}>${escapeHtml(text)}</option>`;
    })
    .join('');

  // Merge an extra class from `attrs` with the component's own class
  // (a second `class=` attribute would silently drop the first one).
  const extraCls = (attrs.match(/class="([^"]*)"/) || [])[1] || '';
  const attrsClean = attrs.replace(/class="[^"]*"/, '');

  return `
    <div class="select${extraCls ? ' ' + extraCls : ''}" data-placeholder="${escapeHtml(placeholder)}" ${attrsClean}>
      <select class="select-native" name="${name}" ${required ? 'required' : ''} tabindex="-1" aria-hidden="true">${opts}</select>
      <button type="button" class="select-trigger" aria-haspopup="listbox">
        <span class="select-label${value === '' && placeholder ? ' placeholder' : ''}">${escapeHtml(value === '' ? placeholder : labelOf(options, value))}</span>
        <span class="select-caret">▾</span>
      </button>
      <div class="select-panel" hidden>
        <input type="text" class="select-search" placeholder="Search…" autocomplete="off" />
        <div class="select-options" role="listbox"></div>
      </div>
    </div>`;
}

function labelOf(options, value) {
  for (const o of options) {
    const [val, text] = Array.isArray(o) ? o : [o, o];
    if (String(val) === String(value)) return text;
  }
  return '';
}

// --- Enhancement -------------------------------------------------------------

let openSelect = null; // the .select wrapper that is currently open
let openPanel = null;  // its .select-panel (portaled to <body> while open)
let openAt = 0;        // timestamp of the last open — the opening sequence can
                       // trigger a scroll (focus/scrollIntoView) that must not
                       // immediately close the panel

function closeOpenSelect() {
  openSelect?._selectClose?.();
}

export function mountSelects(root) {
  root.querySelectorAll('.select').forEach((el) => {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';
    enhance(el);
  });
}

function enhance(el) {
  const native = el.querySelector('.select-native');
  const trigger = el.querySelector('.select-trigger');
  const label = el.querySelector('.select-label');
  const panel = el.querySelector('.select-panel');
  const search = el.querySelector('.select-search');
  const list = el.querySelector('.select-options');

  const opts = Array.from(native.options).map((o) => ({ value: o.value, label: o.textContent }));

  const syncLabel = () => {
    const match = opts.find((o) => String(o.value) === String(native.value));
    label.textContent = match ? match.label : el.dataset.placeholder || '';
    label.classList.toggle('placeholder', !match);
  };

  const setValue = (v, { silent = false } = {}) => {
    if (String(native.value) === String(v)) return;
    native.value = v;
    syncLabel();
    if (!silent) el.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: native.value } }));
  };

  // Same API as a native select, so existing code keeps working.
  Object.defineProperty(el, 'value', { get: () => native.value, set: (v) => setValue(v) });
  Object.defineProperty(el, 'selectedLabel', { get: () => opts.find((o) => String(o.value) === String(native.value))?.label || '' });

  let highlightIdx = -1;

  const renderList = (filter = '') => {
    const q = filter.trim().toLowerCase();
    const items = opts.filter((o) => !q || o.label.toLowerCase().includes(q));
    highlightIdx = -1;
    list.innerHTML = items.length
      ? items
          .map(
            (o, i) =>
              `<div class="select-option${String(o.value) === String(native.value) ? ' selected' : ''}" data-value="${escapeHtml(o.value)}" data-index="${i}" role="option">${escapeHtml(o.label)}</div>`
          )
          .join('')
      : '<div class="select-empty">No matches</div>';
  };

  const highlight = (idx) => {
    const items = list.querySelectorAll('.select-option');
    if (items.length === 0) return;
    highlightIdx = (idx + items.length) % items.length;
    items.forEach((o) => o.classList.toggle('highlight', Number(o.dataset.index) === highlightIdx));
    items[highlightIdx]?.scrollIntoView({ block: 'nearest' });
  };

  const open = () => {
    // Only one panel open at a time.
    if (openSelect && openSelect !== el) closeOpenSelect();
    renderList(search.value);
    // Portal the panel to <body>: fixed positioning keeps it above the modal
    // backdrop and out of any clipping container (the modal card is
    // overflow:hidden and the overlay scrolls — an in-place panel gets cut).
    const rect = trigger.getBoundingClientRect();
    panel.style.position = 'fixed';
    panel.style.zIndex = '200';
    panel.style.top = `${Math.round(rect.bottom + 4)}px`;
    panel.style.left = `${Math.round(rect.left)}px`;
    // Panel hugs the trigger (min 220px) but never grows past 320px, so long
    // option labels ellipsize instead of stretching the dropdown.
    panel.style.width = `${Math.min(Math.max(rect.width, 220), 320)}px`;
    // The CSS rule `.select-panel { min-width: 100% }` is meant for the
    // in-place (unported) panel. Once portaled to <body> with position:fixed,
    // 100% resolves to the VIEWPORT, which would stretch every open dropdown
    // to the full window width — so neutralize it here.
    panel.style.minWidth = '0';
    document.body.appendChild(panel);
    panel.hidden = false;
    el.classList.add('open');
    openSelect = el;
    openPanel = panel;
    openAt = Date.now();
    search.focus({ preventScroll: true });
    highlight(0);
    // Flip upward when the panel would overflow the viewport bottom.
    const pr = panel.getBoundingClientRect();
    if (pr.bottom > window.innerHeight - 8) {
      const h = pr.height;
      panel.style.top = `${Math.max(8, Math.round(rect.top - h - 4))}px`;
    }
  };

  const close = () => {
    panel.hidden = true;
    el.classList.remove('open');
    // Return the panel to its original slot inside the wrapper.
    if (panel.parentElement !== el) el.appendChild(panel);
    panel.style.position = '';
    panel.style.zIndex = '';
    panel.style.top = '';
    panel.style.left = '';
    panel.style.width = '';
    if (openSelect === el) openSelect = null;
    if (openPanel === panel) openPanel = null;
    search.value = '';
    search.blur();
  };
  el._selectClose = close;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (panel.hidden) open();
    else close();
  });

  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      open();
    } else if (e.key === 'Escape') {
      close();
    }
  });

  list.addEventListener('click', (e) => {
    const opt = e.target.closest('.select-option');
    if (!opt) return;
    setValue(opt.dataset.value);
    close();
  });

  search.addEventListener('input', () => renderList(search.value));

  search.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlight(highlightIdx + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlight(highlightIdx - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = list.querySelector('.select-option.highlight') || list.querySelector('.select-option');
      if (item) setValue(item.dataset.value);
      close();
    } else if (e.key === 'Escape') {
      close();
    }
  });

  // Programmatic value changes on the native select (e.g. form reset) stay in sync.
  native.addEventListener('change', syncLabel);

  syncLabel();
}

// Close the open dropdown when clicking anywhere outside it. The panel is
// portaled to <body> while open, so test both the wrapper and the panel.
document.addEventListener('click', (e) => {
  if (openSelect && openPanel && !openSelect.contains(e.target) && !openPanel.contains(e.target)) {
    closeOpenSelect();
  }
});

// A scrolling container (e.g. the modal overlay) can move the trigger while the
// panel is fixed to the viewport — close the dropdown in that case. Scrolling
// inside the panel itself (its option list) is allowed.
document.addEventListener(
  'scroll',
  (e) => {
    if (!openSelect) return;
    if (openPanel && openPanel.contains(e.target)) return;
    // Ignore the scroll the opening sequence itself can trigger (focus,
    // scrollIntoView of the highlighted option) — it would close the panel
    // the instant it appears.
    if (Date.now() - openAt < 300) return;
    closeOpenSelect();
  },
  true
);
window.addEventListener('resize', closeOpenSelect);
