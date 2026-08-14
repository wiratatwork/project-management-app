import { escapeHtml, RISK_LEVEL_COLORS } from '../utils.js';

const LEVELS = [
  { min: 16, level: 'CRITICAL' },
  { min: 8, level: 'HIGH' },
  { min: 4, level: 'MEDIUM' },
  { min: 1, level: 'LOW' },
];

function levelOf(score) {
  return LEVELS.find((l) => score >= l.min)?.level || 'LOW';
}

/**
 * matrix: [{ probability, impact, count }] (open risks)
 */
export function renderRiskMatrix(container, matrix = []) {
  const counts = new Map(matrix.map((m) => [`${m.probability},${m.impact}`, m.count]));
  const PROB_LABELS = { 1: 'Very Low', 2: 'Low', 3: 'Medium', 4: 'High', 5: 'Very High' };

  let cells = '';
  for (let impact = 5; impact >= 1; impact -= 1) {
    cells += `<div class="matrix-label" title="Impact: ${PROB_LABELS[impact]}">I${impact}</div>`;
    for (let probability = 1; probability <= 5; probability += 1) {
      const score = probability * impact;
      const level = levelOf(score);
      const count = counts.get(`${probability},${impact}`) || 0;
      const cellTitle = `P${probability} (${PROB_LABELS[probability]}) × I${impact} (${PROB_LABELS[impact]}) = score ${score}`;
      cells += `<div class="matrix-cell level-${level}" title="${cellTitle}">
        ${count > 0 ? count : ''}
        <span class="cell-score">${score}</span>
      </div>`;
    }
  }

  const header = '<div class="matrix-corner">P ↓</div>' + [1, 2, 3, 4, 5]
    .map((p) => `<div class="matrix-label" title="Probability: ${PROB_LABELS[p]}">P${p}</div>`)
    .join('');

  const legend = Object.entries(RISK_LEVEL_COLORS)
    .map(([level, color]) => `<span class="legend-item"><span class="legend-swatch" style="background:${color}"></span> ${level}</span>`)
    .join('');

  container.innerHTML = `
    <div>
      <div class="risk-matrix">${header}${cells}</div>
      <div class="risk-matrix" style="grid-template-columns:36px repeat(5,minmax(52px,1fr));margin-top:2px">
        <span></span>
        <span class="matrix-label" style="font-size:10.5px">Very Low</span>
        <span class="matrix-label" style="font-size:10.5px">Low</span>
        <span class="matrix-label" style="font-size:10.5px">Medium</span>
        <span class="matrix-label" style="font-size:10.5px">High</span>
        <span class="matrix-label" style="font-size:10.5px">Very High</span>
      </div>
      <div style="margin-top:4px;font-size:11.5px;color:var(--text-muted)">← Probability → &nbsp;·&nbsp; numbers = open risks</div>
      <div class="risk-matrix-legend" style="display:flex;gap:14px;margin-top:8px;font-size:12px;flex-wrap:wrap">${legend}</div>
    </div>`;
}
