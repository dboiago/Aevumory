import { describe, expect, it } from 'vitest';
import { sleepsBetween, sleepsLabel } from './countdown';

describe('countdown sleeps', () => {
  it('counts whole nights between dates', () => {
    expect(sleepsBetween('2026-10-20', '2026-10-21')).toBe(1);
    expect(sleepsBetween('2026-10-20', '2026-12-25')).toBe(66);
    expect(sleepsBetween('2026-10-20', '2026-10-20')).toBe(0);
  });

  it('labels today and a single sleep in kid words', () => {
    expect(sleepsLabel(0)).toBe('Today!');
    expect(sleepsLabel(1)).toBe('1 sleep');
    expect(sleepsLabel(7)).toBe('7 sleeps');
  });
});
