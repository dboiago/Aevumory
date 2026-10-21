import {
  calendarEventsApi,
  calendarSourcesApi,
  taskCyclesApi,
  tasksApi,
  type HouseholdEventDto,
  type RecurrenceRuleDto,
  type TemporalSourceDto,
} from './api-client';

/** Synthetic calendar id for task cycles shown on the Calendar. */
export const TASKS_CALENDAR_ID = 'tasks';

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
  /** Present on task-linked entries: the task definition id. */
  taskId?: string;
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
    const [sources, events, taskEvents] = await Promise.all([
      calendarSourcesApi.list().catch(() => []),
      calendarEventsApi.list().catch(() => []),
      loadTaskEvents().catch(() => [] as CalendarEvent[]),
    ]);

    return {
      sources: sources.map(toCalendarSource),
      events: [
        ...events.filter((event) => event.status === 'active').map(toCalendarEvent),
        ...taskEvents,
      ],
    };
  }
}

/**
 * Task cycles as calendar entries. This wires the Calendar's "Tasks"
 * toggle to real data — previously taskLinked was hardcoded false
 * ("cross-linking out of scope" in Phase 5), so the toggle filtered an
 * always-empty set and tasks never appeared. The window covers the
 * months a user can plausibly browse to from today; month navigation
 * re-renders from this state and polling refetches it.
 */
async function loadTaskEvents(): Promise<CalendarEvent[]> {
  const start = new Date();
  start.setDate(start.getDate() - 62);
  const end = new Date();
  end.setDate(end.getDate() + 122);
  const [tasks, cycles] = await Promise.all([
    tasksApi.list(),
    taskCyclesApi.listInWindow({ starts_at: start.toISOString(), ends_at: end.toISOString() }),
  ]);
  const titles = new Map(tasks.map((task) => [task.task_id, task.title]));
  const dueTimes = new Map(tasks.map((task) => [
    task.task_id,
    task.schedule.has_strict_window ? task.schedule.window_end_time : undefined,
  ]));

  return cycles
    .filter((cycle) => cycle.status === 'pending' || cycle.status === 'satisfied')
    .map((cycle) => {
      const dueTime = dueTimes.get(cycle.task_id);
      if (dueTime) {
        // Timed entry at the due time — expand() handles same-day timed
        // spans correctly.
        return {
          id: `task:${cycle.cycle_id}`,
          calendarId: TASKS_CALENDAR_ID,
          title: titles.get(cycle.task_id) ?? 'Task',
          startsAt: `${cycle.target_date}T${dueTime}`,
          endsAt: `${cycle.target_date}T${dueTime}`,
          allDay: false,
          taskLinked: true,
          taskId: cycle.task_id,
          eventHorizon: 'automatic' as const,
          relevance: 'ordinary' as const,
          significance: 'low' as const,
        };
      }
      // All-day entry. NOTE: the calendar's all-day span logic treats
      // endsAt as EXCLUSIVE (the day after the last occupied day) —
      // setting endsAt == startsAt renders nothing at all (the original
      // "tasks never show on the calendar" bug).
      const next = new Date(`${cycle.target_date}T12:00:00`);
      next.setDate(next.getDate() + 1);
      const pad = (n: number) => String(n).padStart(2, '0');
      const nextDate = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
      return {
        id: `task:${cycle.cycle_id}`,
        calendarId: TASKS_CALENDAR_ID,
        title: titles.get(cycle.task_id) ?? 'Task',
        startsAt: `${cycle.target_date}T00:00:00`,
        endsAt: `${nextDate}T00:00:00`,
        allDay: true,
        taskLinked: true,
        taskId: cycle.task_id,
        eventHorizon: 'automatic' as const,
        relevance: 'ordinary' as const,
        significance: 'low' as const,
      };
    });
}

function toCalendarSource(source: TemporalSourceDto): CalendarSource {
  // All sources are writable LOCALLY: events are stored in Aevumory's own
  // database under the chosen source. Provider sync adapters don't exist
  // yet, so a Google/iCloud-labelled source is a local calendar with that
  // label — it is NOT synced, but it must stay selectable in the editor
  // (regression report 2026-10-20: only 'Aevumory' could be added to).
  if (source.kind === 'local') {
    return { id: source.source_id, provider: 'aevumory', name: source.name, writable: true };
  }
  return { id: source.source_id, provider: 'google', name: source.name, writable: true };
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
