import { Temporal } from '@js-temporal/polyfill';
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
import { resolveEventOccurrences } from './recurrence.resolver';

export interface OccurrenceWindow {
  starts_at: string;
  ends_at: string;
}

export interface TemporalService {
  getSource(source_id: string): Promise<TemporalSource | null>;
  saveSource(source: TemporalSource): Promise<void>;

  getEvent(event_id: string): Promise<HouseholdEvent | null>;
  listEvents(query?: TemporalEventQuery): Promise<HouseholdEvent[]>;
  saveEvent(event: HouseholdEvent): Promise<void>;
  deleteEvent(event_id: string): Promise<void>;

  getOccurrence(occurrence_id: string): Promise<EventOccurrence | null>;
  listOccurrences(query?: OccurrenceQuery): Promise<EventOccurrence[]>;
  listOccurrencesInWindow(window: OccurrenceWindow): Promise<EventOccurrence[]>;
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

  async listOccurrencesInWindow(window: OccurrenceWindow): Promise<EventOccurrence[]> {
    const windowStart = Temporal.Instant.from(window.starts_at);
    const windowEnd = Temporal.Instant.from(window.ends_at);

    if (Temporal.Instant.compare(windowEnd, windowStart) <= 0) {
      throw new Error('Occurrence query window must end after it starts');
    }

    const events = await this.repository.listEvents({ status: 'active' });
    const results: EventOccurrence[] = [];

    for (const event of events) {
      const persisted = await this.repository.listOccurrences({
        event_id: event.event_id,
        include_cancelled: true,
      });

      if (!event.recurrence && persisted.length > 0) {
        results.push(
          ...persisted.filter((occurrence) =>
            occurrence.status !== 'cancelled' &&
            occurrenceIntersectsWindow(occurrence, event, windowStart, windowEnd)),
        );
        continue;
      }

      const generated = resolveEventOccurrences(event, window);
      const persistedByKey = new Map(
        persisted.map((occurrence) => [occurrenceMatchKey(occurrence), occurrence]),
      );

      // Persisted recurrence instances are authoritative, including when a
      // provider moved the instance outside the generated recurrence window.
      for (const occurrence of persisted) {
        if (occurrence.status !== 'cancelled' &&
            occurrenceIntersectsWindow(occurrence, event, windowStart, windowEnd)) {
          results.push(occurrence);
        }
      }

      for (const occurrence of generated) {
        if (persistedByKey.has(occurrenceMatchKey(occurrence))) continue;
        results.push(occurrence);
      }
    }

    return dedupeOccurrences(results).sort(compareOccurrences);
  }

  saveOccurrence(occurrence: EventOccurrence) {
    return this.repository.saveOccurrence(occurrence);
  }

  deleteOccurrence(occurrence_id: string) {
    return this.repository.deleteOccurrence(occurrence_id);
  }
}

function occurrenceMatchKey(occurrence: EventOccurrence): string {
  return occurrence.recurrence_instance_key ?? occurrence.occurrence_id;
}

function occurrenceIntersectsWindow(
  occurrence: EventOccurrence,
  event: HouseholdEvent,
  windowStart: Temporal.Instant,
  windowEnd: Temporal.Instant,
): boolean {
  if (event.schedule.kind === 'all_day') {
    const start = Temporal.PlainDate.from(occurrence.local_start_date)
      .toZonedDateTime({ timeZone: occurrence.timezone });
    const end = Temporal.PlainDate.from(occurrence.local_end_date)
      .toZonedDateTime({ timeZone: occurrence.timezone });

    return Temporal.Instant.compare(start.toInstant(), windowEnd) < 0 &&
      Temporal.Instant.compare(end.toInstant(), windowStart) > 0;
  }

  if (!occurrence.starts_at || !occurrence.ends_at) return false;

  return Temporal.Instant.compare(Temporal.Instant.from(occurrence.starts_at), windowEnd) < 0 &&
    Temporal.Instant.compare(Temporal.Instant.from(occurrence.ends_at), windowStart) > 0;
}

function dedupeOccurrences(occurrences: EventOccurrence[]): EventOccurrence[] {
  return [...new Map(occurrences.map((occurrence) => [occurrence.occurrence_id, occurrence])).values()];
}

function compareOccurrences(a: EventOccurrence, b: EventOccurrence): number {
  if (a.starts_at && b.starts_at) {
    return Temporal.Instant.compare(
      Temporal.Instant.from(a.starts_at),
      Temporal.Instant.from(b.starts_at),
    );
  }

  if (a.local_start_date !== b.local_start_date) {
    return a.local_start_date < b.local_start_date ? -1 : 1;
  }

  return a.occurrence_id.localeCompare(b.occurrence_id);
}
