export interface TimedEventSchedule {
  kind: 'timed';
  local_start: string;
  local_end: string;
}

export interface AllDayEventSchedule {
  kind: 'all_day';
  local_start_date: string;
  local_end_date: string;
}

export type EventSchedule = TimedEventSchedule | AllDayEventSchedule;
