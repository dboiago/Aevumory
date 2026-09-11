import './calendar.css';
import type { CalendarEvent, CalendarQuery, CalendarSource } from './calendar';

const fixtureToday = '2026-09-02';

type CalendarOccurrence = CalendarEvent & { occurrenceDate: string };
type CalendarEditorMode = 'create' | 'edit' | 'view';

export async function renderCalendar(target: HTMLDivElement, query: CalendarQuery): Promise<void> {
  const state = await query.getState();
  let visibleMonth = new Date(2026, 8, 1);
  const visibleSources = new Set(state.sources.map((source) => source.id));
  let showTasks = false;

  const render = (): void => {
    const visibleEvents = state.events.filter((event) => {
      if (event.taskLinked && !showTasks) return false;
      return visibleSources.has(event.calendarId);
    });
    const occurrences = expandVisibleOccurrences(visibleEvents, visibleMonth);
    target.innerHTML = renderCalendarPage(visibleMonth, state.sources, occurrences, showTasks);
    wireCalendar(target, state, visibleSources, () => render(), (offset) => {
      visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
      render();
    }, () => {
      visibleMonth = new Date(2026, 8, 1);
      render();
    }, (dateKey) => {
      openEditor(target, state, 'create', undefined, dateKey, render);
    }, (event) => {
      const source = state.sources.find((item) => item.id === event.calendarId);
      openEditor(target, state, source?.writable ? 'edit' : 'view', event, event.occurrenceDate, render);
    }, (next) => {
      showTasks = next;
      render();
    });
  };

  render();
}

function renderCalendarPage(month: Date, sources: CalendarSource[], occurrences: CalendarOccurrence[], showTasks: boolean): string {
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
        <button type="button" class="calendar-back-action" data-calendar-back>← Back</button>
        <div class="calendar-title"><h1>Calendar</h1></div>
      </header>
      <section class="calendar-controls" aria-label="Calendar navigation">
        <div class="calendar-month-nav">
          <button type="button" class="calendar-nav-button" data-calendar-prev aria-label="Previous month">‹</button>
          <h2>${formatMonth(month)}</h2>
          <button type="button" class="calendar-nav-button" data-calendar-next aria-label="Next month">›</button>
          <button type="button" class="calendar-today-button" data-calendar-today>Today</button>
        </div>
        <div class="calendar-sources" aria-label="Calendar visibility">
          ${sources.map((source) => renderSourceControl(source)).join('')}
          <label class="calendar-source calendar-task-filter">
            ${renderCheckbox(showTasks, 'Show task-linked events', 'data-calendar-tasks')}
            <span>Tasks</span>
          </label>
        </div>
      </section>
      <section class="calendar-grid" aria-label="${formatMonth(month)}">
        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => `<div class="calendar-weekday" aria-hidden="true">${day}</div>`).join('')}
        ${cells}
      </section>
      <button type="button" class="calendar-primary-action" data-calendar-add>Add event</button>
    </main>
  `;
}

function renderSourceControl(source: CalendarSource): string {
  const provider = source.provider === 'aevumory' ? '' : ` · ${source.provider === 'google' ? 'Google' : 'iCloud'}`;
  return `
    <label class="calendar-source">
      ${renderCheckbox(true, `Show ${source.name}`, `data-calendar-source="${escapeHtml(source.id)}"`)}
      <span>${escapeHtml(source.name)}${escapeHtml(provider)}</span>
    </label>
  `;
}

function renderCheckbox(checked: boolean, label: string, attributes: string): string {
  return `
    <span class="calendar-checkbox">
      <input type="checkbox" ${checked ? 'checked' : ''} ${attributes} aria-label="${escapeHtml(label)}">
      <span class="calendar-checkbox-box" aria-hidden="true"></span>
    </span>
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
  const time = showTime && event.startsAt ? formatTime(event.startsAt) : '';
  const recurring = event.recurrence ? ' calendar-event-recurring' : '';
  return `<button type="button" class="calendar-event calendar-event-${event.significance}${recurring}" data-calendar-event="${escapeHtml(event.id)}" title="${escapeHtml(event.title)}"><span>${escapeHtml(time)}</span>${escapeHtml(event.title)}</button>`;
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
      if (event.allDay && event.endsAt) addSpanDays(result, event, base, new Date(event.endsAt), start, end);
      else addIfVisible(result, event, base, start, end);
      continue;
    }

    if (recurrence.includes('daily') || recurrence.includes('x daily')) {
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
      addIfVisible(result, event, new Date(month.getFullYear(), base.getMonth(), base.getDate(), base.getHours(), base.getMinutes()), start, end);
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
  for (let date = new Date(base); date < eventEnd; date.setDate(date.getDate() + 1)) addIfVisible(result, event, date, start, end);
}

function wireCalendar(
  target: HTMLDivElement,
  state: { sources: CalendarSource[]; events: CalendarEvent[] },
  visibleSources: Set<string>,
  rerender: () => void,
  changeMonth: (offset: number) => void,
  goToday: () => void,
  addEvent: (dateKey: string) => void,
  openEvent: (event: CalendarOccurrence) => void,
  toggleTasks: (show: boolean) => void,
): void {
  target.querySelector<HTMLButtonElement>('[data-calendar-back]')?.addEventListener('click', () => {
    window.location.hash = '';
  });
  target.querySelector<HTMLButtonElement>('[data-calendar-prev]')?.addEventListener('click', () => changeMonth(-1));
  target.querySelector<HTMLButtonElement>('[data-calendar-next]')?.addEventListener('click', () => changeMonth(1));
  target.querySelector<HTMLButtonElement>('[data-calendar-today]')?.addEventListener('click', goToday);
  target.querySelector<HTMLButtonElement>('[data-calendar-add]')?.addEventListener('click', () => addEvent(fixtureToday));

  target.querySelectorAll<HTMLInputElement>('[data-calendar-source]').forEach((input) => {
    input.addEventListener('change', () => {
      const sourceId = input.dataset.calendarSource;
      if (!sourceId) return;
      if (input.checked) visibleSources.add(sourceId);
      else visibleSources.delete(sourceId);
      rerender();
    });
  });

  target.querySelector<HTMLInputElement>('[data-calendar-tasks]')?.addEventListener('change', (event) => {
    toggleTasks((event.currentTarget as HTMLInputElement).checked);
  });

  target.querySelectorAll<HTMLButtonElement>('[data-calendar-event]').forEach((button) => {
    button.addEventListener('click', () => {
      const eventId = button.dataset.calendarEvent;
      const event = state.events.find((item) => item.id === eventId);
      if (!event) return;
      const occurrenceDate = button.closest<HTMLElement>('[data-date]')?.dataset.date ?? fixtureToday;
      openEvent({ ...event, occurrenceDate });
    });
  });

  target.querySelectorAll<HTMLElement>('[data-date]').forEach((day) => {
    day.addEventListener('dblclick', (event) => {
      if ((event.target as HTMLElement).closest('[data-calendar-event]')) return;
      const dateKey = day.dataset.date;
      if (dateKey) addEvent(dateKey);
    });
  });
}

function openEditor(
  target: HTMLDivElement,
  state: { sources: CalendarSource[]; events: CalendarEvent[] },
  mode: CalendarEditorMode,
  event: CalendarEvent | undefined,
  occurrenceDate: string,
  rerender: () => void,
): void {
  target.querySelector('.calendar-dialog')?.remove();
  const writableSources = state.sources.filter((source) => source.writable);
  const source = event ? state.sources.find((item) => item.id === event.calendarId) : writableSources[0];
  if (!source) return;

  const startsAt = event?.startsAt ? new Date(event.startsAt) : localDateTime(occurrenceDate, '18:00');
  const endsAt = event?.endsAt ? new Date(event.endsAt) : localDateTime(occurrenceDate, '19:00');
  const readOnly = mode === 'view' || !source.writable;
  const title = mode === 'create' ? 'Add event' : mode === 'edit' ? 'Edit event' : 'Event';

  const dialog = document.createElement('dialog');
  dialog.className = 'calendar-dialog';
  dialog.innerHTML = `
    <form method="dialog" class="calendar-dialog-form">
      <header class="calendar-dialog-header">
        <h2>${title}</h2>
        <button type="button" class="calendar-dialog-close" data-dialog-close aria-label="Close">×</button>
      </header>
      <div class="calendar-dialog-fields">
        <label>Title<input name="title" type="text" value="${escapeHtml(event?.title ?? '')}" ${readOnly ? 'disabled' : 'required'}></label>
        <label class="calendar-dialog-check-row"><span>All day</span>${renderCheckbox(event?.allDay ?? false, 'All day', 'name="allDay"')} </label>
        <label>Date<input name="date" type="date" value="${occurrenceDate}" ${readOnly ? 'disabled' : 'required'}></label>
        <div class="calendar-dialog-time-row">
          <label>Starts<input name="starts" type="time" value="${formatInputTime(startsAt)}" ${readOnly ? 'disabled' : ''}></label>
          <label>Ends<input name="ends" type="time" value="${formatInputTime(endsAt)}" ${readOnly ? 'disabled' : ''}></label>
        </div>
        <label>Calendar<select name="calendar" ${readOnly ? 'disabled' : ''}>${writableSources.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === source.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label>
        <label>Repeats<select name="recurrence" ${readOnly ? 'disabled' : ''}>${['', 'Daily', 'Weekdays', 'Weekly', 'Yearly'].map((value) => `<option value="${value}" ${(event?.recurrence ?? '') === value ? 'selected' : ''}>${value || 'Does not repeat'}</option>`).join('')}</select></label>
        <label>Location<input name="location" type="text" value="${escapeHtml(event?.location ?? '')}" ${readOnly ? 'disabled' : ''}></label>
        <label>Notes<textarea name="notes" rows="4" ${readOnly ? 'disabled' : ''}>${escapeHtml(event?.notes ?? '')}</textarea></label>
      </div>
      ${readOnly ? '' : `<footer class="calendar-dialog-actions"><button type="button" class="calendar-dialog-secondary" data-dialog-close>Cancel</button><button type="submit" class="calendar-dialog-primary">${mode === 'create' ? 'Add event' : 'Save changes'}</button></footer>`}
    </form>
  `;

  target.append(dialog);
  dialog.showModal();

  const allDayInput = dialog.querySelector<HTMLInputElement>('[name="allDay"]');
  const timeInputs = dialog.querySelectorAll<HTMLInputElement>('[name="starts"], [name="ends"]');
  const syncAllDay = (): void => timeInputs.forEach((input) => { input.disabled = readOnly || Boolean(allDayInput?.checked); });
  allDayInput?.addEventListener('change', syncAllDay);
  syncAllDay();

  dialog.querySelectorAll<HTMLElement>('[data-dialog-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  if (readOnly) return;

  dialog.querySelector('form')?.addEventListener('submit', (submitEvent) => {
    submitEvent.preventDefault();
    const data = new FormData(submitEvent.currentTarget as HTMLFormElement);
    const date = String(data.get('date') ?? occurrenceDate);
    const allDay = data.get('allDay') === 'on';
    const startTime = String(data.get('starts') ?? '18:00');
    const endTime = String(data.get('ends') ?? '19:00');
    const nextEvent: CalendarEvent = {
      id: event?.id ?? `event:${Date.now()}`,
      calendarId: String(data.get('calendar') ?? source.id),
      title: String(data.get('title') ?? '').trim(),
      allDay,
      startsAt: localDateTime(date, allDay ? '00:00' : startTime).toISOString(),
      endsAt: localDateTime(date, allDay ? '00:00' : endTime).toISOString(),
      recurrence: String(data.get('recurrence') ?? '') || undefined,
      location: String(data.get('location') ?? '').trim() || undefined,
      notes: String(data.get('notes') ?? '').trim() || undefined,
      taskLinked: event?.taskLinked,
      relevance: event?.relevance ?? 'ordinary',
      significance: event?.significance ?? 'normal',
      participantIds: event?.participantIds,
    };
    const existingIndex = state.events.findIndex((item) => item.id === nextEvent.id);
    if (existingIndex >= 0) state.events[existingIndex] = nextEvent;
    else state.events.push(nextEvent);
    dialog.close();
    rerender();
  });
}

function localDateTime(dateKey: string, time: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function formatInputTime(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
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
