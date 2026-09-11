import './calendar.css';
import type { CalendarEvent, CalendarQuery, CalendarRecurrence, CalendarSource } from './calendar';

const fixtureToday = '2026-09-02';
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
type Occurrence = CalendarEvent & { occurrenceDate: string };
type EditorMode = 'create' | 'edit' | 'view';

export async function renderCalendar(target: HTMLDivElement, query: CalendarQuery): Promise<void> {
  const state = await query.getState();
  let month = new Date(2026, 8, 1);
  const sources = new Set(state.sources.map((item) => item.id));
  let showTasks = false;
  const render = (): void => {
    const events = state.events.filter((event) => (!event.taskLinked || showTasks) && sources.has(event.calendarId));
    target.innerHTML = renderPage(month, state.sources, sources, expand(events, month), showTasks);
    wire(target, state, sources, () => render(), (offset) => { month = new Date(month.getFullYear(), month.getMonth() + offset, 1); render(); }, () => { month = new Date(2026, 8, 1); render(); }, (date) => openEditor(target, state, 'create', undefined, date, render), (event) => {
      const source = state.sources.find((item) => item.id === event.calendarId);
      openEditor(target, state, source?.writable ? 'edit' : 'view', event, event.occurrenceDate, render);
    }, (value) => { showTasks = value; render(); });
  };
  render();
}

function renderPage(month: Date, sources: CalendarSource[], visible: Set<string>, events: Occurrence[], showTasks: boolean): string {
  const year = month.getFullYear();
  const index = month.getMonth();
  const leading = new Date(year, index, 1).getDay();
  const count = new Date(year, index + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((leading + count) / 7) * 7 }, (_, i) => renderDay(new Date(year, index, i - leading + 1), index, events)).join('');
  return `<main class="calendar-page" aria-label="Aevumory Calendar">
    <header class="calendar-header"><button type="button" class="calendar-back-action" data-calendar-back>← Back</button><h1>Calendar</h1></header>
    <section class="calendar-controls" aria-label="Calendar navigation">
      <div class="calendar-month-nav"><button type="button" class="calendar-nav-button" data-calendar-prev aria-label="Previous month">‹</button><h2>${formatMonth(month)}</h2><button type="button" class="calendar-nav-button" data-calendar-next aria-label="Next month">›</button><button type="button" class="calendar-today-button" data-calendar-today>Today</button></div>
      <div class="calendar-sources" aria-label="Calendar visibility">${sources.map((source) => sourceControl(source, visible.has(source.id))).join('')}<label class="calendar-source">${checkbox(showTasks, 'Show task-linked events', 'data-calendar-tasks')}<span>Tasks</span></label></div>
    </section>
    <section class="calendar-grid" aria-label="${formatMonth(month)}">${weekdays.map((day) => `<div class="calendar-weekday" aria-hidden="true">${day}</div>`).join('')}${cells}</section>
    <div class="calendar-actions"><button type="button" class="calendar-primary-action" data-calendar-add>Add event</button></div>
  </main>`;
}

function sourceControl(source: CalendarSource, checked: boolean): string {
  const provider = source.provider === 'aevumory' ? '' : ` · ${source.provider === 'google' ? 'Google' : 'iCloud'}`;
  return `<label class="calendar-source">${checkbox(checked, `Show ${source.name}`, `data-calendar-source="${escapeHtml(source.id)}"`)}<span>${escapeHtml(source.name)}${provider}</span></label>`;
}

function checkbox(checked: boolean, label: string, attributes: string): string {
  return `<span class="calendar-checkbox"><input type="checkbox" ${checked ? 'checked' : ''} ${attributes} aria-label="${escapeHtml(label)}"><span class="calendar-checkbox-box" aria-hidden="true"></span></span>`;
}

function renderDay(date: Date, month: number, events: Occurrence[]): string {
  const key = dateKey(date);
  const dayEvents = events.filter((event) => event.occurrenceDate === key);
  return `<div class="calendar-day ${date.getMonth() !== month ? 'calendar-day-outside' : ''} ${key === fixtureToday ? 'calendar-day-today' : ''}" data-date="${key}"><div class="calendar-day-number">${date.getDate()}</div><div class="calendar-day-events">${dayEvents.filter((event) => event.allDay).map((event) => eventButton(event, false)).join('')}${dayEvents.filter((event) => !event.allDay).map((event) => eventButton(event, true)).join('')}</div></div>`;
}

function eventButton(event: Occurrence, showTime: boolean): string {
  const time = showTime && event.startsAt ? formatTime(event.startsAt) : '';
  return `<button type="button" class="calendar-event calendar-event-${event.significance}${event.recurrence ? ' calendar-event-recurring' : ''}" data-calendar-event="${escapeHtml(event.id)}" title="${escapeHtml(event.title)}"><span>${escapeHtml(time)}</span>${escapeHtml(event.title)}</button>`;
}

function expand(events: CalendarEvent[], month: Date): Occurrence[] {
  const start = new Date(month.getFullYear(), month.getMonth(), -6);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 6);
  const result: Occurrence[] = [];
  for (const event of events) {
    if (!event.startsAt) continue;
    const base = new Date(event.startsAt);
    const recurrence = event.recurrence;
    if (!recurrence) {
      if (event.allDay && event.endsAt) addSpan(result, event, base, new Date(event.endsAt), start, end); else add(result, event, base, start, end);
    } else if (recurrence.frequency === 'daily') {
      const interval = Math.max(1, recurrence.interval ?? 1);
      for (let date = new Date(base); date <= end; date.setDate(date.getDate() + interval)) if (date >= start) add(result, event, date, start, end);
    } else if (recurrence.frequency === 'weekly') {
      const days = recurrence.daysOfWeek?.length ? recurrence.daysOfWeek : [base.getDay()];
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) if (days.includes(date.getDay())) { const occurrence = new Date(date); occurrence.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds()); add(result, event, occurrence, start, end); }
    } else {
      add(result, event, new Date(month.getFullYear(), base.getMonth(), base.getDate(), base.getHours(), base.getMinutes()), start, end);
    }
  }
  return result;
}

function add(result: Occurrence[], event: CalendarEvent, date: Date, start: Date, end: Date): void { if (date >= start && date <= end) result.push({ ...event, occurrenceDate: dateKey(date) }); }
function addSpan(result: Occurrence[], event: CalendarEvent, startDate: Date, endDate: Date, start: Date, end: Date): void { for (let date = new Date(startDate); date < endDate; date.setDate(date.getDate() + 1)) add(result, event, date, start, end); }

function wire(target: HTMLDivElement, state: { sources: CalendarSource[]; events: CalendarEvent[] }, visible: Set<string>, rerender: () => void, changeMonth: (offset: number) => void, today: () => void, addEvent: (date: string) => void, openEvent: (event: Occurrence) => void, tasks: (show: boolean) => void): void {
  target.querySelector('[data-calendar-back]')?.addEventListener('click', () => { window.location.hash = ''; });
  target.querySelector('[data-calendar-prev]')?.addEventListener('click', () => changeMonth(-1));
  target.querySelector('[data-calendar-next]')?.addEventListener('click', () => changeMonth(1));
  target.querySelector('[data-calendar-today]')?.addEventListener('click', today);
  target.querySelector('[data-calendar-add]')?.addEventListener('click', () => addEvent(fixtureToday));
  target.querySelectorAll<HTMLInputElement>('[data-calendar-source]').forEach((input) => input.addEventListener('change', () => { const id = input.dataset.calendarSource; if (id) { input.checked ? visible.add(id) : visible.delete(id); rerender(); } }));
  target.querySelector<HTMLInputElement>('[data-calendar-tasks]')?.addEventListener('change', (event) => tasks((event.currentTarget as HTMLInputElement).checked));
  target.querySelectorAll<HTMLButtonElement>('[data-calendar-event]').forEach((button) => button.addEventListener('click', () => { const event = state.events.find((item) => item.id === button.dataset.calendarEvent); if (event) openEvent({ ...event, occurrenceDate: button.closest<HTMLElement>('[data-date]')?.dataset.date ?? fixtureToday }); }));
  target.querySelectorAll<HTMLElement>('[data-date]').forEach((day) => day.addEventListener('dblclick', (event) => { if ((event.target as HTMLElement).closest('[data-calendar-event]')) return; const date = day.dataset.date; if (date) addEvent(date); }));
}

function openEditor(target: HTMLDivElement, state: { sources: CalendarSource[]; events: CalendarEvent[] }, mode: EditorMode, event: CalendarEvent | undefined, occurrenceDate: string, rerender: () => void): void {
  target.querySelector('.calendar-dialog')?.remove();
  const writable = state.sources.filter((source) => source.writable);
  const source = event ? state.sources.find((item) => item.id === event.calendarId) : writable[0];
  if (!source) return;
  const start = event?.startsAt ? new Date(event.startsAt) : localDateTime(occurrenceDate, '18:00');
  const end = event?.endsAt ? new Date(event.endsAt) : localDateTime(occurrenceDate, '19:00');
  const readOnly = mode === 'view' || !source.writable;
  const recurrence = event?.recurrence;
  const weeklyDays = recurrence?.frequency === 'weekly' ? (recurrence.daysOfWeek ?? [start.getDay()]) : [];
  const dialog = document.createElement('dialog');
  dialog.className = 'calendar-dialog';
  dialog.innerHTML = `<form class="calendar-dialog-form"><header class="calendar-dialog-header"><h2>${mode === 'create' ? 'Add event' : mode === 'edit' ? 'Edit event' : 'Event'}</h2><button type="button" class="calendar-dialog-close" data-dialog-close aria-label="Close">×</button></header><div class="calendar-dialog-fields">
    <label>Title<input name="title" type="text" value="${escapeHtml(event?.title ?? '')}" ${readOnly ? 'disabled' : 'required'}></label>
    <label class="calendar-dialog-check-row"><span>All day</span>${checkbox(event?.allDay ?? false, 'All day', 'name="allDay"')}</label>
    <label>Date<input name="date" type="date" value="${occurrenceDate}" ${readOnly ? 'disabled' : ''}></label>
    <div class="calendar-dialog-time-row"><label>Starts<input name="starts" type="time" value="${inputTime(start)}" ${readOnly ? 'disabled' : ''}></label><label>Ends<input name="ends" type="time" value="${inputTime(end)}" ${readOnly ? 'disabled' : ''}></label></div>
    <label>Calendar<select name="calendar" ${readOnly ? 'disabled' : ''}>${writable.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === source.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label>
    <label>Repeats<select name="repeat" ${readOnly ? 'disabled' : ''}><option value="none" ${!recurrence ? 'selected' : ''}>Does not repeat</option><option value="daily" ${recurrence?.frequency === 'daily' ? 'selected' : ''}>Daily</option><option value="weekdays" ${recurrence?.frequency === 'weekly' && [1,2,3,4,5].every((day) => weeklyDays.includes(day)) ? 'selected' : ''}>Weekdays</option><option value="weekly" ${recurrence?.frequency === 'weekly' && ![1,2,3,4,5].every((day) => weeklyDays.includes(day)) ? 'selected' : ''}>Weekly</option><option value="yearly" ${recurrence?.frequency === 'yearly' ? 'selected' : ''}>Yearly</option></select></label>
    <div class="calendar-weekly-days" data-weekly-days>${weekdays.map((day, index) => `<label class="calendar-weekday-choice"><span>${day}</span>${checkbox(weeklyDays.includes(index), `Repeat on ${day}`, `data-weekday="${index}"`)}</label>`).join('')}</div>
    <label>Event Horizon<select name="eventHorizon" ${readOnly ? 'disabled' : ''}><option value="automatic" ${!event || event.eventHorizon === 'automatic' ? 'selected' : ''}>Automatic</option><option value="show" ${event?.eventHorizon === 'show' ? 'selected' : ''}>Show in Event Horizon</option><option value="hide" ${event?.eventHorizon === 'hide' ? 'selected' : ''}>Hide from Event Horizon</option></select></label>
    <label>Location<input name="location" type="text" value="${escapeHtml(event?.location ?? '')}" ${readOnly ? 'disabled' : ''}></label><label>Notes<textarea name="notes" rows="4" ${readOnly ? 'disabled' : ''}>${escapeHtml(event?.notes ?? '')}</textarea></label>
  </div>${readOnly ? '' : '<footer class="calendar-dialog-actions"><button type="button" class="calendar-dialog-secondary" data-dialog-close>Cancel</button><button type="submit" class="calendar-dialog-primary">Save</button></footer>'}</form>`;
  target.append(dialog); dialog.showModal();
  const allDay = dialog.querySelector<HTMLInputElement>('[name="allDay"]'); const times = dialog.querySelectorAll<HTMLInputElement>('[name="starts"], [name="ends"]'); const repeat = dialog.querySelector<HTMLSelectElement>('[name="repeat"]'); const dayPanel = dialog.querySelector<HTMLElement>('[data-weekly-days]');
  const sync = (): void => { times.forEach((input) => { input.disabled = readOnly || Boolean(allDay?.checked); }); if (dayPanel) dayPanel.hidden = repeat?.value !== 'weekly' && repeat?.value !== 'weekdays'; };
  allDay?.addEventListener('change', sync); repeat?.addEventListener('change', sync); sync();
  dialog.querySelectorAll<HTMLElement>('[data-dialog-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  if (readOnly) return;
  dialog.querySelector('form')?.addEventListener('submit', (submitEvent) => {
    submitEvent.preventDefault(); const data = new FormData(submitEvent.currentTarget as HTMLFormElement); const date = String(data.get('date') ?? occurrenceDate); const allDayValue = data.get('allDay') === 'on'; const start = localDateTime(date, allDayValue ? '00:00' : String(data.get('starts') ?? '18:00')); const end = allDayValue ? new Date(start.getTime() + 86400000) : localDateTime(date, String(data.get('ends') ?? '19:00')); const repeatValue = String(data.get('repeat') ?? 'none'); const selected = Array.from(dialog.querySelectorAll<HTMLInputElement>('[data-weekday]:checked')).map((input) => Number(input.dataset.weekday)); let nextRecurrence: CalendarRecurrence | undefined;
    if (repeatValue === 'daily') nextRecurrence = { frequency: 'daily' }; else if (repeatValue === 'yearly') nextRecurrence = { frequency: 'yearly' }; else if (repeatValue === 'weekdays') nextRecurrence = { frequency: 'weekly', daysOfWeek: [1,2,3,4,5] }; else if (repeatValue === 'weekly') nextRecurrence = { frequency: 'weekly', daysOfWeek: selected.length ? selected : [start.getDay()] };
    const next: CalendarEvent = { id: event?.id ?? `event:${Date.now()}`, calendarId: String(data.get('calendar') ?? source.id), title: String(data.get('title') ?? '').trim(), allDay: allDayValue, startsAt: start.toISOString(), endsAt: end.toISOString(), recurrence: nextRecurrence, location: String(data.get('location') ?? '').trim() || undefined, notes: String(data.get('notes') ?? '').trim() || undefined, taskLinked: event?.taskLinked, eventHorizon: String(data.get('eventHorizon') ?? 'automatic') as CalendarEvent['eventHorizon'], relevance: event?.relevance ?? 'ordinary', significance: event?.significance ?? 'normal', participantIds: event?.participantIds };
    const existing = state.events.findIndex((item) => item.id === next.id); if (existing >= 0) state.events[existing] = next; else state.events.push(next); dialog.close(); rerender();
  });
}

function localDateTime(key: string, time: string): Date { const [year, month, day] = key.split('-').map(Number); const [hours, minutes] = time.split(':').map(Number); return new Date(year, month - 1, day, hours, minutes); }
function inputTime(value: Date): string { return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`; }
function formatMonth(value: Date): string { return new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric' }).format(value); }
function formatTime(value: string): string { return new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' }).format(new Date(value)); }
function dateKey(value: Date): string { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
function escapeHtml(value: string): string { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character); }
