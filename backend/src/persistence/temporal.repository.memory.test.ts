import { describe, expect, it } from 'vitest';
import { InMemoryTemporalRepository } from './temporal.repository.memory';

describe('InMemoryTemporalRepository', () => {
  it('stores and retrieves sources and events', async () => {
    const repository = new InMemoryTemporalRepository();

    const source = {
      source_id: 'local',
      kind: 'local' as const,
      name: 'Aevumory',
      enabled: true,
      sync_status: 'never_synced' as const,
      created_at: '2026-09-02T00:00:00Z',
      updated_at: '2026-09-02T00:00:00Z',
    };

    await repository.saveSource(source);
    expect(await repository.getSource('local')).toEqual(source);
  });

  it('filters cancelled occurrences by default', async () => {
    const repository = new InMemoryTemporalRepository();

    const event = {
      event_id: 'event-1',
      source_id: 'local',
      title: 'Dentist',
      status: 'active' as const,
      timezone: 'America/Toronto',
      relevance: 'meaningful' as const,
      significance: 'normal' as const,
      schedule: {
        kind: 'timed' as const,
        local_start: '2026-09-03T10:00:00',
        local_end: '2026-09-03T11:00:00',
      },
      created_at: '2026-09-02T00:00:00Z',
      updated_at: '2026-09-02T00:00:00Z',
    };

    await repository.saveEvent(event);
    await repository.saveOccurrence({
      occurrence_id: 'occurrence-1',
      event_id: 'event-1',
      starts_at: '2026-09-03T14:00:00Z',
      ends_at: '2026-09-03T15:00:00Z',
      local_start_date: '2026-09-03',
      local_end_date: '2026-09-03',
      timezone: 'America/Toronto',
      status: 'scheduled',
      created_at: '2026-09-02T00:00:00Z',
      updated_at: '2026-09-02T00:00:00Z',
    });

    await repository.saveOccurrence({
      occurrence_id: 'occurrence-2',
      event_id: 'event-1',
      local_start_date: '2026-09-04',
      local_end_date: '2026-09-04',
      timezone: 'America/Toronto',
      status: 'cancelled',
      created_at: '2026-09-02T00:00:00Z',
      updated_at: '2026-09-02T00:00:00Z',
    });

    expect((await repository.listOccurrences()).map((o) => o.occurrence_id))
      .toEqual(['occurrence-1']);
    expect((await repository.listOccurrences({ include_cancelled: true })).map((o) => o.occurrence_id))
      .toEqual(['occurrence-1', 'occurrence-2']);
  });

  it('deleting an event removes its occurrences', async () => {
    const repository = new InMemoryTemporalRepository();

    await repository.saveEvent({
      event_id: 'event-1',
      source_id: 'local',
      title: 'Test',
      status: 'active',
      timezone: 'America/Toronto',
      relevance: 'ordinary',
      significance: 'low',
      schedule: {
        kind: 'all_day',
        local_start_date: '2026-09-03',
        local_end_date: '2026-09-04',
      },
      created_at: '2026-09-02T00:00:00Z',
      updated_at: '2026-09-02T00:00:00Z',
    });

    await repository.saveOccurrence({
      occurrence_id: 'occurrence-1',
      event_id: 'event-1',
      local_start_date: '2026-09-03',
      local_end_date: '2026-09-04',
      timezone: 'America/Toronto',
      status: 'scheduled',
      created_at: '2026-09-02T00:00:00Z',
      updated_at: '2026-09-02T00:00:00Z',
    });

    await repository.deleteEvent('event-1');

    expect(await repository.getEvent('event-1')).toBeNull();
    expect(await repository.getOccurrence('occurrence-1')).toBeNull();
  });
});
