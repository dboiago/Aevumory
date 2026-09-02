import { describe, expect, it } from 'vitest';
import { InMemoryTemporalRepository } from '../persistence/temporal.repository.memory';
import type { HouseholdEvent } from '../types/temporal-domain.types';
import { DefaultTemporalService } from './temporal.service';

describe('DefaultTemporalService.listOccurrencesInWindow', () => {
  const timestamps = {
    created_at: '2026-09-02T00:00:00Z',
    updated_at: '2026-09-02T00:00:00Z',
  };

  it('resolves recurring events on demand', async () => {
    const repository = new InMemoryTemporalRepository();
    const service = new DefaultTemporalService(repository);

    const event: HouseholdEvent = {
      event_id: 'event-recurring',
      source_id: 'local',
      title: 'Weekly practice',
      status: 'active',
      timezone: 'America/Toronto',
      relevance: 'ordinary',
      significance: 'normal',
      schedule: {
        kind: 'timed',
        local_start: '2026-09-01T18:00:00',
        local_end: '2026-09-01T19:00:00',
      },
      recurrence: {
        frequency: 'weekly',
        interval: 1,
        by_weekday: [2],
      },
      ...timestamps,
    };

    await repository.saveEvent(event);

    const occurrences = await service.listOccurrencesInWindow({
      starts_at: '2026-09-07T00:00:00Z',
      ends_at: '2026-09-15T00:00:00Z',
    });

    expect(occurrences.map((occurrence) => occurrence.local_start_date))
      .toEqual(['2026-09-08', '2026-09-15']);
  });

  it('lets persisted recurrence instances override generated instances', async () => {
    const repository = new InMemoryTemporalRepository();
    const service = new DefaultTemporalService(repository);

    const event: HouseholdEvent = {
      event_id: 'event-recurring',
      source_id: 'local',
      title: 'Weekly practice',
      status: 'active',
      timezone: 'America/Toronto',
      relevance: 'ordinary',
      significance: 'normal',
      schedule: {
        kind: 'timed',
        local_start: '2026-09-01T18:00:00',
        local_end: '2026-09-01T19:00:00',
      },
      recurrence: {
        frequency: 'weekly',
        interval: 1,
        by_weekday: [2],
      },
      ...timestamps,
    };

    await repository.saveEvent(event);
    await repository.saveOccurrence({
      occurrence_id: 'provider-occurrence-2026-09-08',
      event_id: event.event_id,
      starts_at: '2026-09-08T23:00:00Z',
      ends_at: '2026-09-09T00:00:00Z',
      local_start_date: '2026-09-08',
      local_end_date: '2026-09-08',
      timezone: event.timezone,
      recurrence_instance_key: '2026-09-08T18:00:00',
      status: 'scheduled',
      ...timestamps,
    });

    const occurrences = await service.listOccurrencesInWindow({
      starts_at: '2026-09-07T00:00:00Z',
      ends_at: '2026-09-15T00:00:00Z',
    });

    expect(occurrences).toHaveLength(2);
    expect(occurrences[0].occurrence_id).toBe('provider-occurrence-2026-09-08');
    expect(occurrences[0].starts_at).toBe('2026-09-08T23:00:00Z');
    expect(occurrences[1].occurrence_id).toBe('event-recurring:2026-09-15T18:00:00');
  });

  it('lets a persisted cancellation suppress a generated recurrence instance', async () => {
    const repository = new InMemoryTemporalRepository();
    const service = new DefaultTemporalService(repository);

    const event: HouseholdEvent = {
      event_id: 'event-recurring',
      source_id: 'local',
      title: 'Weekly practice',
      status: 'active',
      timezone: 'America/Toronto',
      relevance: 'ordinary',
      significance: 'normal',
      schedule: {
        kind: 'timed',
        local_start: '2026-09-01T18:00:00',
        local_end: '2026-09-01T19:00:00',
      },
      recurrence: {
        frequency: 'weekly',
        interval: 1,
        by_weekday: [2],
      },
      ...timestamps,
    };

    await repository.saveEvent(event);
    await repository.saveOccurrence({
      occurrence_id: 'cancelled-provider-occurrence',
      event_id: event.event_id,
      local_start_date: '2026-09-08',
      local_end_date: '2026-09-08',
      timezone: event.timezone,
      recurrence_instance_key: '2026-09-08T18:00:00',
      status: 'cancelled',
      ...timestamps,
    });

    const occurrences = await service.listOccurrencesInWindow({
      starts_at: '2026-09-07T00:00:00Z',
      ends_at: '2026-09-15T00:00:00Z',
    });

    expect(occurrences.map((occurrence) => occurrence.local_start_date))
      .toEqual(['2026-09-15']);
  });

  it('treats persisted occurrences as authoritative for one-off events', async () => {
    const repository = new InMemoryTemporalRepository();
    const service = new DefaultTemporalService(repository);

    const event: HouseholdEvent = {
      event_id: 'event-one-off',
      source_id: 'local',
      title: 'Dentist',
      status: 'active',
      timezone: 'America/Toronto',
      relevance: 'meaningful',
      significance: 'normal',
      schedule: {
        kind: 'timed',
        local_start: '2026-09-03T10:00:00',
        local_end: '2026-09-03T11:00:00',
      },
      ...timestamps,
    };

    await repository.saveEvent(event);
    await repository.saveOccurrence({
      occurrence_id: 'provider-occurrence',
      event_id: event.event_id,
      starts_at: '2026-09-04T14:00:00Z',
      ends_at: '2026-09-04T15:00:00Z',
      local_start_date: '2026-09-04',
      local_end_date: '2026-09-04',
      timezone: event.timezone,
      status: 'scheduled',
      ...timestamps,
    });

    const occurrences = await service.listOccurrencesInWindow({
      starts_at: '2026-09-03T00:00:00Z',
      ends_at: '2026-09-05T00:00:00Z',
    });

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].occurrence_id).toBe('provider-occurrence');
  });
});
