import {
  calendarEventsApi,
  calendarSourcesApi,
  type HouseholdEventDto,
  type RecurrenceRuleDto,
  type TemporalSourceDto,
} from './api-client';

export type CalendarSourceProvider = 'aevumory' | 'google' | 'icloud';

export type CalendarColourSelection = {
  hueOffset: number;
  chromaBias: number;
  lightnessBias: number;
};

export type CalendarSource = {
  id: string;
  provider: CalendarSourceProvider;
  name: string;
  accountName?: string;
  writable: boolean;
  colour?: CalendarColourSelection;
};

export type CalendarRecurrence = {
  frequency: 'daily' | 'weekly' | 'yearly';
  interval?: number;
  daysOfWeek?: number[];
};

export type CalendarEvent = {
  id: string;
  calendarId: string;
  title: string;
  startsAt?: string;
  endsAt?: string;
  allDay: boolean;
  location?: string;
  notes?: string;
  participantIds?: string[];
  recurrence?: CalendarRecurrence;
  taskLinked?: boolean;
  eventHorizon: 'automatic' | 'show' | 'hide';
  relevance: 'ordinary' | 'meaningful';
  significance: 'low' | 'normal' | 'high';
};

export type CalendarState = {
  sources: CalendarSource[];
  events: CalendarEvent[];
};

export interface CalendarQuery {
  getState(): Promise<CalendarState>;
}

/**
 * Real, backend-backed Calendar query (FUNCTIONAL_FOUNDATION_PLAN.md Phase
 * 5) — replaces FixtureCalendarQuery. Only the local Aevumory calendar
 * source is wired end-to-end; external provider adapters remain
 * unimplemented, so any non-local source is rendered read-only rather than
 * assumed to exist. There is no fixture/demo event data; a fresh household
 * legitimately has none yet.
 */
export class ApiCalendarQuery implements CalendarQuery {
  async getState(): Promise<CalendarState> {
    const [sources, events] = await Promise.all([
      calendarSourcesApi.list().catch(() => []),
      calendarEventsApi.list().catch(() => []),
    ]);

    return {
      sources: sources.map(toCalendarSource),
      events: events.filter((event) => event.status === 'active').map(toCalendarEvent),
    };
  }
}

function toCalendarSource(source: TemporalSourceDto): CalendarSource {
  if (source.kind === 'local') {
    return { id: source.source_id, provider: 'aevumory', name: source.name, writable: true };
  }

  // External provider adapters are not implemented in this phase (Phase 5
  // scope boundary) — rendered read-only defensively rather than assumed away.
  return { id: source.source_id, provider: 'google', name: source.name, writable: false };
}

function toCalendarEvent(event: HouseholdEventDto): CalendarEvent {
  const allDay = event.schedule.kind === 'all_day';

  // event.schedule carries naive local wall-clock strings (no UTC offset) by
  // design (see temporal-domain.types.ts); passed through as-is so the
  // browser's own Date parsing treats them as local time, matching this
  // screen's existing client-side recurrence expansion. This assumes the
  // viewing device's timezone matches the household's — a reasonable
  // simplification for a self-hosted single-household app, not a general
  // multi-timezone guarantee.
  const startsAt = event.schedule.kind === 'timed'
    ? event.schedule.local_start
    : `${event.schedule.local_start_date}T00:00:00`;
  const endsAt = event.schedule.kind === 'timed'
    ? event.schedule.local_end
    : `${event.schedule.local_end_date}T00:00:00`;

  return {
    id: event.event_id,
    calendarId: event.source_id,
    title: event.title,
    startsAt,
    endsAt,
    allDay,
    location: event.location,
    notes: event.description,
    recurrence: toCalendarRecurrence(event.recurrence),
    // Task/Calendar cross-linking is out of scope for Phase 5.
    taskLinked: false,
    eventHorizon: 'automatic',
    relevance: event.relevance,
    significance: event.significance,
  };
}

function toCalendarRecurrence(recurrence?: RecurrenceRuleDto): CalendarRecurrence | undefined {
  if (!recurrence) return undefined;

  // calendar-view.ts's existing client-side expand() only understands
  // daily/weekly/yearly recurrence; monthly recurrence is still resolved
  // correctly for Event Horizon via /api/calendar/occurrences, but isn't
  // representable in this screen's untouched expansion logic.
  if (recurrence.frequency === 'monthly') return undefined;

  return {
    frequency: recurrence.frequency,
    interval: recurrence.interval,
    // Backend weekdays are ISO (1=Monday..7=Sunday); the frontend's existing
    // expand() uses JS Date#getDay() (0=Sunday..6=Saturday).
    daysOfWeek: recurrence.by_weekday?.map((day) => day % 7),
  };
}
