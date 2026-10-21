import './countdown.css';
import { goBack } from './navigation';
import { calendarOccurrencesApi, type CalendarOccurrenceDto } from './api-client';

/**
 * Countdown — "how many sleeps until…?" (user idea, 2026-10-20; aimed
 * at kids: Christmas, a party, a visit). Reads real calendar
 * occurrences for the next 90 days and counts whole nights between
 * today and each event. No separate data to maintain: if it's on the
 * family calendar, it can be counted down to.
 */

/** Whole nights between two YYYY-MM-DD dates (b - a). */
export function sleepsBetween(aDate: string, bDate: string): number {
  const a = new Date(`${aDate}T12:00:00`);
  const b = new Date(`${bDate}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function todayLocalDate(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function sleepsLabel(sleeps: number): string {
  if (sleeps <= 0) return 'Today!';
  if (sleeps === 1) return '1 sleep';
  return `${sleeps} sleeps`;
}

export async function renderCountdown(target: HTMLDivElement): Promise<void> {
  target.innerHTML = `<main class="countdown" aria-label="Countdown"><p class="countdown-loading">Counting sleeps…</p></main>`;

  const today = todayLocalDate();
  const end = new Date();
  end.setDate(end.getDate() + 90);
  const occurrences = await calendarOccurrencesApi
    .listInWindow({ starts_at: new Date().toISOString(), ends_at: end.toISOString() })
    .catch(() => [] as CalendarOccurrenceDto[]);

  const upcoming = occurrences
    .filter((o) => o.status === 'scheduled' && o.local_start_date >= today)
    .sort((a, b) => a.local_start_date.localeCompare(b.local_start_date))
    .slice(0, 12);

  target.innerHTML = `
    <main class="countdown" aria-label="Countdown">
      <header class="countdown-header">
        <button type="button" class="countdown-back" data-countdown-back>← Back</button>
        <h1>Countdown</h1>
        <p class="countdown-sub">How many sleeps until the good stuff?</p>
      </header>
      ${upcoming.length === 0
        ? '<p class="countdown-empty">Nothing coming up in the next 90 days. Add something to look forward to on the Calendar.</p>'
        : `<ul class="countdown-list">${upcoming.map((o) => renderItem(o, today)).join('')}</ul>`}
    </main>
  `;
  target.querySelector('[data-countdown-back]')?.addEventListener('click', () => goBack(''));
}

function renderItem(occurrence: CalendarOccurrenceDto, today: string): string {
  const sleeps = sleepsBetween(today, occurrence.local_start_date);
  const date = new Date(`${occurrence.local_start_date}T12:00:00`);
  const dateLabel = new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
  return `
    <li class="countdown-item${sleeps <= 0 ? ' countdown-item-today' : ''}">
      <span class="countdown-sleeps">${escapeHtml(sleepsLabel(sleeps))}</span>
      <span class="countdown-what">
        <span class="countdown-title">${escapeHtml(occurrence.title)}</span>
        <span class="countdown-date">${escapeHtml(dateLabel)}</span>
      </span>
    </li>
  `;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
