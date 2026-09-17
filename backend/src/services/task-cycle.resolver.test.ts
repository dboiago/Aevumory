import { describe, expect, it } from 'vitest';
import { resolveTaskCycles } from './task-cycle.resolver.js';
import type { Task } from '../types/task-domain.types.js';

function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    task_id: 'task-1',
    title: 'Water plants',
    primary_discipline: 'order',
    secondary_disciplines: [],
    source_type: 'core',
    created_at: '2026-01-01T00:00:00Z',
    created_by_user_id: 'participant-1',
    assignment: { scope: 'individual', assigned_user_id: 'participant-1', owner_id: 'participant-1' },
    schedule: { cadence_type: 'one_off', delay_policy: 'none', has_strict_window: false },
    lifecycle: {},
    supports_foothold: false,
    duration_tier: 'quick',
    effort_type: 'physical',
    cognitive_load: 'low',
    ...overrides,
  };
}

describe('resolveTaskCycles', () => {
  it('generates a single cycle for a one-off schedule inside the window', () => {
    const task = baseTask({
      schedule: { cadence_type: 'one_off', series_anchor_date: '2026-01-15', delay_policy: 'none', has_strict_window: false },
    });

    const cycles = resolveTaskCycles(task, { starts_at: '2026-01-01', ends_at: '2026-01-31' });

    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toMatchObject({
      cycle_id: 'task-1:2026-01-15',
      task_id: 'task-1',
      target_date: '2026-01-15',
      status: 'pending',
      responsible_user_id: 'participant-1',
    });
  });

  it('excludes a one-off target date outside the requested window', () => {
    const task = baseTask({
      schedule: { cadence_type: 'one_off', series_anchor_date: '2026-01-15', delay_policy: 'none', has_strict_window: false },
    });

    const cycles = resolveTaskCycles(task, { starts_at: '2026-02-01', ends_at: '2026-02-28' });

    expect(cycles).toHaveLength(0);
  });

  it('rejects a one-off schedule missing series_anchor_date', () => {
    const task = baseTask({
      schedule: { cadence_type: 'one_off', delay_policy: 'none', has_strict_window: false },
    });

    expect(() => resolveTaskCycles(task, { starts_at: '2026-01-01', ends_at: '2026-01-31' })).toThrow();
  });

  it('generates recurring cycles at fixed intervals from the series anchor', () => {
    const task = baseTask({
      schedule: {
        cadence_type: 'interval',
        series_anchor_date: '2026-01-05',
        interval_days: 7,
        delay_policy: 'none',
        has_strict_window: false,
      },
    });

    const cycles = resolveTaskCycles(task, { starts_at: '2026-01-01', ends_at: '2026-01-31' });

    expect(cycles.map((cycle) => cycle.target_date)).toEqual([
      '2026-01-05',
      '2026-01-12',
      '2026-01-19',
      '2026-01-26',
    ]);
  });

  it('generates weekly calendar-anchor cycles on the configured ISO weekday', () => {
    const task = baseTask({
      schedule: {
        cadence_type: 'calendar_anchor',
        calendar_anchor: { unit: 'week', value: 1 }, // Monday
        delay_policy: 'none',
        has_strict_window: false,
      },
    });

    // 2026-01-01 is a Thursday.
    const cycles = resolveTaskCycles(task, { starts_at: '2026-01-01', ends_at: '2026-01-31' });

    expect(cycles.map((cycle) => cycle.target_date)).toEqual([
      '2026-01-05',
      '2026-01-12',
      '2026-01-19',
      '2026-01-26',
    ]);
  });

  it('generates monthly calendar-anchor cycles, skipping months without the configured day', () => {
    const task = baseTask({
      schedule: {
        cadence_type: 'calendar_anchor',
        calendar_anchor: { unit: 'month', value: 31 },
        delay_policy: 'none',
        has_strict_window: false,
      },
    });

    const cycles = resolveTaskCycles(task, { starts_at: '2026-01-01', ends_at: '2026-04-30' });

    // February and April have no 31st.
    expect(cycles.map((cycle) => cycle.target_date)).toEqual(['2026-01-31', '2026-03-31']);
  });

  it('applies a strict window from window_start_time/window_end_time', () => {
    const task = baseTask({
      schedule: {
        cadence_type: 'one_off',
        series_anchor_date: '2026-01-15',
        delay_policy: 'none',
        has_strict_window: true,
        window_start_time: '07:00:00',
        window_end_time: '09:00:00',
      },
    });

    const [cycle] = resolveTaskCycles(task, { starts_at: '2026-01-01', ends_at: '2026-01-31' });

    expect(cycle.window_start).toBe('2026-01-15T07:00:00');
    expect(cycle.window_end).toBe('2026-01-15T09:00:00');
  });

  it('keeps the series anchor immutable across windows regardless of a late completion', () => {
    const task = baseTask({
      schedule: {
        cadence_type: 'interval',
        series_anchor_date: '2026-01-05',
        interval_days: 7,
        delay_policy: 'none',
        has_strict_window: false,
      },
    });

    const firstWindowCycles = resolveTaskCycles(task, { starts_at: '2026-01-01', ends_at: '2026-01-10' });
    expect(firstWindowCycles.map((cycle) => cycle.target_date)).toEqual(['2026-01-05']);

    // Simulate the first cycle being completed nearly a week late. The
    // resolver takes only `task` and `window` as input — it never sees this
    // object — which is what actually guarantees the anchor can't drift.
    const lateCompletedCycle = {
      ...firstWindowCycles[0],
      status: 'satisfied' as const,
      satisfied_at: '2026-01-11T23:00:00Z',
    };
    void lateCompletedCycle;

    const secondWindowCycles = resolveTaskCycles(task, { starts_at: '2026-01-10', ends_at: '2026-01-20' });
    expect(secondWindowCycles.map((cycle) => cycle.target_date)).toEqual(['2026-01-12', '2026-01-19']);
  });
});
