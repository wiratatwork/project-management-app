import { describe, it, expect } from 'vitest';
import {
  calculateProjectProgress,
  completedCountProgress,
  weightedProgress,
} from '../../src/utils/progress';

const task = (status, progress = 0, weight) => ({
  status,
  progressPercentage: progress,
  ...(weight !== undefined ? { weight } : {}),
});

describe('project progress calculation', () => {
  it('returns 0 for an empty task list', () => {
    expect(calculateProjectProgress([])).toBe(0);
  });

  it('computes completed-count progress (default strategy)', () => {
    const tasks = [
      task('COMPLETED'),
      task('IN_PROGRESS', 40),
      task('TODO'),
      task('COMPLETED'),
    ];
    expect(calculateProjectProgress(tasks)).toBe(50); // 2/4 * 100
  });

  it('returns 100 when all tasks are completed', () => {
    expect(completedCountProgress([task('COMPLETED'), task('COMPLETED')])).toBe(100);
  });

  it('treats BLOCKED tasks as incomplete', () => {
    const tasks = [task('COMPLETED'), task('BLOCKED', 10)];
    expect(calculateProjectProgress(tasks)).toBe(50);
  });

  it('computes weighted progress when enabled', () => {
    const tasks = [
      task('IN_PROGRESS', 50, 2),
      task('IN_PROGRESS', 100, 2),
      task('TODO', 0, 1),
    ];
    // (50*2 + 100*2 + 0*1) / (2+2+1) = 300 / 5 = 60
    expect(weightedProgress(tasks)).toBe(60);
  });

  it('clamps weighted progress to 100', () => {
    const tasks = [task('IN_PROGRESS', 200, 1)];
    expect(weightedProgress(tasks)).toBe(100);
  });

  it('rounds progress to an integer', () => {
    const tasks = [task('COMPLETED'), task('COMPLETED'), task('TODO')];
    expect(calculateProjectProgress(tasks)).toBe(67); // 2/3 = 66.66 -> 67
  });
});
