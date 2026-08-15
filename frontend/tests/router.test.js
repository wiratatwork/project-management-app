// ---------------------------------------------------------------------------
// Hash router — query-string params (deep links like #/gantt?stakeholder=331)
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';

import { getCurrentRoute } from '../src/js/router.js';

describe('getCurrentRoute', () => {
  it('parses query params into route.params', () => {
    location.hash = '#/gantt?stakeholder=331';
    const route = getCurrentRoute();
    expect(route.name).toBe('gantt');
    expect(route.page).toBe('GanttPage');
    expect(route.params.stakeholder).toBe('331');
  });

  it('parses multiple query params', () => {
    location.hash = '#/gantt?stakeholder=331&status=TODO';
    const route = getCurrentRoute();
    expect(route.params).toEqual({ stakeholder: '331', status: 'TODO' });
  });

  it('keeps path segments working with a query string', () => {
    location.hash = '#/projects/5?from=stakeholders';
    const route = getCurrentRoute();
    expect(route.name).toBe('projectDetail');
    expect(route.params.id).toBe('5');
    expect(route.params.from).toBe('stakeholders');
  });

  it('returns empty params when there is no query string', () => {
    location.hash = '#/dashboard';
    expect(getCurrentRoute().params).toEqual({});
    location.hash = '#/gantt';
    expect(getCurrentRoute().params).toEqual({});
  });
});
