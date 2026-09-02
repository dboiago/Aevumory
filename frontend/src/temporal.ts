export type TemporalOccurrence = {
  occurrence_id: string;
  event_id: string;
  title: string;
  starts_at?: string;
  ends_at?: string;
  local_start_date: string;
  local_end_date: string;
  timezone: string;
  location?: string;
  relevance: 'ordinary' | 'meaningful';
  significance: 'low' | 'normal' | 'high';
};

export type OccurrenceWindow = {
  starts_at: string;
  ends_at: string;
};

export interface TemporalQuery {
  listOccurrencesInWindow(window: OccurrenceWindow): Promise<TemporalOccurrence[]>;
}

const fixtureOccurrences: TemporalOccurrence[] = [
  {
    occurrence_id: 'fixture:bjj-tournament:2026-09-05',
    event_id: 'fixture:bjj-tournament',
    title: 'BJJ tournament',
    starts_at: '2026-09-05T09:00:00-04:00',
    ends_at: '2026-09-05T17:00:00-04:00',
    local_start_date: '2026-09-05',
    local_end_date: '2026-09-05',
    timezone: 'America/Toronto',
    location: 'Toronto',
    relevance: 'meaningful',
    significance: 'high',
  },
  {
    occurrence_id: 'fixture:dinner:2026-09-03',
    event_id: 'fixture:dinner',
    title: 'Dinner with friends',
    starts_at: '2026-09-03T19:00:00-04:00',
    ends_at: '2026-09-03T21:00:00-04:00',
    local_start_date: '2026-09-03',
    local_end_date: '2026-09-03',
    timezone: 'America/Toronto',
    relevance: 'meaningful',
    significance: 'normal',
  },
];

export class FixtureTemporalQuery implements TemporalQuery {
  async listOccurrencesInWindow(window: OccurrenceWindow): Promise<TemporalOccurrence[]> {
    const start = Date.parse(window.starts_at);
    const end = Date.parse(window.ends_at);

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      throw new Error('Occurrence query window must end after it starts');
    }

    return fixtureOccurrences.filter((occurrence) => {
      if (!occurrence.starts_at || !occurrence.ends_at) return false;

      const occurrenceStart = Date.parse(occurrence.starts_at);
      const occurrenceEnd = Date.parse(occurrence.ends_at);

      return occurrenceStart < end && occurrenceEnd > start;
    });
  }
}
