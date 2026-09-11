export type CalendarSourceProvider = 'aevumory' | 'google' | 'icloud';

export type CalendarSource = {
  id: string;
  provider: CalendarSourceProvider;
  name: string;
  accountName?: string;
  writable: boolean;
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
  recurrence?: string;
  taskLinked?: boolean;
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

const fixtureState: CalendarState = {
  sources: [
    { id: 'calendar:aevumory', provider: 'aevumory', name: 'Aevumory', writable: true },
    { id: 'calendar:google-alex', provider: 'google', name: 'Alex', accountName: 'Google Calendar', writable: false },
    { id: 'calendar:google-jordan', provider: 'google', name: 'Jordan', accountName: 'Google Calendar', writable: false },
    { id: 'calendar:icloud-family', provider: 'icloud', name: 'Family', accountName: 'iCloud', writable: false },
  ],
  events: [
    {
      id: 'event:brush-teeth', calendarId: 'calendar:aevumory', title: 'Brush teeth', allDay: false,
      startsAt: '2026-09-02T07:30:00-04:00', endsAt: '2026-09-02T07:35:00-04:00', recurrence: '3x daily', taskLinked: true,
      relevance: 'ordinary', significance: 'low',
    },
    {
      id: 'event:school', calendarId: 'calendar:google-jordan', title: 'School', allDay: false,
      startsAt: '2026-09-02T08:30:00-04:00', endsAt: '2026-09-02T15:00:00-04:00', recurrence: 'Weekdays',
      relevance: 'ordinary', significance: 'normal', participantIds: ['participant:jordan'],
    },
    {
      id: 'event:school-pickup', calendarId: 'calendar:google-alex', title: 'School pickup', allDay: false,
      startsAt: '2026-09-02T15:15:00-04:00', endsAt: '2026-09-02T15:45:00-04:00', recurrence: 'Weekdays', taskLinked: true,
      relevance: 'ordinary', significance: 'normal', participantIds: ['participant:alex'],
    },
    {
      id: 'event:instrument-practice', calendarId: 'calendar:aevumory', title: 'Instrument practice', allDay: false,
      startsAt: '2026-09-02T18:30:00-04:00', endsAt: '2026-09-02T19:00:00-04:00', recurrence: 'Daily', taskLinked: true,
      relevance: 'ordinary', significance: 'normal', participantIds: ['participant:jordan'],
    },
    {
      id: 'event:garbage', calendarId: 'calendar:aevumory', title: 'Garbage collection', allDay: false,
      startsAt: '2026-09-03T07:00:00-04:00', endsAt: '2026-09-03T07:05:00-04:00', recurrence: 'Weekly', taskLinked: true,
      relevance: 'ordinary', significance: 'low',
    },
    {
      id: 'event:dinner', calendarId: 'calendar:aevumory', title: 'Dinner with friends', allDay: false,
      startsAt: '2026-09-03T19:00:00-04:00', endsAt: '2026-09-03T21:00:00-04:00',
      relevance: 'meaningful', significance: 'normal',
    },
    {
      id: 'event:bjj', calendarId: 'calendar:google-alex', title: 'BJJ tournament', allDay: false,
      startsAt: '2026-09-05T09:00:00-04:00', endsAt: '2026-09-05T17:00:00-04:00', location: 'Toronto',
      relevance: 'meaningful', significance: 'high', participantIds: ['participant:alex'],
    },
    {
      id: 'event:family-birthday', calendarId: 'calendar:icloud-family', title: 'Family birthday', allDay: true,
      startsAt: '2026-09-06T00:00:00-04:00', endsAt: '2026-09-07T00:00:00-04:00', recurrence: 'Yearly',
      relevance: 'meaningful', significance: 'normal',
    },
    {
      id: 'event:dentist', calendarId: 'calendar:icloud-family', title: 'Dentist appointment', allDay: false,
      startsAt: '2026-09-08T14:00:00-04:00', endsAt: '2026-09-08T15:00:00-04:00',
      relevance: 'ordinary', significance: 'normal', participantIds: ['participant:maya'],
    },
    {
      id: 'event:weekend-trip', calendarId: 'calendar:aevumory', title: 'Weekend trip', allDay: true,
      startsAt: '2026-09-11T00:00:00-04:00', endsAt: '2026-09-14T00:00:00-04:00',
      relevance: 'meaningful', significance: 'high',
    },
  ],
};

export class FixtureCalendarQuery implements CalendarQuery {
  async getState(): Promise<CalendarState> {
    return structuredClone(fixtureState);
  }
}
