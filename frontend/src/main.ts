import './styles.css';
import {
  horizonPosition,
  horizonVisual,
  type HorizonEvent,
} from './horizon';
import { FixtureTemporalQuery, type TemporalOccurrence } from './temporal';

type AmbientContext = {
  date: string;
  time: string;
  weather: string;
};

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('Aevumory application root was not found');
}

const context: AmbientContext = {
  date: 'Wednesday, September 2',
  time: '18:00',
  weather: 'Clear · 18°',
};

const now = '2026-09-02T18:00:00-04:00';
const temporalQuery = new FixtureTemporalQuery();

void render(root);

async function render(target: HTMLDivElement): Promise<void> {
  const occurrences = await temporalQuery.listOccurrencesInWindow({
    starts_at: now,
    ends_at: '2026-09-09T18:00:00-04:00',
  });

  target.innerHTML = `
    <main class="horizon" aria-label="Aevumory Event Horizon">
      <div class="horizon-field" aria-label="Upcoming household events">
        ${renderOccurrences(occurrences)}
      </div>

      <aside class="ambient-metadata" aria-label="Current household context">
        <time class="ambient-date">${context.date}</time>
        <time class="ambient-time">${context.time}</time>
        <span class="ambient-weather">${context.weather}</span>
      </aside>
    </main>
  `;
}

function renderOccurrences(occurrences: TemporalOccurrence[]): string {
  return occurrences
    .map(toHorizonEvent)
    .map(renderOccurrence)
    .join('');
}

function toHorizonEvent(occurrence: TemporalOccurrence): HorizonEvent {
  return {
    id: occurrence.occurrence_id,
    title: occurrence.title,
    timeLabel: formatTime(occurrence.starts_at),
    occurrenceStart: occurrence.starts_at ?? `${occurrence.local_start_date}T00:00:00${offsetForTimezone(occurrence.timezone)}`,
  };
}

function renderOccurrence(event: HorizonEvent): string {
  const position = horizonPosition(event, now);
  const visual = horizonVisual(event, now);

  const style = [
    `left:${(position.x * 100).toFixed(3)}%`,
    `top:${(position.y * 100).toFixed(3)}%`,
    `--opacity:${visual.opacity.toFixed(3)}`,
    `--font-size:${Math.max(10, Math.min(25, 10 + visual.size * 10)).toFixed(2)}px`,
    `--scale:${visual.scale.toFixed(3)}`,
    `--blur:${visual.blur.toFixed(2)}px`,
    `--tracking:${visual.tracking}`,
    `--weight:${visual.weight}`,
    `--time-opacity:${visual.timeOpacity.toFixed(3)}`,
    `--time-scale:${visual.timeScale.toFixed(3)}`,
    `--time-rise:${visual.timeRise}`,
  ].join(';');

  return `
    <article class="horizon-event" style="${style}">
      <span class="horizon-event-title">${escapeHtml(event.title)}</span>
      <span class="horizon-event-time">${escapeHtml(event.timeLabel)}</span>
    </article>
  `;
}

function formatTime(value?: string): string {
  if (!value) return 'All day';

  return new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}

function offsetForTimezone(timezone: string): string {
  if (timezone === 'America/Toronto') return '-04:00';
  return 'Z';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
