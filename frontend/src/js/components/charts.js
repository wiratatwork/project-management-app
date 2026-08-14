import { escapeHtml } from '../utils.js';

// ---------------------------------------------------------------------------
// Donut chart (SVG stroke segments)
// ---------------------------------------------------------------------------

export function renderDonut(container, items) {
  const total = items.reduce((sum, i) => sum + (i.value || 0), 0);
  if (total === 0) {
    container.innerHTML = '<div class="empty-state">No data</div>';
    return;
  }

  const size = 150;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  const segments = items
    .filter((i) => i.value > 0)
    .map((i) => {
      const len = (i.value / total) * c;
      const seg = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
        stroke="${i.color || '#94a3b8'}" stroke-width="${stroke}"
        stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}"
        transform="rotate(-90 ${size / 2} ${size / 2})" />`;
      offset += len;
      return seg;
    })
    .join('');

  const legend = items
    .map(
      (i) => `<span class="legend-item">
        <span class="legend-swatch" style="background:${i.color || '#94a3b8'}"></span>
        ${escapeHtml(i.label)} (${i.value})</span>`
    )
    .join('');

  container.innerHTML = `
    <div class="chart-box">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="align-self:center">
        ${segments}
        <text x="50%" y="47%" text-anchor="middle" font-size="22" font-weight="700" style="fill:var(--text)">${total}</text>
        <text x="50%" y="58%" text-anchor="middle" font-size="10" style="fill:var(--text-muted)">total</text>
      </svg>
      <div class="chart-legend">${legend}</div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Horizontal bar chart (divs)
// ---------------------------------------------------------------------------

export function renderBars(container, items, { valueSuffix = '' } = {}) {
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="empty-state">No data</div>';
    return;
  }
  const max = Math.max(...items.map((i) => i.value || 0), 1);
  const rows = items
    .map((i) => {
      const pct = Math.round(((i.value || 0) / max) * 100);
      return `<div class="bar-row">
        <div class="bar-label" title="${escapeHtml(i.label)}">${escapeHtml(i.label)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${i.color || '#4f46e5'}"></div></div>
        <div class="bar-value">${i.value}${escapeHtml(valueSuffix)}</div>
      </div>`;
    })
    .join('');
  container.innerHTML = `<div class="bar-chart">${rows}</div>`;
}
