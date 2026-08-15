// ---------------------------------------------------------------------------
// Shared avatar component (src/js/components/avatars.js)
//
// Used by the Gantt task rows, the Tasks table (stakeholders) and the Risks
// tables (owner). Covers: initials, empty input, overflow "+N" badge,
// tooltip with name + role, deterministic color per person id, small size.
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';

import { avatarGroup, initialsOf } from '../src/js/components/avatars.js';

function parse(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

describe('initialsOf', () => {
  it('takes the first letters of the first two words', () => {
    expect(initialsOf('Wirat Sakorn')).toBe('WS');
    expect(initialsOf('Anna Bell')).toBe('AB');
  });

  it('handles single words, extra whitespace and empty/missing names', () => {
    expect(initialsOf('Buffy')).toBe('B');
    expect(initialsOf('  Anna   Bell  ')).toBe('AB');
    expect(initialsOf('')).toBe('?');
    expect(initialsOf(null)).toBe('?');
  });
});

describe('avatarGroup', () => {
  it('returns an empty string when nobody is provided', () => {
    expect(avatarGroup([])).toBe('');
    expect(avatarGroup(undefined)).toBe('');
    expect(avatarGroup(null)).toBe('');
    expect(avatarGroup([null, { name: '' }])).toBe('');
  });

  it('renders one circle per person with their initials', () => {
    const root = parse(
      avatarGroup([
        { stakeholderId: 11, name: 'Wirat Sakorn', role: 'RESPONSIBLE' },
        { stakeholderId: 12, name: 'Anna Bell', role: 'ACCOUNTABLE' },
      ])
    );
    const circles = root.querySelectorAll('.avatar');
    expect(circles).toHaveLength(2);
    expect(circles[0].textContent).toBe('WS');
    expect(circles[1].textContent).toBe('AB');
    expect(root.querySelector('.avatar-group')).toBeTruthy();
  });

  it('collapses people beyond max into a "+N" badge', () => {
    const people = [11, 12, 13, 14, 15].map((id) => ({ stakeholderId: id, name: `Person ${id}` }));
    const root = parse(avatarGroup(people)); // default max = 3
    const circles = root.querySelectorAll('.avatar');
    expect(circles).toHaveLength(4); // 3 initials + "+2"
    expect(circles[3].classList.contains('avatar-more')).toBe(true);
    expect(circles[3].textContent).toBe('+2');
  });

  it('adds the role to each circle tooltip and names to the group tooltip', () => {
    const root = parse(avatarGroup([{ stakeholderId: 11, name: 'Wirat Sakorn', role: 'RESPONSIBLE' }]));
    expect(root.querySelector('.avatar').title).toContain('Wirat Sakorn');
    expect(root.querySelector('.avatar').title).toContain('RESPONSIBLE');
    expect(root.querySelector('.avatar-group').title).toContain('Wirat Sakorn (RESPONSIBLE)');
  });

  it('uses the same color for the same person id (stakeholderId or id)', () => {
    const a = parse(avatarGroup([{ stakeholderId: 11, name: 'Wirat Sakorn' }])).querySelector('.avatar').style.background;
    const b = parse(avatarGroup([{ stakeholderId: 11, name: 'Wirat Sakorn' }])).querySelector('.avatar').style.background;
    const c = parse(avatarGroup([{ id: 11, name: 'Wirat Sakorn' }])).querySelector('.avatar').style.background;
    expect(a).toBe(b);
    expect(a).toBe(c);
    expect(a).toMatch(/rgba?\(|#[0-9a-fA-F]{6}1f/); // tinted palette color
  });

  it('supports the small (avatar-sm) size variant', () => {
    const root = parse(avatarGroup([{ id: 1, name: 'Buffy' }], { size: 'sm' }));
    expect(root.querySelector('.avatar').classList.contains('avatar-sm')).toBe(true);
  });
});
