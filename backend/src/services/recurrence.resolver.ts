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

  const localWindowStart = windowStart.toZonedDateTimeISO(event.timezone);
  const localWindowEnd = windowEnd.toZonedDateTimeISO(event.timezone);

  const starts = event.schedule.kind === 'timed'
    ? resolveTimedStarts(event, localWindowStart.toPlainDate(), localWindowEnd.toPlainDate())
    : resolveAllDayStarts(event, localWindowStart.toPlainDate(), localWindowEnd.toPlainDate());

  return starts
    .map((start) => buildOccurrence(event, start))
    .filter((occurrence) => occurrenceIntersectsWindow(
      occurrence,
      event,
      windowStart,
      windowEnd,
    ));
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

function resolveTimedStarts(
  event: HouseholdEvent,
  windowStart: Temporal.PlainDate,
  windowEnd: Temporal.PlainDate,
): Temporal.PlainDateTime[] {
  const anchor = Temporal.PlainDateTime.from(event.schedule.local_start);
  const rule = event.recurrence!;
  const duration = Temporal.PlainDateTime.from(event.schedule.local_end).since(anchor);
  const until = rule.until ? Temporal.PlainDate.from(rule.until) : undefined;
  const results: Temporal.PlainDateTime[] = [];

  for (const date of recurrenceDates(anchor.toPlainDate(), windowStart, windowEnd, rule, until)) {
    results.push(anchor.with({ year: date.year, month: date.month, day: date.day }));
  }

  // A long event may begin before the local window date but still intersect it.
  // The final absolute-window filter handles that boundary precisely.
  void duration;
  return dedupeDateTimes(results);
}

function resolveAllDayStarts(
  event: HouseholdEvent,
  windowStart: Temporal.PlainDate,
  windowEnd: Temporal.PlainDate,
): Temporal.PlainDate[] {
  const anchor = Temporal.PlainDate.from(event.schedule.local_start_date);
  const rule = event.recurrence!;
  const until = rule.until ? Temporal.PlainDate.from(rule.until) : undefined;
  const results = recurrenceDates(anchor, windowStart, windowEnd, rule, until);

  return dedupeDates(results);
}

function recurrenceDates(
  anchor: Temporal.PlainDate,
  windowStart: Temporal.PlainDate,
  windowEnd: Temporal.PlainDate,
  rule: RecurrenceRule,
  until?: Temporal.PlainDate,
): Temporal.PlainDate[] {
  const results: Temporal.PlainDate[] = [];
  const searchStart = windowStart.subtract({ days: 1 });
  const searchEnd = windowEnd.add({ days: 1 });

  switch (rule.frequency) {
    case 'daily': {
      let date = anchor;
      if (Temporal.PlainDate.compare(date, searchStart) < 0) {
        const days = anchor.until(searchStart, { largestUnit: 'days' }).days;
        date = anchor.add({ days: Math.floor(days / rule.interval) * rule.interval });
      }

      while (Temporal.PlainDate.compare(date, searchEnd) <= 0) {
        if (until && Temporal.PlainDate.compare(date, until) > 0) break;
        if (Temporal.PlainDate.compare(date, searchStart) >= 0) results.push(date);
        date = date.add({ days: rule.interval });
      }
      break;
    }

    case 'weekly': {
      const anchorWeek = anchor.subtract({ days: anchor.dayOfWeek - 1 });
      const firstWeek = searchStart.subtract({ days: searchStart.dayOfWeek - 1 });
      const weeksFromAnchor = anchorWeek.until(firstWeek, { largestUnit: 'weeks' }).weeks;
      let weekIndex = Math.max(0, Math.floor(weeksFromAnchor / rule.interval));
      let week = anchorWeek.add({ weeks: weekIndex * rule.interval });
      const weekdays = rule.by_weekday ?? [anchor.dayOfWeek];

      while (Temporal.PlainDate.compare(week, searchEnd) <= 0) {
        for (const weekday of weekdays) {
          const date = week.add({ days: weekday - 1 });
          if (Temporal.PlainDate.compare(date, searchStart) < 0 ||
              Temporal.PlainDate.compare(date, searchEnd) > 0) continue;
          if (until && Temporal.PlainDate.compare(date, until) > 0) continue;
          results.push(date);
        }
        weekIndex += 1;
        week = anchorWeek.add({ weeks: weekIndex * rule.interval });
      }
      break;
    }

    case 'monthly': {
      const anchorMonth = anchor.with({ day: 1 });
      const firstMonth = searchStart.with({ day: 1 });
      const monthsFromAnchor = anchorMonth.until(firstMonth, { largestUnit: 'months' }).months;
      let monthIndex = Math.max(0, Math.floor(monthsFromAnchor / rule.interval));
      let month = anchorMonth.add({ months: monthIndex * rule.interval });
      const day = rule.by_month_day ?? anchor.day;

      while (Temporal.PlainDate.compare(month, searchEnd) <= 0) {
        try {
          const date = month.with({ day });
          if (Temporal.PlainDate.compare(date, searchStart) >= 0 &&
              Temporal.PlainDate.compare(date, searchEnd) <= 0 &&
              (!until || Temporal.PlainDate.compare(date, until) <= 0)) {
            results.push(date);
          }
        } catch {
          // Invalid calendar dates, such as February 31, simply have no occurrence.
        }
        monthIndex += 1;
        month = anchorMonth.add({ months: monthIndex * rule.interval });
      }
      break;
    }

    case 'yearly': {
      const anchorYear = anchor.with({ month: 1, day: 1 });
      const firstYear = searchStart.with({ month: 1, day: 1 });
      const yearsFromAnchor = anchorYear.until(firstYear, { largestUnit: 'years' }).years;
      let yearIndex = Math.max(0, Math.floor(yearsFromAnchor / rule.interval));
      let year = anchorYear.add({ years: yearIndex * rule.interval });

      while (Temporal.PlainDate.compare(year, searchEnd) <= 0) {
        try {
          const date = year.with({ month: anchor.month, day: anchor.day });
          if (Temporal.PlainDate.compare(date, searchStart) >= 0 &&
              Temporal.PlainDate.compare(date, searchEnd) <= 0 &&
              (!until || Temporal.PlainDate.compare(date, until) <= 0)) {
            results.push(date);
          }
        } catch {
          // Invalid calendar dates, such as February 29 in a non-leap year, have no occurrence.
        }
        yearIndex += 1;
        year = anchorYear.add({ years: yearIndex * rule.interval });
      }
      break;
    }
  }

  return results;
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

  const startLocal = Temporal.PlainDateTime.from(localStart);
  const endLocal = Temporal.PlainDateTime.from(event.schedule.local_end);
  const duration = endLocal.since(Temporal.PlainDateTime.from(event.schedule.local_start));
  const start = Temporal.ZonedDateTime.from({
    timeZone: event.timezone,
    year: startLocal.year,
    month: startLocal.month,
    day: startLocal.day,
    hour: startLocal.hour,
    minute: startLocal.minute,
    second: startLocal.second,
    millisecond: startLocal.millisecond,
    microsecond: startLocal.microsecond,
    nanosecond: startLocal.nanosecond,
  });
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
