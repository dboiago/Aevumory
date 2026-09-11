import './calendar.css';
import type { CalendarEvent, CalendarQuery, CalendarSource } from './calendar';

const fixtureToday = '2026-09-02';

type CalendarOccurrence = CalendarEvent & { occurrenceDate: string };

export async function renderCalendar(target: HTMLDivElement, query: CalendarQuery): Promise<void> {
  const state = await query.getState();
  let visibleMonth = new Date(2026, 8, 1);
  const visibleSources = new Set(state.sources.map((source) => source.id));

  const render = (): void => {
    const occurrences = expandVisibleOccurrences(state.events.filter((event) => visibleSources.has(event.calendarId)), visibleMonth);
    target.innerHTML = renderCalendarPage(visibleMonth, state.sources, occurrences);
    wireCalendar(target, state.sources, visibleSources, () => render(), (offset) => {
      visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
      render();
    }, () => {
      visibleMonth = new Date(2026, 8, 1);
      render();
    });
  };

  render();
}

function renderCalendarPage(month: Date, sources: CalendarSource[], occurrences: CalendarOccurrence[]): string {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingDays = firstDay;
  const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - leadingDays + 1;
    const date = new Date(year, monthIndex, dayNumber);
    return renderDayCell(date, monthIndex, occurrences);
  }).join('');

  return `
    <main class="calendar-page" aria-label="Aevumory Calendar">
      <header class="calendar-header">
        <div>
          <p class="eyebrow">Household</p>
          <h1>Calendar</h1>
        </div>
        <div class="calendar-header-actions">
          <button type="button" class="calendar-primary-action" data-calendar-add>Add event</button>
        </div>
      </header>
      <section class="calendar-controls" aria-label="Calendar navigation">
        <div class="calendar-month-nav">
          <button type="button" class="calendar-nav-button" data-calendar-prev aria-label="Previous month">‹</button>
          <h2>${formatMonth(month)}</h2>
          <button type="button" class="calendar-nav-button" data-calendar-next aria-label="Next month">›</button>
          <button type="button" class="calendar-today-button" data-calendar-today>Today</button>
        </div>
        <div class="calendar-sources" aria-label="Calendar sources">
          ${sources.map((source) => renderSourceControl(source)).join('')}
        </div>
      </section>
      <section class="calendar-grid" aria-label="${formatMonth(month)}">
        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => `<div class="calendar-weekday" aria-hidden="true">${day}</div>`).join('')}
        ${cells}
      </section>
    </main>
  `;
}

function renderSourceControl(source: CalendarSource): string {
  const provider = source.provider === 'aevumory' ? 'Aevumory' : source.provider === 'google' ? 'Google' : 'iCloud';
  return `
    <label class="calendar-source">
      <input type="checkbox" data-calendar-source="${escapeHtml(source.id)}" checked>
      <span>${escapeHtml(source.name)}</span>
      <small>${provider}</small>
    </label>
  `;
}

function renderDayCell(date: Date, visibleMonth: number, occurrences: CalendarOccurrence[]): string {
  const dateKey = toDateKey(date);
  const outside = date.getMonth() !== visibleMonth;
  const today = dateKey === fixtureToday;
  const dayEvents = occurrences.filter((event) => event.occurrenceDate === dateKey);
  const allDay = dayEvents.filter((event) => event.allDay);
  const timed = dayEvents.filter((event) => !event.allDay);

  return `
    <div class="calendar-day ${outside ? 'calendar-day-outside' : ''} ${today ? 'calendar-day-today' : ''}" data-date="${dateKey}">
      <div class="calendar-day-number">${date.getDate()}</div>
      <div class="calendar-day-events">
        ${allDay.map((event) => renderEvent(event, false)).join('')}
        ${timed.map((event) => renderEvent(event, true)).join('')}
      </div>
    </div>
  `;
}

function renderEvent(event: CalendarOccurrence, showTime: boolean): string {
  const sourceClass = `calendar-provider-${event.calendarId.split(':')[1] ?? 'aevumory'}`;
  const time = showTime && event.startsAt ? formatTime(event.startsAt) : '';
  return `<button type="button" class="calendar-event calendar-event-${event.significance} ${sourceClass}" title="${escapeHtml(event.title)}"><span>${escapeHtml(time)}</span>${escapeHtml(event.title)}</button>`;
}

function expandVisibleOccurrences(events: CalendarEvent[], month: Date): CalendarOccurrence[] {
  const start = new Date(month.getFullYear(), month.getMonth(), -6);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 6);
  const result: CalendarOccurrence[] = [];

  for (const event of events) {
    if (!event.startsAt) continue;
    const base = new Date(event.startsAt);
    const recurrence = event.recurrence?.toLowerCase();

    if (!recurrence) {
      if (event.allDay && event.endsAt) {
        addSpanDays(result, event, base, new Date(event.endsAt), start, end);
      } else {
        addIfVisible(result, event, base, start, end);
      }
      continue;
    }

    if (recurrence.includes('daily')) {
      for (let date = new Date(base); date <= end; date.setDate(date.getDate() + 1)) {
        if (date >= start) addIfVisible(result, event, date, start, end);
      }
      continue;
    }

    if (recurrence.includes('weekdays')) {
      for (let date = new Date(base); date <= end; date.setDate(date.getDate() + 1)) {
        if (date.getDay() > 0 && date.getDay() < 6 && date >= start) addIfVisible(result, event, date, start, end);
      }
      continue;
    }

    if (recurrence.includes('weekly')) {
      for (let date = new Date(base); date <= end; date.setDate(date.getDate() + 7)) {
        if (date >= start) addIfVisible(result, event, date, start, end);
      }
      continue;
    }

    if (recurrence.includes('yearly')) {
      const date = new Date(month.getFullYear(), base.getMonth(), base.getDate(), base.getHours(), base.getMinutes());
      addIfVisible(result, event, date, start, end);
      continue;
    }

    addIfVisible(result, event, base, start, end);
  }

  return result;
}

function addIfVisible(result: CalendarOccurrence[], event: CalendarEvent, date: Date, start: Date, end: Date): void {
  if (date < start || date > end) return;
  result.push({ ...event, occurrenceDate: toDateKey(date) });
}

function addSpanDays(result: CalendarOccurrence[], event: CalendarEvent, base: Date, eventEnd: Date, start: Date, end: Date): void {
  for (let date = new Date(base); date < eventEnd; date.setDate(date.getDate() + 1)) {
    addIfVisible(result, event, date, start, end);
  }
}

function wireCalendar(
  target: HTMLDivElement,
  sources: CalendarSource[],
  visibleSources: Set<string>,
  rerender: () => void,
  changeMonth: (offset: number) => void,
  goToday: () => void,
): void {
  target.querySelector<HTMLButtonElement>('[data-calendar-prev]')?.addEventListener('click', () => changeMonth(-1));
  target.querySelector<HTMLButtonElement>('[data-calendar-next]')?.addEventListener('click', () => changeMonth(1));
  target.querySelector<HTMLButtonElement>('[data-calendar-today]')?.addEventListener('click', goToday);

  target.querySelectorAll<HTMLInputElement>('[data-calendar-source]').forEach((input) => {
    input.addEventListener('change', () => {
      const sourceId = input.dataset.calendarSource;
      if (!sourceId) return;
      if (input.checked) visibleSources.add(sourceId);
      else visibleSources.delete(sourceId);
      rerender();
    });
  });

  target.querySelector<HTMLButtonElement>('[data-calendar-add]')?.addEventListener('click', () => {
    window.alert('Event creation is not wired in this prototype');
  });

  void sources;
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric' }).format(date);
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}
