import { calendarOccurrencesApi } from './api-client';

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

/**
 * Real, backend-backed Temporal query (FUNCTIONAL_FOUNDATION_PLAN.md Phase
 * 5) — replaces FixtureTemporalQuery. Occurrences already come from the
 * existing resolved temporal domain (DefaultTemporalService /
 * resolveEventOccurrences) via /api/calendar/occurrences; there is no
 * fixture/demo occurrence data.
 */
export class ApiTemporalQuery implements TemporalQuery {
  async listOccurrencesInWindow(window: OccurrenceWindow): Promise<TemporalOccurrence[]> {
    return calendarOccurrencesApi.listInWindow(window).catch(() => []);
  }
}

