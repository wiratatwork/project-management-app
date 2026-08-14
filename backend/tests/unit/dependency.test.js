import { describe, it, expect } from 'vitest';
import { buildGraph, wouldCreateCycle } from '../../src/utils/dependencyGraph';

describe('dependencyGraph', () => {
  it('builds an adjacency map from dependency rows', () => {
    const graph = buildGraph([
      { taskId: 2, dependsOnTaskId: 1 },
      { taskId: 3, dependsOnTaskId: 2 },
      { taskId: 3, dependsOnTaskId: 1 },
    ]);
    expect(graph.get(2)).toEqual([1]);
    expect(graph.get(3)).toEqual([2, 1]);
  });

  it('detects a direct self-dependency (A -> A)', () => {
    const graph = new Map();
    expect(wouldCreateCycle(graph, 1, 1)).toBe(true);
  });

  it('allows a valid new dependency', () => {
    const graph = buildGraph([
      { taskId: 2, dependsOnTaskId: 1 },
      { taskId: 3, dependsOnTaskId: 2 },
    ]);
    // Task 4 depends on task 3: fine.
    expect(wouldCreateCycle(graph, 4, 3)).toBe(false);
  });

  it('detects a direct cycle (A -> B, B -> A)', () => {
    const graph = buildGraph([{ taskId: 1, dependsOnTaskId: 2 }]);
    expect(wouldCreateCycle(graph, 2, 1)).toBe(true);
  });

  it('detects an indirect cycle (A -> B, B -> C, C -> A)', () => {
    const graph = buildGraph([
      { taskId: 1, dependsOnTaskId: 2 },
      { taskId: 2, dependsOnTaskId: 3 },
    ]);
    // Trying to make task 3 depend on task 1 creates: 1 -> 2 -> 3 -> 1
    expect(wouldCreateCycle(graph, 3, 1)).toBe(true);
  });

  it('allows a dependency chain to be extended without a cycle', () => {
    const graph = buildGraph([
      { taskId: 2, dependsOnTaskId: 1 },
      { taskId: 3, dependsOnTaskId: 2 },
    ]);
    // Extend: task 4 depends on 3 (chain 4 -> 3 -> 2 -> 1), no cycle.
    expect(wouldCreateCycle(graph, 4, 3)).toBe(false);
  });

  it('does not mistake unrelated edges for cycles', () => {
    const graph = buildGraph([
      { taskId: 5, dependsOnTaskId: 6 },
      { taskId: 7, dependsOnTaskId: 8 },
    ]);
    expect(wouldCreateCycle(graph, 5, 7)).toBe(false);
  });
});
