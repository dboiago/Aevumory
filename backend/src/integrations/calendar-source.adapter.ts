import type {
  EventOccurrence,
  HouseholdEvent,
  TemporalSource,
} from '../types/temporal-domain.types';

export interface CalendarSourceAdapter {
  readonly source: TemporalSource;

  /** Fetch provider state and normalize it into Aevumory event concepts. */
  pull(): Promise<CalendarSourceSnapshot>;
}

export interface CalendarSourceSnapshot {
  events: NormalizedExternalEvent[];
  removed_external_event_ids: string[];
  observed_at: string;
}

export interface NormalizedExternalEvent {
  event: HouseholdEvent;
  occurrences?: EventOccurrence[];
}
