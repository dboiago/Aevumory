import type {
  EventOccurrence,
  HouseholdEvent,
  TemporalSource,
} from '../types/temporal-domain.types';
import type {
  OccurrenceQuery,
  TemporalEventQuery,
  TemporalRepository,
} from '../repositories/temporal.repository';

export interface TemporalService {
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

export class DefaultTemporalService implements TemporalService {
  public constructor(private readonly repository: TemporalRepository) {}

  getSource(source_id: string) {
    return this.repository.getSource(source_id);
  }

  saveSource(source: TemporalSource) {
    return this.repository.saveSource(source);
  }

  getEvent(event_id: string) {
    return this.repository.getEvent(event_id);
  }

  listEvents(query?: TemporalEventQuery) {
    return this.repository.listEvents(query);
  }

  saveEvent(event: HouseholdEvent) {
    return this.repository.saveEvent(event);
  }

  deleteEvent(event_id: string) {
    return this.repository.deleteEvent(event_id);
  }

  getOccurrence(occurrence_id: string) {
    return this.repository.getOccurrence(occurrence_id);
  }

  listOccurrences(query?: OccurrenceQuery) {
    return this.repository.listOccurrences(query);
  }

  saveOccurrence(occurrence: EventOccurrence) {
    return this.repository.saveOccurrence(occurrence);
  }

  deleteOccurrence(occurrence_id: string) {
    return this.repository.deleteOccurrence(occurrence_id);
  }
}
