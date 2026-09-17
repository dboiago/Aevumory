import { describe, expect, it } from 'vitest';
import { applyModifiers, computeBaseYield, computeReasonYield, scaleYield } from './reward-yield.engine.js';
import type { Task } from '../types/task-domain.types.js';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    task_id: 'task-1',
    title: 'Water plants',
    primary_discipline: 'order',
    secondary_disciplines: ['care'],
    source_type: 'core',
    created_at: '2026-01-01T00:00:00Z',
    created_by_user_id: 'participant-1',
    assignment: { scope: 'individual', assigned_user_id: 'participant-1', owner_id: 'participant-1' },
    schedule: { cadence_type: 'one_off', series_anchor_date: '2026-01-05', delay_policy: 'none', has_strict_window: false },
    lifecycle: {},
    supports_foothold: true,
    duration_tier: 'moderate',
    effort_type: 'physical',
    cognitive_load: 'low',
    ...overrides,
  };
}

describe('computeBaseYield', () => {
  it('derives XP 1:1 from duration_tier base minutes (CORE_BASELINE.md §3)', () => {
    const yieldValue = computeBaseYield(makeTask({ duration_tier: 'moderate' }));
    expect(yieldValue.primary_xp).toBe(15);
  });

  it('derives Credits at 10 minutes = 1.0 Credit, to one decimal (CORE_BASELINE.md §7)', () => {
    expect(computeBaseYield(makeTask({ duration_tier: 'quick' })).credits_earned).toBe(0.5);
    expect(computeBaseYield(makeTask({ duration_tier: 'heavy' })).credits_earned).toBe(6);
  });

  it('attributes yield to the task\'s own primary_discipline and awards no secondary XP in Phase 3', () => {
    const yieldValue = computeBaseYield(makeTask({ primary_discipline: 'motion' }));
    expect(yieldValue.primary_discipline).toBe('motion');
    expect(yieldValue.secondary_yields).toEqual([]);
  });
});

describe('computeReasonYield (reserved for a future Inquiry mechanic — not called by pruneCycle today)', () => {
  it('attributes the avoided task\'s base-yield magnitude to the reason Discipline with zero Credits', () => {
    const task = makeTask({ primary_discipline: 'motion', duration_tier: 'sustained' });
    const yieldValue = computeReasonYield(task);

    expect(yieldValue.primary_discipline).toBe('reason');
    expect(yieldValue.primary_xp).toBe(30);
    expect(yieldValue.credits_earned).toBe(0);
  });
});

describe('scaleYield', () => {
  it('scales every numeric component by the given ratio, rounded to one decimal', () => {
    const base = computeBaseYield(makeTask({ duration_tier: 'quick' }));
    const scaled = scaleYield(base, 0.35);

    expect(scaled.primary_xp).toBe(1.8); // 5 * 0.35 = 1.75 -> rounds to 1.8
    expect(scaled.credits_earned).toBe(0.2); // 0.5 * 0.35 = 0.175 -> rounds to 0.2
  });

  it('scales secondary yields alongside the primary yield', () => {
    const scaled = scaleYield(
      { primary_discipline: 'order', primary_xp: 10, secondary_yields: [{ discipline: 'care', xp: 4 }], credits_earned: 1 },
      0.5,
    );

    expect(scaled.secondary_yields).toEqual([{ discipline: 'care', xp: 2 }]);
  });
});

describe('applyModifiers', () => {
  it('is a no-op extension point in Phase 3', () => {
    const base = computeBaseYield(makeTask());
    expect(applyModifiers(base)).toEqual(base);
  });
});
