import './styles.css';
import { FixtureTemporalQuery, type TemporalOccurrence } from './temporal';

type AmbientContext = {
  date: string;
  time: string;
  weather: string;
};

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Aevumory application root was not found');
}

const context: AmbientContext = {
  date: 'Wednesday, September 2',
  time: '18:00',
  weather: 'Clear · 18°',
};

const temporalQuery = new FixtureTemporalQuery();

void render();

async function render(): Promise<void> {
  const occurrences = await temporalQuery.listOccurrencesInWindow({
    starts_at: '2026-09-02T18:00:00-04:00',
    ends_at: '2026-09-09T18:00:00-04:00',
  });

  app.innerHTML = `
    <section class="ambient-shell">
      <header class="ambient-context" aria-label="Current household context">
        <time class="date">${context.date}</time>
        <time class="time">${context.time}</time>
        <span class="weather">${context.weather}</span>
      </header>

      <section class="horizon" aria-label="Event Horizon">
        <p class="eyebrow">Event Horizon</p>
        ${renderOccurrences(occurrences)}
      </section>
    </section>
  `;
}

function renderOccurrences(occurrences: TemporalOccurrence[]): string {
  if (occurrences.length === 0) {
    return '<p class="empty-state">No approaching events</p>';
  }

  return `
    <div class="occurrence-list">
      ${occurrences.map(renderOccurrence).join('')}
    </div>
  `;
}

function renderOccurrence(occurrence: TemporalOccurrence): string {
  const date = occurrence.starts_at
    ? new Intl.DateTimeFormat('en-CA', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(new Date(occurrence.starts_at))
    : occurrence.local_start_date;

  const time = occurrence.starts_at
    ? new Intl.DateTimeFormat('en-CA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(occurrence.starts_at))
    : 'All day';

  return `
    <article class="occurrence" data-significance="${occurrence.significance}">
      <div>
        <h2>${occurrence.title}</h2>
        <p>${date} · ${time}</p>
      </div>
      ${occurrence.location ? `<span class="occurrence-location">${occurrence.location}</span>` : ''}
    </article>
  `;
}
