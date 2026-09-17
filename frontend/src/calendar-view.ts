import './calendar.css';
import type { CalendarEvent, CalendarQuery, CalendarRecurrence, CalendarSource } from './calendar';
import { generateCalendarColourOptions, renderCalendarColour, type CalendarColourSelection } from './calendar-colour';

const fixtureToday = '2026-09-02';
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const maxVisibleEventsPerDay = 5;
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
    applySourceColours(target, state.sources);
    wire(target, state, sources, () => render(), (offset) => { month = new Date(month.getFullYear(), month.getMonth() + offset, 1); render(); }, () => { month = new Date(2026, 8, 1); render(); }, (date) => openEditor(target, state, 'create', undefined, date, render), (event) => {
      const source = state.sources.find((item) => item.id === event.calendarId);
      openEditor(target, state, source?.writable ? 'edit' : 'view', event, event.occurrenceDate, render);
    }, (value) => { showTasks = value; render(); });
  };
  render();
  const observer = new MutationObserver(() => { if (target.isConnected) applySourceColours(target, state.sources); else observer.disconnect(); });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
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
  const provider = source.provider === 'aevumory' ? '' : ` <span class="calendar-source-provider">· ${source.provider === 'google' ? 'Google' : 'iCloud'}</span>`;
  const colourControl = source.provider === 'aevumory' ? '' : `<button type="button" class="calendar-source-colour" data-calendar-colour-source="${escapeHtml(source.id)}" data-calendar-source-id="${escapeHtml(source.id)}" aria-label="Choose colour for ${escapeHtml(source.name)}"></button>`;
  return `<label class="calendar-source">${checkbox(checked, `Show ${source.name}`, `data-calendar-source="${escapeHtml(source.id)}"`)}<span>${escapeHtml(source.name)}${provider}</span>${colourControl}</label>`;
}

function checkbox(checked: boolean, label: string, attributes: string): string {
  return `<span class="calendar-checkbox"><input type="checkbox" ${checked ? 'checked' : ''} ${attributes} aria-label="${escapeHtml(label)}"><span class="calendar-checkbox-box" aria-hidden="true"></span></span>`;
}

function renderDay(date: Date, month: number, events: Occurrence[]): string {
  const key = dateKey(date);
  const dayEvents = events.filter((event) => event.occurrenceDate === key);
  const visibleEvents = dayEvents.slice(0, maxVisibleEventsPerDay);
  const remaining = dayEvents.length - visibleEvents.length;
  return `<div class="calendar-day ${date.getMonth() !== month ? 'calendar-day-outside' : ''} ${key === fixtureToday ? 'calendar-day-today' : ''}" data-date="${key}"><div class="calendar-day-number">${date.getDate()}</div><div class="calendar-day-events">${visibleEvents.filter((event) => event.allDay).map((event) => eventButton(event, false)).join('')}${visibleEvents.filter((event) => !event.allDay).map((event) => eventButton(event, true)).join('')}${remaining > 0 ? `<button type="button" class="calendar-more" data-calendar-more="${key}">+ ${remaining} more</button>` : ''}</div></div>`;
}

function eventButton(event: Occurrence, showTime: boolean): string {
  const time = showTime && event.startsAt ? formatTime(event.startsAt) : '';
  const quiet = event.taskLinked || Boolean(event.recurrence);
  const multiDay =
    event.allDay &&
    Boolean(event.endsAt) &&
    dateKey(new Date(event.endsAt as string)) !== event.occurrenceDate;
  return `<button type="button" class="calendar-event calendar-event-${event.significance}${quiet ? ' calendar-event-quiet' : ''}${event.recurrence ? ' calendar-event-recurring' : ''}${multiDay ? ' calendar-event-multi-day' : ''}" data-calendar-event="${escapeHtml(event.id)}" data-calendar-source-id="${escapeHtml(event.calendarId)}" title="${escapeHtml(event.title)}"><span class="calendar-event-time">${escapeHtml(time)}</span><span class="calendar-event-title">${escapeHtml(event.title)}</span></button>`;
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
  target.querySelectorAll<HTMLButtonElement>('[data-calendar-colour-source]').forEach((button) => button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); openColourPicker(target, state, button.dataset.calendarColourSource ?? '', rerender); }));
  target.querySelectorAll<HTMLButtonElement>('[data-calendar-event]').forEach((button) => button.addEventListener('click', () => { const event = state.events.find((item) => item.id === button.dataset.calendarEvent); if (event) openEvent({ ...event, occurrenceDate: button.closest<HTMLElement>('[data-date]')?.dataset.date ?? fixtureToday }); }));
  target.querySelectorAll<HTMLButtonElement>('[data-calendar-more]').forEach((button) => button.addEventListener('click', () => openDay(target, state, button.dataset.calendarMore ?? fixtureToday)));
  target.querySelectorAll<HTMLElement>('[data-date]').forEach((day) => day.addEventListener('dblclick', (event) => { if ((event.target as HTMLElement).closest('[data-calendar-event], [data-calendar-more]')) return; const date = day.dataset.date; if (date) addEvent(date); }));
}

function applySourceColours(target: HTMLDivElement, sources: CalendarSource[]): void {
  const theme = readCalendarColourTheme();
  target.querySelectorAll<HTMLElement>('[data-calendar-source-id]').forEach((element) => {
    const source = sources.find((item) => item.id === element.dataset.calendarSourceId);
    if (!source?.colour || source.provider === 'aevumory') return;
    const colour = renderCalendarColour(source.colour, theme);
    element.style.setProperty('--calendar-source-bg', colour.background);
    element.style.setProperty('--calendar-source-border', colour.border);
  });
}

function readCalendarColourTheme() {
  const styles = getComputedStyle(document.documentElement);
  return {
    surface: styles.getPropertyValue('--bg-surface').trim(),
    text: styles.getPropertyValue('--text-muted').trim(),
    harmonyAnchor: styles.getPropertyValue('--text-primary').trim(),
    reserved: ['--accent-primary', '--accent-alert', '--accent-success', '--border-active'].map((name) => styles.getPropertyValue(name).trim()),
  };
}

function openColourPicker(target: HTMLDivElement, state: { sources: CalendarSource[]; events: CalendarEvent[] }, sourceId: string, rerender: () => void): void {
  const source = state.sources.find((item) => item.id === sourceId);
  if (!source || source.provider === 'aevumory') return;
  target.querySelector('.calendar-colour-picker')?.remove();
  const original = source.colour ? { ...source.colour } : undefined;
  const options = generateCalendarColourOptions(readCalendarColourTheme(), 8);
  const picker = document.createElement('div');
  picker.className = 'calendar-colour-picker';
  picker.setAttribute('role', 'dialog');
  picker.setAttribute('aria-label', `Choose colour for ${source.name}`);
  picker.innerHTML = `<div class="calendar-colour-picker-title"><strong>${escapeHtml(source.name)}</strong><span>Calendar colour</span></div><div class="calendar-colour-options">${options.map((option, index) => `<button type="button" class="calendar-colour-option" data-colour-index="${index}" aria-label="Colour option ${index + 1}"></button>`).join('')}</div><footer class="calendar-dialog-actions"><button type="button" class="calendar-dialog-secondary" data-colour-cancel>Cancel</button><button type="button" class="calendar-dialog-primary" data-colour-save>Save</button></footer>`;
  target.append(picker);

  const sourceButton = target.querySelector<HTMLButtonElement>(`[data-calendar-colour-source="${CSS.escape(sourceId)}"]`);
  if (sourceButton) {
    const rect = sourceButton.getBoundingClientRect();
    picker.style.left = `${Math.min(window.innerWidth - picker.offsetWidth - 16, Math.max(16, rect.left))}px`;
    picker.style.top = `${Math.min(window.innerHeight - picker.offsetHeight - 16, rect.bottom + 10)}px`;
  }

  const preview = (selection: CalendarColourSelection): void => {
    source.colour = { ...selection };
    applySourceColours(target, state.sources);
    picker.querySelectorAll<HTMLButtonElement>('[data-colour-index]').forEach((button) => button.classList.remove('calendar-colour-option-selected'));
  };
  picker.querySelectorAll<HTMLButtonElement>('[data-colour-index]').forEach((button, index) => {
    const colour = renderCalendarColour(options[index], readCalendarColourTheme());
    button.style.setProperty('--calendar-option-bg', colour.background);
    button.style.setProperty('--calendar-option-border', colour.border);
    button.addEventListener('click', () => { preview(options[index]); button.classList.add('calendar-colour-option-selected'); });
  });

  picker.querySelector('[data-colour-cancel]')?.addEventListener('click', () => {
    source.colour = original ? { ...original } : undefined;
    applySourceColours(target, state.sources);
    picker.remove();
  });
  picker.querySelector('[data-colour-save]')?.addEventListener('click', () => { picker.remove(); rerender(); });
}

function openDay(target: HTMLDivElement, state: { sources: CalendarSource[]; events: CalendarEvent[] }, date: string): void {
  target.querySelector('.calendar-day-dialog')?.remove();
  const events = state.events.flatMap((event) => occurrencesForDate(event, date));
  if (!events.length) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'calendar-dialog calendar-day-dialog';
  dialog.innerHTML = `<section class="calendar-dialog-form"><header class="calendar-dialog-header"><div><h2>${formatDayHeading(date)}</h2><p>All events</p></div><button type="button" class="calendar-dialog-close" data-day-close aria-label="Close">×</button></header><div class="calendar-day-list">${events.map((event) => dayListItem(event, state.sources)).join('')}</div></section>`;
  target.append(dialog); dialog.showModal();
  applySourceColours(target, state.sources);
  dialog.querySelector('[data-day-close]')?.addEventListener('click', () => dialog.close());
}

/* Helper implementations referenced in render and dialog operations */

function occurrencesForDate(event: CalendarEvent, date: string): Occurrence[] {
  if (!event.startsAt) return [];
  const start = new Date(`${date}T00:00:00`);
  return expand([event], start).filter((item) => item.occurrenceDate === date);
}

function dayListItem(event: Occurrence, sources: CalendarSource[]): string {
  const source = sources.find((item) => item.id === event.calendarId);
  const time = event.startsAt ? formatTime(event.startsAt) : '';
  return `<div class="calendar-day-item" data-calendar-source-id="${escapeHtml(event.calendarId)}"><strong>${escapeHtml(event.title)}</strong><span>${escapeHtml(source?.name ?? '')} · ${escapeHtml(time)}</span></div>`;
}

function formatDayHeading(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function openEditor(
  target: HTMLDivElement,
  state: { sources: CalendarSource[]; events: CalendarEvent[] },
  mode: EditorMode,
  event?: CalendarEvent,
  date?: string,
  rerender?: () => void
): void {
  // Stub for editor implementation
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
