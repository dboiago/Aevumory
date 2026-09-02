import { describe, expect, it } from 'vitest';
import { resolveEventOccurrences } from './recurrence.resolver';
import type { HouseholdEvent } from '../types/temporal-domain.types';

const timestamps = {
  created_at: '2026-09-02T00:00:00Z',
  updated_at: '2026-09-02T00:00:00Z',
};

function timedEvent(overrides: Partial<HouseholdEvent> = {}): HouseholdEvent {
  return {
    event_id: 'event-1',
    source_id: 'local',
    title: 'Event',
    status: 'active',
    timezone: 'America/Toronto',
    relevance: 'ordinary',
    significance: 'normal',
    schedule: {
      kind: 'timed',
      local_start: '2026-03-01T09:00:00',
      local_end: '2026-03-01T10:00:00',
    },
    ...timestamps,
    ...overrides,
  };
}

describe('resolveEventOccurrences', () => {
  it('resolves a one-off timed event using its event timezone', () => {
    const event = timedEvent();

    const occurrences = resolveEventOccurrences(event, {
      starts_at: '2026-03-01T00:00:00Z',
      ends_at: '2026-03-02T00:00:00Z',
    });

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].starts_at).toBe('2026-03-01T14:00:00Z');
    expect(occurrences[0].ends_at).toBe('2026-03-01T15:00:00Z');
  });

  it('preserves local recurrence time across DST', () => {
    const event = timedEvent({
      schedule: {
        kind: 'timed',
        local_start: '2026-03-01T09:00:00',
        local_end: '2026-03-01T10:00:00',
      },
      recurrence: { frequency: 'weekly', interval: 1 },
    });

    const occurrences = resolveEventOccurrences(event, {
      starts_at: '2026-03-01T00:00:00Z',
      ends_at: '2026-03-16T00:00:00Z',
    });

    expect(occurrences.map((o) => o.starts_at)).toEqual([
      '2026-03-01T14:00:00Z',
      '2026-03-08T13:00:00Z',
      '2026-03-15T13:00:00Z',
    ]);
  });

  it('resolves weekly weekday sets from the anchored week', () => {
    const event = timedEvent({
      recurrence: {
        frequency: 'weekly',
        interval: 1,
        by_weekday: [1, 3, 5],
      },
    });

    const occurrences = resolveEventOccurrences(event, {
      starts_at: '2026-03-01T00:00:00Z',
      ends_at: '2026-03-09T00:00:00Z',
    });

    expect(occurrences.map((o) => o.local_start_date)).toEqual([
      '2026-03-02',
      '2026-03-04',
      '2026-03-06',
    ]);
  });

  it('resolves multi-day all-day recurrence without manufacturing timestamps', () => {
    const event: HouseholdEvent = {
      event_id: 'event-2',
      source_id: 'local',
      title: 'Conference',
      status: 'active',
      timezone: 'America/Toronto',
      relevance: 'meaningful',
      significance: 'high',
      schedule: {
        kind: 'all_day',
        local_start_date: '2026-09-01',
        local_end_date: '2026-09-03',
      },
      recurrence: { frequency: 'weekly', interval: 1 },
      ...timestamps,
    };

    const occurrences = resolveEventOccurrences(event, {
      starts_at: '2026-09-07T00:00:00Z',
      ends_at: '2026-09-10T00:00:00Z',
    });

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].starts_at).toBeUndefined();
    expect(occurrences[0].ends_at).toBeUndefined();
    expect(occurrences[0].local_start_date).toBe('2026-09-08');
    expect(occurrences[0].local_end_date).toBe('2026-09-10');
  });

  it('rejects an invalid recurrence interval', () => {
    expect(() => resolveEventOccurrences(timedEvent({
      recurrence: { frequency: 'daily', interval: 0 },
    }), {
      starts_at: '2026-03-01T00:00:00Z',
      ends_at: '2026-03-02T00:00:00Z',
    })).toThrow('positive integer');
  });
});
