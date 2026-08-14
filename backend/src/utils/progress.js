/**
 * Project progress calculation.
 *
 * Two strategies are provided:
 *
 * 1. completedCountProgress  (default)
 *    progress = completed tasks / total tasks * 100
 *
 * 2. weightedProgress
 *    progress = SUM(task.progress * task.weight) / SUM(task.weight)
 *    Uses `task.weight` when present (allows weighted progress to be enabled
 *    later without schema changes — tasks without a weight get weight 1).
 *
 * The service layer decides which strategy to use via
 * `calculateProjectProgress(tasks, { weighted })`.
 */

const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, n));

function completedCountProgress(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === 'COMPLETED').length;
  return Math.round((done / tasks.length) * 100);
}

function weightedProgress(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return 0;
  const totalWeight = tasks.reduce((sum, t) => sum + (t.weight ?? 1), 0);
  if (totalWeight === 0) return 0;
  const weighted = tasks.reduce(
    (sum, t) => sum + (t.progressPercentage ?? 0) * (t.weight ?? 1),
    0
  );
  return clamp(Math.round(weighted / totalWeight));
}

function calculateProjectProgress(tasks, { weighted = false } = {}) {
  return weighted ? weightedProgress(tasks) : completedCountProgress(tasks);
}

module.exports = {
  calculateProjectProgress,
  completedCountProgress,
  weightedProgress,
};
