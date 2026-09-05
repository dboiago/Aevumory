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

export class InMemoryTemporalRepository implements TemporalRepository {
  private readonly sources = new Map<string, TemporalSource>();
  private readonly events = new Map<string, HouseholdEvent>();
  private readonly occurrences = new Map<string, EventOccurrence>();

  getSource(source_id: string): Promise<TemporalSource | null> {
    return Promise.resolve(this.sources.get(source_id) ?? null);
  }

  saveSource(source: TemporalSource): Promise<void> {
    this.sources.set(source.source_id, source);
    return Promise.resolve();
  }

  getEvent(event_id: string): Promise<HouseholdEvent | null> {
    return Promise.resolve(this.events.get(event_id) ?? null);
  }

  listEvents(query: TemporalEventQuery = {}): Promise<HouseholdEvent[]> {
    const events = [...this.events.values()].filter((event) => {
      if (query.source_id && event.source_id !== query.source_id) return false;
      if (query.status && event.status !== query.status) return false;
      return true;
    });
    return Promise.resolve(events);
  }

  saveEvent(event: HouseholdEvent): Promise<void> {
    this.events.set(event.event_id, event);
    return Promise.resolve();
  }

  deleteEvent(event_id: string): Promise<void> {
    this.events.delete(event_id);
    for (const [occurrence_id, occurrence] of this.occurrences) {
      if (occurrence.event_id === event_id) {
        this.occurrences.delete(occurrence_id);
      }
    }
    return Promise.resolve();
  }

  getOccurrence(occurrence_id: string): Promise<EventOccurrence | null> {
    return Promise.resolve(this.occurrences.get(occurrence_id) ?? null);
  }

  async listOccurrences(query: OccurrenceQuery = {}): Promise<EventOccurrence[]> {
    const occurrences = [...this.occurrences.values()].filter((occurrence) => {
      if (query.event_id && occurrence.event_id !== query.event_id) return false;
      if (!query.include_cancelled && occurrence.status === 'cancelled') return false;
      if (query.starts_before && occurrence.starts_at && occurrence.starts_at >= query.starts_before) return false;
      if (query.ends_after && occurrence.ends_at && occurrence.ends_at <= query.ends_after) return false;

      if (query.source_id) {
        const event = this.events.get(occurrence.event_id);
        if (!event || event.source_id !== query.source_id) return false;
      }

      return true;
    });

    return occurrences;
  }

  saveOccurrence(occurrence: EventOccurrence): Promise<void> {
    this.occurrences.set(occurrence.occurrence_id, occurrence);
    return Promise.resolve();
  }

  deleteOccurrence(occurrence_id: string): Promise<void> {
    this.occurrences.delete(occurrence_id);
    return Promise.resolve();
  }
}
