/**
 * Task dependency graph utilities.
 *
 * A dependency row (taskId, dependsOnTaskId) means "taskId can only start
 * after dependsOnTaskId finished". The graph maps taskId -> [taskIds it
 * depends on].
 *
 * Constraints enforced by the service layer using these helpers:
 *  - a task may not depend on itself (A -> A)
 *  - dependencies must not form a cycle (A -> B -> C -> A)
 */

/**
 * Build an adjacency map: taskId -> [ids it depends on].
 * @param {Array<{taskId: number, dependsOnTaskId: number}>} rows
 * @returns {Map<number, number[]>}
 */
function buildGraph(rows) {
  const graph = new Map();
  for (const row of rows) {
    const deps = graph.get(row.taskId) || [];
    deps.push(row.dependsOnTaskId);
    graph.set(row.taskId, deps);
  }
  return graph;
}

/**
 * Returns true when adding a dependency `target -> start` (i.e. the task
 * `start` will depend on `target`) would create a cycle.
 *
 * A cycle exists if `target` transitively depends on `start`: walking from
 * `target` along its dependency edges and reaching `start`.
 *
 * @param {Map<number, number[]>} graph current graph
 * @param {number} start task that would get the new dependency
 * @param {number} target candidate dependency of `start`
 * @returns {boolean}
 */
function wouldCreateCycle(graph, start, target) {
  if (start === target) return true; // self-dependency
  const visited = new Set();
  const stack = [target];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === start) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    for (const dep of graph.get(node) || []) {
      stack.push(dep);
    }
  }
  return false;
}

module.exports = { buildGraph, wouldCreateCycle };
