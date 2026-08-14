import { describe, it, expect } from 'vitest';
import { riskScore, riskLevel } from '../../src/utils/riskLevel';

describe('risk scoring', () => {
  it('computes riskScore as probability * impact', () => {
    expect(riskScore(3, 4)).toBe(12);
    expect(riskScore(5, 5)).toBe(25);
    expect(riskScore(1, 1)).toBe(1);
  });

  it('classifies scores into levels', () => {
    expect(riskLevel(1)).toBe('LOW');
    expect(riskLevel(2)).toBe('LOW');
    expect(riskLevel(4)).toBe('MEDIUM');
    expect(riskLevel(6)).toBe('MEDIUM');
    expect(riskLevel(8)).toBe('HIGH');
    expect(riskLevel(12)).toBe('HIGH');
    expect(riskLevel(16)).toBe('CRITICAL');
    expect(riskLevel(20)).toBe('CRITICAL');
    expect(riskLevel(25)).toBe('CRITICAL');
  });

  it('maps every possible probability x impact cell', () => {
    const cells = [];
    for (let p = 1; p <= 5; p += 1) {
      for (let i = 1; i <= 5; i += 1) {
        cells.push(riskScore(p, i));
      }
    }
    const levels = cells.map(riskLevel);
    expect(levels).toContain('LOW');
    expect(levels).toContain('MEDIUM');
    expect(levels).toContain('HIGH');
    expect(levels).toContain('CRITICAL');
  });
});
