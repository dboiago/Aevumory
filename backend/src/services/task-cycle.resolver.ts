/**
 * Task Cycle Resolver
 *
 * Pure function generating TaskCycle rows from a Task's SchedulePolicy.
 * Mirrors recurrence.resolver.ts's architecture: deterministic, stateless,
 * and independent of any prior cycle's completion state — so a late
 * completion (or any other occurrence-level state change) can never mutate
 * the recurrence anchor used to generate future cycles (TASK_LIFECYCLE.md §3:
 * "Completion never changes the series anchor").
 */

import { Temporal } from '@js-temporal/polyfill';
import type { SchedulePolicy, Task, TaskCycle } from '../types/task-domain.types.js';

export interface CycleResolutionWindow {
  starts_at: string;
  ends_at: string;
}

/**
 * Validates a SchedulePolicy independent of any resolution window — used by
 * TaskService to reject an invalid schedule at task create/update time,
 * before it would otherwise only surface as an empty cycle list.
 */
export function validateSchedulePolicy(schedule: SchedulePolicy): void {
  switch (schedule.cadence_type) {
    case 'one_off':
      requireSeriesAnchor(schedule);
      return;
    case 'interval':
      requireSeriesAnchor(schedule);
      if (!Number.isInteger(schedule.interval_days) || (schedule.interval_days as number) < 1) {
        throw new Error("interval_days must be a positive integer for cadence_type 'interval'");
      }
      return;
    case 'calendar_anchor': {
      const anchorConfig = schedule.calendar_anchor;
      if (!anchorConfig) {
        throw new Error("calendar_anchor is required for cadence_type 'calendar_anchor'");
      }
      const max = anchorConfig.unit === 'week' ? 7 : 31;
      if (!Number.isInteger(anchorConfig.value) || anchorConfig.value < 1 || anchorConfig.value > max) {
        throw new Error(
          anchorConfig.unit === 'week'
            ? 'week calendar anchor value must be an ISO weekday 1-7'
            : 'month calendar anchor value must be a day of month 1-31',
        );
      }
      return;
    }
  }
}

export function resolveTaskCycles(task: Task, window: CycleResolutionWindow): TaskCycle[] {
  const windowStart = toPlainDate(window.starts_at);
  const windowEnd = toPlainDate(window.ends_at);

  if (Temporal.PlainDate.compare(windowEnd, windowStart) < 0) {
    throw new Error('Cycle resolution window must not end before it starts');
  }

  return resolveTargetDates(task.schedule, windowStart, windowEnd)
    .map((date) => buildCycle(task, date));
}

function toPlainDate(value: string): Temporal.PlainDate {
  return Temporal.PlainDate.from(value.slice(0, 10));
}

function requireSeriesAnchor(schedule: SchedulePolicy): Temporal.PlainDate {
  if (!schedule.series_anchor_date) {
    throw new Error(`series_anchor_date is required for cadence_type '${schedule.cadence_type}'`);
  }
  return Temporal.PlainDate.from(schedule.series_anchor_date);
}

function resolveTargetDates(
  schedule: SchedulePolicy,
  windowStart: Temporal.PlainDate,
  windowEnd: Temporal.PlainDate,
): Temporal.PlainDate[] {
  switch (schedule.cadence_type) {
    case 'one_off':
      return resolveOneOffDates(schedule, windowStart, windowEnd);
    case 'interval':
      return resolveIntervalDates(schedule, windowStart, windowEnd);
    case 'calendar_anchor':
      return resolveCalendarAnchorDates(schedule, windowStart, windowEnd);
  }
}

function resolveOneOffDates(
  schedule: SchedulePolicy,
  windowStart: Temporal.PlainDate,
  windowEnd: Temporal.PlainDate,
): Temporal.PlainDate[] {
  const anchor = requireSeriesAnchor(schedule);
  const inWindow = Temporal.PlainDate.compare(anchor, windowStart) >= 0 &&
    Temporal.PlainDate.compare(anchor, windowEnd) <= 0;
  return inWindow ? [anchor] : [];
}

function resolveIntervalDates(
  schedule: SchedulePolicy,
  windowStart: Temporal.PlainDate,
  windowEnd: Temporal.PlainDate,
): Temporal.PlainDate[] {
  const anchor = requireSeriesAnchor(schedule);
  const intervalDays = schedule.interval_days;
  if (!Number.isInteger(intervalDays) || (intervalDays as number) < 1) {
    throw new Error("interval_days must be a positive integer for cadence_type 'interval'");
  }

  const results: Temporal.PlainDate[] = [];
  let date = anchor;

  if (Temporal.PlainDate.compare(date, windowStart) < 0) {
    const daysSinceAnchor = anchor.until(windowStart, { largestUnit: 'days' }).days;
    const steps = Math.floor(daysSinceAnchor / (intervalDays as number));
    date = anchor.add({ days: steps * (intervalDays as number) });
  }

  while (Temporal.PlainDate.compare(date, windowEnd) <= 0) {
    if (Temporal.PlainDate.compare(date, windowStart) >= 0) results.push(date);
    date = date.add({ days: intervalDays as number });
  }

  return results;
}

function resolveCalendarAnchorDates(
  schedule: SchedulePolicy,
  windowStart: Temporal.PlainDate,
  windowEnd: Temporal.PlainDate,
): Temporal.PlainDate[] {
  const anchorConfig = schedule.calendar_anchor;
  if (!anchorConfig) {
    throw new Error("calendar_anchor is required for cadence_type 'calendar_anchor'");
  }

  // series_anchor_date is optional here: it floors how far back the series
  // may resolve (e.g. don't surface occurrences before the task existed),
  // not the single recurrence origin the way it is for 'interval'.
  const floor = schedule.series_anchor_date ? Temporal.PlainDate.from(schedule.series_anchor_date) : undefined;
  const effectiveStart = floor && Temporal.PlainDate.compare(floor, windowStart) > 0 ? floor : windowStart;
  if (Temporal.PlainDate.compare(effectiveStart, windowEnd) > 0) return [];

  const results: Temporal.PlainDate[] = [];

  if (anchorConfig.unit === 'week') {
    const weekday = anchorConfig.value;
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
      throw new Error('week calendar anchor value must be an ISO weekday 1-7');
    }

    let date = effectiveStart.add({ days: (weekday - effectiveStart.dayOfWeek + 7) % 7 });
    while (Temporal.PlainDate.compare(date, windowEnd) <= 0) {
      results.push(date);
      date = date.add({ days: 7 });
    }
    return results;
  }

  const day = anchorConfig.value;
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error('month calendar anchor value must be a day of month 1-31');
  }

  let month = effectiveStart.with({ day: 1 });
  while (Temporal.PlainDate.compare(month, windowEnd) <= 0) {
    try {
      // `with()` defaults to clamping out-of-range days (e.g. day 31 in
      // February would silently become the 28th) rather than throwing;
      // `overflow: 'reject'` is required to actually skip the month.
      const date = month.with({ day }, { overflow: 'reject' });
      if (
        Temporal.PlainDate.compare(date, effectiveStart) >= 0 &&
        Temporal.PlainDate.compare(date, windowEnd) <= 0
      ) {
        results.push(date);
      }
    } catch {
      // Invalid calendar dates, such as February 31, have no occurrence.
    }
    month = month.add({ months: 1 });
  }

  return results;
}

function buildCycle(task: Task, date: Temporal.PlainDate): TaskCycle {
  const target_date = date.toString();
  const schedule = task.schedule;

  const window_start = schedule.has_strict_window && schedule.window_start_time
    ? `${target_date}T${schedule.window_start_time}`
    : `${target_date}T00:00:00`;
  const window_end = schedule.has_strict_window && schedule.window_end_time
    ? `${target_date}T${schedule.window_end_time}`
    : `${target_date}T23:59:59`;

  return {
    cycle_id: `${task.task_id}:${target_date}`,
    task_id: task.task_id,
    target_date,
    window_start,
    window_end,
    window_source: 'base',
    status: 'pending',
    responsible_user_id: task.assignment.assigned_user_id,
  };
}
