import { Temporal } from '@js-temporal/polyfill';
import type { EventOccurrence, HouseholdEvent, RecurrenceRule } from '../types/temporal-domain.types';

export interface RecurrenceResolutionWindow {
  starts_at: string;
  ends_at: string;
}

/**
 * Resolves a household event into occurrences intersecting an absolute window.
 *
 * Recurrence is evaluated in the event's IANA timezone. The event's schedule is
 * the recurrence anchor; no recurrence rule is meaningful without it.
 */
export function resolveEventOccurrences(
  event: HouseholdEvent,
  window: RecurrenceResolutionWindow,
): EventOccurrence[] {
  const windowStart = Temporal.Instant.from(window.starts_at);
  const windowEnd = Temporal.Instant.from(window.ends_at);

  if (windowEnd <= windowStart) {
    throw new Error('Recurrence resolution window must end after it starts');
  }

  if (!event.recurrence) {
    const occurrence = resolveSingleOccurrence(event);
    return occurrenceIntersectsWindow(occurrence, event, windowStart, windowEnd)
      ? [occurrence]
      : [];
  }

  validateRecurrence(event.recurrence);

  const occurrences: EventOccurrence[] = [];
  const localWindowStart = windowStart.toZonedDateTimeISO(event.timezone);
  const localWindowEnd = windowEnd.toZonedDateTimeISO(event.timezone);

  for (const localStart of recurrenceStarts(event, localWindowStart, localWindowEnd)) {
    const occurrence = buildOccurrence(event, localStart);
    if (occurrenceIntersectsWindow(occurrence, event, windowStart, windowEnd)) {
      occurrences.push(occurrence);
    }
  }

  return occurrences;
}

function validateRecurrence(rule: RecurrenceRule): void {
  if (!Number.isInteger(rule.interval) || rule.interval < 1) {
    throw new Error('Recurrence interval must be a positive integer');
  }

  if (rule.by_weekday?.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
    throw new Error('Recurrence weekdays must use ISO values 1 through 7');
  }

  if (rule.by_month_day !== undefined &&
      (!Number.isInteger(rule.by_month_day) || rule.by_month_day < 1 || rule.by_month_day > 31)) {
    throw new Error('Recurrence month day must be between 1 and 31');
  }
}

function recurrenceStarts(
  event: HouseholdEvent,
  windowStart: Temporal.ZonedDateTime,
  windowEnd: Temporal.ZonedDateTime,
): Temporal.PlainDateTime[] | Temporal.PlainDate[] {
  if (event.schedule.kind === 'all_day') {
    return allDayRecurrenceStarts(event, windowStart.toPlainDate(), windowEnd.toPlainDate());
  }

  return timedRecurrenceStarts(
    event,
    Temporal.PlainDateTime.from(event.schedule.local_start),
    windowStart.toPlainDateTime(),
    windowEnd.toPlainDateTime(),
  );
}

function timedRecurrenceStarts(
  event: HouseholdEvent,
  anchor: Temporal.PlainDateTime,
  windowStart: Temporal.PlainDateTime,
  windowEnd: Temporal.PlainDateTime,
): Temporal.PlainDateTime[] {
  const rule = event.recurrence!;
  const results: Temporal.PlainDateTime[] = [];
  const duration = event.schedule.kind === 'timed'
    ? Temporal.PlainDateTime.from(event.schedule.local_end).since(anchor)
    : Temporal.Duration.from({});

  let date = anchor.toPlainDate();
  const lastDate = windowEnd.toPlainDate().add({ days: 1 });
  const until = rule.until ? Temporal.PlainDate.from(rule.until) : undefined;

  while (Temporal.PlainDate.compare(date, lastDate) <= 0) {
    if (until && Temporal.PlainDate.compare(date, until) > 0) break;

    for (const candidateDate of matchingDatesForPeriod(anchor.toPlainDate(), date, rule)) {
      const candidate = anchor.with({
        year: candidateDate.year,
        month: candidateDate.month,
        day: candidateDate.day,
      });

      if (Temporal.PlainDateTime.compare(candidate, windowEnd) < 0 &&
          Temporal.PlainDateTime.compare(candidate.add(duration), windowStart) > 0) {
        results.push(candidate);
      }
    }

    date = nextPeriodDate(date, rule);
  }

  return dedupeDateTimes(results);
}

function allDayRecurrenceStarts(
  event: HouseholdEvent,
  windowStart: Temporal.PlainDate,
  windowEnd: Temporal.PlainDate,
): Temporal.PlainDate[] {
  const rule = event.recurrence!;
  const anchor = Temporal.PlainDate.from(event.schedule.kind === 'all_day'
    ? event.schedule.local_start_date
    : event.schedule.local_start);
  const results: Temporal.PlainDate[] = [];
  const lastDate = windowEnd.add({ days: 1 });
  const until = rule.until ? Temporal.PlainDate.from(rule.until) : undefined;

  let date = anchor;
  while (Temporal.PlainDate.compare(date, lastDate) <= 0) {
    if (until && Temporal.PlainDate.compare(date, until) > 0) break;

    for (const candidate of matchingDatesForPeriod(anchor, date, rule)) {
      if (Temporal.PlainDate.compare(candidate, windowEnd) <= 0 &&
          Temporal.PlainDate.compare(candidate, windowStart) >= 0) {
        results.push(candidate);
      }
    }

    date = nextPeriodDate(date, rule);
  }

  return dedupeDates(results);
}

function matchingDatesForPeriod(
  anchor: Temporal.PlainDate,
  periodDate: Temporal.PlainDate,
  rule: RecurrenceRule,
): Temporal.PlainDate[] {
  switch (rule.frequency) {
    case 'daily':
      return [periodDate];
    case 'weekly': {
      const weekdays = rule.by_weekday ?? [anchor.dayOfWeek];
      const weekStart = periodDate.subtract({ days: periodDate.dayOfWeek - 1 });
      const anchorWeekStart = anchor.subtract({ days: anchor.dayOfWeek - 1 });
      const weeks = anchorWeekStart.until(weekStart).days / 7;
      if (!Number.isInteger(weeks) || weeks < 0 || weeks % rule.interval !== 0) return [];
      return weekdays.map((day) => weekStart.add({ days: day - 1 }));
    }
    case 'monthly': {
      const months = anchor.until(periodDate, { largestUnit: 'months' }).months;
      if (months < 0 || months % rule.interval !== 0) return [];
      const day = rule.by_month_day ?? anchor.day;
      try {
        return [periodDate.with({ day })];
      } catch {
        return [];
      }
    }
    case 'yearly': {
      const years = anchor.until(periodDate, { largestUnit: 'years' }).years;
      if (years < 0 || years % rule.interval !== 0) return [];
      try {
        return [periodDate.with({ month: anchor.month, day: anchor.day })];
      } catch {
        return [];
      }
    }
  }
}

function nextPeriodDate(date: Temporal.PlainDate, rule: RecurrenceRule): Temporal.PlainDate {
  switch (rule.frequency) {
    case 'daily': return date.add({ days: 1 });
    case 'weekly': return date.add({ days: 7 });
    case 'monthly': return date.add({ months: 1 });
    case 'yearly': return date.add({ years: 1 });
  }
}

function resolveSingleOccurrence(event: HouseholdEvent): EventOccurrence {
  return buildOccurrence(event, event.schedule.kind === 'timed'
    ? Temporal.PlainDateTime.from(event.schedule.local_start)
    : Temporal.PlainDate.from(event.schedule.local_start_date));
}

function buildOccurrence(
  event: HouseholdEvent,
  localStart: Temporal.PlainDateTime | Temporal.PlainDate,
): EventOccurrence {
  const recurrenceKey = localStart.toString();

  if (event.schedule.kind === 'all_day') {
    const startDate = Temporal.PlainDate.from(localStart);
    const durationDays = Temporal.PlainDate.from(event.schedule.local_end_date)
      .since(Temporal.PlainDate.from(event.schedule.local_start_date)).days;
    const endDate = startDate.add({ days: durationDays });

    return {
      occurrence_id: `${event.event_id}:${recurrenceKey}`,
      event_id: event.event_id,
      local_start_date: startDate.toString(),
      local_end_date: endDate.toString(),
      timezone: event.timezone,
      ...(event.recurrence ? { recurrence_instance_key: recurrenceKey } : {}),
      status: 'scheduled',
      created_at: event.created_at,
      updated_at: event.updated_at,
    };
  }

  const start = Temporal.ZonedDateTime.from({
    timeZone: event.timezone,
    year: localStart.year,
    month: localStart.month,
    day: localStart.day,
    hour: localStart.hour,
    minute: localStart.minute,
    second: localStart.second,
    millisecond: localStart.millisecond,
    microsecond: localStart.microsecond,
    nanosecond: localStart.nanosecond,
  });
  const duration = Temporal.PlainDateTime.from(event.schedule.local_end)
    .since(Temporal.PlainDateTime.from(event.schedule.local_start));
  const end = start.add(duration);

  return {
    occurrence_id: `${event.event_id}:${recurrenceKey}`,
    event_id: event.event_id,
    starts_at: start.toInstant().toString(),
    ends_at: end.toInstant().toString(),
    local_start_date: start.toPlainDate().toString(),
    local_end_date: start.toPlainDate().toString(),
    timezone: event.timezone,
    ...(event.recurrence ? { recurrence_instance_key: recurrenceKey } : {}),
    status: 'scheduled',
    created_at: event.created_at,
    updated_at: event.updated_at,
  };
}

function occurrenceIntersectsWindow(
  occurrence: EventOccurrence,
  event: HouseholdEvent,
  windowStart: Temporal.Instant,
  windowEnd: Temporal.Instant,
): boolean {
  if (event.schedule.kind === 'all_day') {
    const start = Temporal.PlainDate.from(occurrence.local_start_date)
      .toZonedDateTime({ timeZone: event.timezone });
    const end = Temporal.PlainDate.from(occurrence.local_end_date)
      .toZonedDateTime({ timeZone: event.timezone });
    return start.toInstant() < windowEnd && end.toInstant() > windowStart;
  }

  return Temporal.Instant.from(occurrence.starts_at!) < windowEnd &&
    Temporal.Instant.from(occurrence.ends_at!) > windowStart;
}

function dedupeDates(values: Temporal.PlainDate[]): Temporal.PlainDate[] {
  return [...new Map(values.map((value) => [value.toString(), value])).values()]
    .sort((a, b) => Temporal.PlainDate.compare(a, b));
}

function dedupeDateTimes(values: Temporal.PlainDateTime[]): Temporal.PlainDateTime[] {
  return [...new Map(values.map((value) => [value.toString(), value])).values()]
    .sort((a, b) => Temporal.PlainDateTime.compare(a, b));
}
