import { escapeHtml } from '../utils.js';

// ---------------------------------------------------------------------------
// Shared circular profile avatars — initials on a tinted circle, colored
// deterministically per person id (same person keeps the same color across
// tasks, risks, projects and pages).
//
// Used by: Gantt task rows, the Tasks table (stakeholders) and the Risks
// tables (owner).
// ---------------------------------------------------------------------------

const AVATAR_COLORS = ['#4f46e5', '#0ea5e9', '#16a34a', '#d97706', '#dc2626', '#7c3aed'];

/** "Wirat Sakorn" -> "WS" (first letters of the first two words). */
export function initialsOf(name) {
  return (name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * people — [{ stakeholderId|id, name, role? }]: a task's stakeholders or a
 * risk's owner. Returns '' when nobody is provided.
 *
 * Renders up to `max` overlapping circles; the remainder collapses into a
 * "+N" badge. The group and every circle carry tooltips with name (+ role).
 */
export function avatarGroup(people, { max = 3, size = '' } = {}) {
  const list = (people || []).filter((p) => p && p.name);
  if (list.length === 0) return '';
  const sizeClass = size ? ` avatar-${size}` : '';
  const shown = list.slice(0, max);
  const extra = list.length - shown.length;
  const circles = shown
    .map((p) => {
      const c = AVATAR_COLORS[(p.stakeholderId ?? p.id ?? 0) % AVATAR_COLORS.length];
      return `<span class="avatar${sizeClass}" style="background:${c}1f;color:${c}" title="${escapeHtml(`${p.name}${p.role ? ` — ${p.role}` : ''}`)}">${escapeHtml(initialsOf(p.name))}</span>`;
    })
    .join('');
  const names = list.map((p) => `${p.name}${p.role ? ` (${p.role})` : ''}`).join('\n');
  return `<span class="avatar-group" title="${escapeHtml(names)}">${circles}${extra > 0 ? `<span class="avatar avatar-more${sizeClass}" title="${extra} more">+${extra}</span>` : ''}</span>`;
}
