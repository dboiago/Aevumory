import type {
  EventOccurrence,
  HouseholdEvent,
  TemporalSource,
} from '../types/temporal-domain.types';

export interface TemporalEventQuery {
  starts_before?: string;
  ends_after?: string;
  source_id?: string;
  status?: HouseholdEvent['status'];
}

export interface OccurrenceQuery {
  starts_before?: string;
  ends_after?: string;
  event_id?: string;
  source_id?: string;
  include_cancelled?: boolean;
}

export interface TemporalRepository {
  getSource(source_id: string): Promise<TemporalSource | null>;
  saveSource(source: TemporalSource): Promise<void>;

  getEvent(event_id: string): Promise<HouseholdEvent | null>;
  listEvents(query?: TemporalEventQuery): Promise<HouseholdEvent[]>;
  saveEvent(event: HouseholdEvent): Promise<void>;
  deleteEvent(event_id: string): Promise<void>;

  getOccurrence(occurrence_id: string): Promise<EventOccurrence | null>;
  listOccurrences(query?: OccurrenceQuery): Promise<EventOccurrence[]>;
  saveOccurrence(occurrence: EventOccurrence): Promise<void>;
  deleteOccurrence(occurrence_id: string): Promise<void>;
}
