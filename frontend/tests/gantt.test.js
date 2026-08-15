// ---------------------------------------------------------------------------
// GanttChart — task stakeholder avatars
//
// Covers the stakeholder-circle rendering added to the Gantt task-name column:
//   - circular profile icons (initials) per task stakeholder
//   - hidden entirely when a task has no stakeholders
//   - overflow "+N" badge beyond 3 stakeholders
//   - tooltip with name (+ role)
//   - deterministic color per stakeholder id (same person, same color)
// ---------------------------------------------------------------------------
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/js/components/ui.js', () => ({
  statusBadge: vi.fn((s) => `<span class="badge">${s}</span>`),
  confirmDialog: vi.fn(),
  toast: vi.fn(),
  priorityChip: vi.fn(),
  riskLevelBadge: vi.fn(),
  progressBar: vi.fn(),
  loadingHtml: vi.fn(),
  openModal: vi.fn(),
}));

import { renderGantt } from '../src/js/components/GanttChart.js';

const PROJECT = {
  id: 1,
  projectCode: 'P1',
  name: 'Demo Project',
  status: 'IN_PROGRESS',
  progressPercentage: 0,
  plannedStartDate: '2026-08-17T00:00:00.000Z',
  plannedEndDate: '2026-08-28T00:00:00.000Z',
};

function task(overrides = {}) {
  return {
    id: 1,
    taskCode: 'P1-001',
    name: 'Build the thing',
    status: 'TODO',
    progressPercentage: 0,
    plannedStartDate: '2026-08-17T00:00:00.000Z',
    plannedEndDate: '2026-08-21T00:00:00.000Z',
    scheduleStatus: 'ON_TRACK',
    dependencies: [],
    stakeholders: [],
    sortOrder: 0,
    ...overrides,
  };
}

function render({ tasks, projects } = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const data = projects
    ? { projects, schedule: { ON_TRACK: 0, AT_RISK: 0, DELAYED: 0 } }
    : { project: PROJECT, tasks, schedule: { ON_TRACK: 0, AT_RISK: 0, DELAYED: 0 } };
  renderGantt(container, data, {});
  return container;
}

const stkOf = (container, taskId, idx = 0) =>
  container.querySelector(`.gantt-row-label[data-task-id="${taskId}"] .gantt-stks .avatar:nth-child(${idx + 1})`);

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('task stakeholder avatars', () => {
  it('renders a circular avatar with the initials for every task stakeholder', () => {
    const container = render({
      tasks: [
        task({
          stakeholders: [
            { stakeholderId: 11, name: 'Wirat Sakorn', email: 'w@x.com', role: 'RESPONSIBLE' },
            { stakeholderId: 12, name: 'Anna Bell', email: 'a@x.com', role: 'ACCOUNTABLE' },
          ],
        }),
      ],
    });

    const avatars = container.querySelectorAll('.gantt-row-label[data-task-id="1"] .gantt-stks .avatar');
    expect(avatars).toHaveLength(2);
    expect(avatars[0].textContent).toBe('WS');
    expect(avatars[1].textContent).toBe('AB');
    expect(avatars[0].classList.contains('avatar-more')).toBe(false);
  });

  it('renders no avatar elements when the task has no stakeholders', () => {
    const container = render({ tasks: [task()] });
    expect(container.querySelector('.gantt-row-label[data-task-id="1"] .avatar')).toBeNull();
    expect(container.querySelector('.gantt-stks')).toBeNull();
  });

  it('shows an overflow "+N" badge beyond 3 stakeholders', () => {
    const container = render({
      tasks: [
        task({
          stakeholders: [11, 12, 13, 14, 15].map((id) => ({
            stakeholderId: id,
            name: `Person ${id}`,
            email: `${id}@x.com`,
            role: 'RESPONSIBLE',
          })),
        }),
      ],
    });

    const avatars = container.querySelectorAll('.gantt-row-label[data-task-id="1"] .gantt-stks .avatar');
    expect(avatars).toHaveLength(4); // 3 initials + "+2"
    expect(avatars[3].classList.contains('avatar-more')).toBe(true);
    expect(avatars[3].textContent).toBe('+2');
  });

  it('puts the stakeholder name and role in the avatar tooltip', () => {
    const container = render({
      tasks: [
        task({
          stakeholders: [{ stakeholderId: 11, name: 'Wirat Sakorn', email: 'w@x.com', role: 'RESPONSIBLE' }],
        }),
      ],
    });
    expect(stkOf(container, 1, 0).title).toContain('Wirat Sakorn');
    expect(stkOf(container, 1, 0).title).toContain('RESPONSIBLE');
  });

  it('uses the same color for the same stakeholder across tasks (deterministic)', () => {
    const container = render({
      tasks: [
        task({
          id: 1,
          stakeholders: [{ stakeholderId: 11, name: 'Wirat Sakorn', email: 'w@x.com', role: 'RESPONSIBLE' }],
        }),
        task({
          id: 2,
          name: 'Second task',
          stakeholders: [{ stakeholderId: 11, name: 'Wirat Sakorn', email: 'w@x.com', role: 'CONSULTED' }],
        }),
      ],
    });
    const a = stkOf(container, 1, 0).style.background;
    const b = stkOf(container, 2, 0).style.background;
    expect(a).toBe(b);
    // tinted background from the palette (jsdom normalizes the 8-digit hex
    // with alpha into rgba(...))
    expect(a).toMatch(/rgba?\(|#[0-9a-fA-F]{6}1f/);
  });

  it('renders avatars in global (all-projects) mode too', () => {
    const container = render({
      projects: [
        {
          project: PROJECT,
          tasks: [
            task({
              stakeholders: [{ stakeholderId: 11, name: 'Wirat Sakorn', email: 'w@x.com', role: 'RESPONSIBLE' }],
            }),
          ],
          schedule: { ON_TRACK: 1, AT_RISK: 0, DELAYED: 0 },
        },
      ],
    });
    expect(stkOf(container, 1, 0).textContent).toBe('WS');
  });
});
