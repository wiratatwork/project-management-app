// ---------------------------------------------------------------------------
// Global Gantt filtering (src/js/pages/ganttFilter.js)
//
// This is the core of the Stakeholders -> Gantt deep-link: given a person,
// keep only their tasks (and the projects those live in) so the chart shows
// which projects/tasks they touch and which are at-risk / already delayed.
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';

import { filterGanttGroups, scheduleOf, personSummaryHtml } from '../src/js/pages/ganttFilter.js';

function group(id, tasks) {
  return { project: { id, name: `Project ${id}` }, tasks, schedule: { ON_TRACK: 0, AT_RISK: 0, DELAYED: 0 } };
}

function task(id, { status = 'TODO', scheduleStatus = 'ON_TRACK', stakeholders = [] } = {}) {
  return { id, status, scheduleStatus, stakeholders };
}

const PROJECTS = [
  group(1, [
    task(1, { stakeholders: [{ stakeholderId: 100, name: 'Anna' }] }),
    task(2, { scheduleStatus: 'AT_RISK', stakeholders: [{ stakeholderId: 200, name: 'Bob' }] }),
  ]),
  group(2, [
    task(3, { status: 'IN_PROGRESS', scheduleStatus: 'DELAYED', stakeholders: [{ stakeholderId: 100, name: 'Anna' }] }),
    task(4, { stakeholders: [{ stakeholderId: 300, name: 'Cara' }] }),
  ]),
];

describe('filterGanttGroups', () => {
  it('keeps everything when no filters are set', () => {
    const out = filterGanttGroups(PROJECTS, {});
    expect(out).toHaveLength(2);
    expect(out[0].tasks.map((t) => t.id)).toEqual([1, 2]);
    expect(out[1].tasks.map((t) => t.id)).toEqual([3, 4]);
  });

  it('keeps only the tasks of the selected stakeholder across projects', () => {
    const out = filterGanttGroups(PROJECTS, { stakeholderId: '100' });
    expect(out).toHaveLength(2); // Anna has tasks in both projects
    expect(out[0].project.id).toBe(1);
    expect(out[0].tasks.map((t) => t.id)).toEqual([1]);
    expect(out[1].project.id).toBe(2);
    expect(out[1].tasks.map((t) => t.id)).toEqual([3]);
  });

  it('drops projects where the person has no tasks', () => {
    const out = filterGanttGroups(PROJECTS, { stakeholderId: '200' });
    expect(out).toHaveLength(1); // only project 1 (Bob is only in task 2)
    expect(out[0].project.id).toBe(1);
    expect(out[0].tasks.map((t) => t.id)).toEqual([2]);
  });

  it('returns no groups when the person has no tasks at all', () => {
    expect(filterGanttGroups(PROJECTS, { stakeholderId: '999' })).toEqual([]);
  });

  it('combines the stakeholder filter with project and status filters', () => {
    const byProject = filterGanttGroups(PROJECTS, { stakeholderId: '100', projectId: '2' });
    expect(byProject).toHaveLength(1);
    expect(byProject[0].tasks.map((t) => t.id)).toEqual([3]);

    const byStatus = filterGanttGroups(PROJECTS, { stakeholderId: '100', status: 'IN_PROGRESS' });
    expect(byStatus).toHaveLength(1);
    expect(byStatus[0].tasks.map((t) => t.id)).toEqual([3]);
  });

  it('preserves the full task count of each project in _total', () => {
    const out = filterGanttGroups(PROJECTS, { stakeholderId: '100' });
    expect(out.map((g) => g._total)).toEqual([2, 2]);
  });

  it('keeps an explicitly filtered project even when it ends up empty', () => {
    const out = filterGanttGroups(PROJECTS, { projectId: '2', stakeholderId: '200' });
    expect(out).toHaveLength(1);
    expect(out[0].project.id).toBe(2);
    expect(out[0].tasks).toEqual([]);
  });
});

describe('scheduleOf', () => {
  it('counts schedule health across the (already filtered) groups', () => {
    const out = filterGanttGroups(PROJECTS, { stakeholderId: '100' });
    expect(scheduleOf(out)).toEqual({ ON_TRACK: 1, AT_RISK: 0, DELAYED: 1 });
  });

  it('returns zeros for an empty group list', () => {
    expect(scheduleOf([])).toEqual({ ON_TRACK: 0, AT_RISK: 0, DELAYED: 0 });
  });
});

describe('personSummaryHtml (option A — one-line summary)', () => {
  function parse(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div;
  }

  it('shows the task and project counts', () => {
    const root = parse(personSummaryHtml({ taskCount: 8, projectCount: 1, schedule: { ON_TRACK: 4, AT_RISK: 4, DELAYED: 0 } }));
    expect(root.querySelector('.stk-summary-counts').textContent).toBe('8 งาน · 1 โปรเจกต์');
  });

  it('highlights at-risk in orange when > 0 and keeps it muted when 0', () => {
    const risky = parse(personSummaryHtml({ taskCount: 8, projectCount: 1, schedule: { ON_TRACK: 4, AT_RISK: 4, DELAYED: 0 } }));
    const atRiskSpan = risky.querySelectorAll('.stk-summary-sched > span')[0];
    expect(atRiskSpan.classList.contains('at-risk')).toBe(true);
    expect(atRiskSpan.classList.contains('ok')).toBe(false);
    expect(atRiskSpan.textContent).toContain('4');

    const none = parse(personSummaryHtml({ taskCount: 8, projectCount: 1, schedule: { ON_TRACK: 8, AT_RISK: 0, DELAYED: 0 } }));
    const atRiskNone = none.querySelectorAll('.stk-summary-sched > span')[0];
    expect(atRiskNone.classList.contains('ok')).toBe(true);
    expect(atRiskNone.textContent).toContain('0');
  });

  it('highlights delayed in red when > 0', () => {
    const root = parse(personSummaryHtml({ taskCount: 3, projectCount: 1, schedule: { ON_TRACK: 1, AT_RISK: 1, DELAYED: 1 } }));
    const delayedSpan = root.querySelectorAll('.stk-summary-sched > span')[1];
    expect(delayedSpan.classList.contains('delayed')).toBe(true);
    expect(delayedSpan.classList.contains('ok')).toBe(false);
    expect(delayedSpan.textContent).toContain('delay แล้ว');
    expect(delayedSpan.textContent).toContain('1');
  });

  it('defaults counts to zero when schedule is missing', () => {
    const root = parse(personSummaryHtml({ taskCount: 2, projectCount: 1 }));
    expect(root.querySelector('.stk-summary-counts').textContent).toBe('2 งาน · 1 โปรเจกต์');
    expect(root.querySelectorAll('.stk-summary-sched > span')[0].textContent).toContain('0');
  });
});
