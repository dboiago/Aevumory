export interface TimedEventSchedule {
  all_day: false;
  local_start: string;
  local_end: string;
}

export interface AllDayEventSchedule {
  all_day: true;
  local_start_date: string;
  local_end_date: string;
}

export type EventSchedule = TimedEventSchedule | AllDayEventSchedule;
