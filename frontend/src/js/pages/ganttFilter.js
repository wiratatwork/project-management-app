// ---------------------------------------------------------------------------
// Pure helpers for the global Gantt page — extracted so the filtering rules
// can be unit-tested without mounting the whole page (and reused when the
// Gantt is deep-linked from the Stakeholders list with ?stakeholder=<id>).
//
// groups   — [{ project, tasks, schedule }] from /api/gantt
// filters  — { projectId?, stakeholderId?, status? } (string values from UI)
// ---------------------------------------------------------------------------

export function filterGanttGroups(projects, filters = {}) {
  return projects
    .map((g) => {
      let tasks = g.tasks;
      if (filters.projectId) {
        if (g.project.id !== Number(filters.projectId)) return null;
      }
      if (filters.stakeholderId) {
        tasks = tasks.filter((t) => t.stakeholders.some((s) => s.stakeholderId === Number(filters.stakeholderId)));
      }
      if (filters.status) {
        tasks = tasks.filter((t) => t.status === filters.status);
      }
      // Drop projects that ended up with nothing — unless the project filter
      // explicitly asked for this project (then show it even when empty).
      if (tasks.length === 0 && !(filters.projectId && g.project.id === Number(filters.projectId))) return null;
      return { ...g, tasks, _total: g.tasks.length };
    })
    .filter(Boolean);
}

export function scheduleOf(groups) {
  return groups.reduce(
    (acc, g) => {
      g.tasks.forEach((t) => {
        acc[t.scheduleStatus] += 1;
      });
      return acc;
    },
    { ON_TRACK: 0, AT_RISK: 0, DELAYED: 0 }
  );
}

/**
 * Compact per-person summary line for the Gantt filter bar (shown next to the
 * person chip when a stakeholder filter is active):
 *
 *   [WS Wirat Sakorn ✕]  · 8 งาน · 1 โปรเจกต์  · ● เสี่ยง 4 · ● delay แล้ว 0
 *
 * The at-risk / delayed counts turn orange / red (and use the matching dot
 * color) only when they are > 0; otherwise they render muted.
 */
export function personSummaryHtml({ taskCount = 0, projectCount = 0, schedule = { ON_TRACK: 0, AT_RISK: 0, DELAYED: 0 } } = {}) {
  const dot = (color) => `<span class="badge-dot" style="background:${color}"></span>`;
  const atRisk = schedule.AT_RISK ?? 0;
  const delayed = schedule.DELAYED ?? 0;
  return `<span class="stk-summary">
    <span class="stk-summary-counts">${taskCount} งาน · ${projectCount} โปรเจกต์</span>
    <span class="stk-summary-sched">
      <span class="${atRisk > 0 ? 'at-risk' : 'ok'}">${dot(atRisk > 0 ? '#d97706' : '#94a3b8')} เสี่ยง ${atRisk}</span>
      <span class="${delayed > 0 ? 'delayed' : 'ok'}">${dot(delayed > 0 ? '#dc2626' : '#94a3b8')} delay แล้ว ${delayed}</span>
    </span>
  </span>`;
}
