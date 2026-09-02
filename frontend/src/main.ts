import './styles.css';
import {
  horizonPosition,
  horizonVisual,
  type HorizonEvent,
} from './horizon';
import { FixtureTaskBoardQuery } from './tasks';
import { FixtureTaskBoardStore } from './task-board';
import { FixtureTemporalQuery, type TemporalOccurrence } from './temporal';

type AmbientContext =
  | {
      kind: 'ordinary';
      date: string;
      time: string;
      weather: string;
    }
  | {
      kind: 'transient';
      message: string;
    };

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('Aevumory application root was not found');
}

let context: AmbientContext = {
  kind: 'ordinary',
  date: 'Wednesday, September 2',
  time: '18:00',
  weather: 'Clear · 18°',
};

const now = '2026-09-02T18:00:00-04:00';
const temporalQuery = new FixtureTemporalQuery();
const taskBoardQuery = new FixtureTaskBoardQuery();

void render(root);
window.addEventListener('hashchange', () => void render(root));

aasync function render(target: HTMLDivElement): Promise<void> {
  if (window.location.hash === '#tasks') {
    const state = await taskBoardQuery.getBoard();
    renderTaskBoard(target, new FixtureTaskBoardStore(state));
    return;
  }

  const occurrences = await temporalQuery.listOccurrencesInWindow({
    starts_at: now,
    ends_at: '2026-09-09T18:00:00-04:00',
  });

  target.innerHTML = `
    <main class="horizon" aria-label="Aevumory Event Horizon">
      <div class="horizon-field" aria-label="Upcoming household events">
        ${renderOccurrences(occurrences)}
      </div>
      ${renderAmbientContext(context)}
    </main>
  `;
}

function renderTaskBoard(target: HTMLDivElement, store: FixtureTaskBoardStore): void {
  const state = store.getState();
  const participantSections = state.participants
    .map((participant) => renderParticipantColumn(participant.id, participant.name, state.tasks, state.participants))
    .join('');
  const householdTasks = state.tasks.filter((task) => task.assignment === 'household');

  target.innerHTML = `
    <main class="task-board" aria-label="Aevumory Task Board">
      <header class="task-board-header">
        <div>
          <p class="eyebrow">Household</p>
          <h1>Tasks</h1>
        </div>
        <a class="surface-link" href="#">Event Horizon</a>
      </header>
      <section class="task-columns" aria-label="Household responsibilities">
        ${participantSections}
        <section class="task-column task-column-household">
          <div class="task-column-heading">
            <h2>Household</h2>
            <span>${householdTasks.filter((task) => task.status === 'pending').length}</span>
          </div>
          <div class="task-list">
            ${householdTasks.map((task) => renderTaskCard(task, state.participants)).join('')}
          </div>
        </section>
      </section>
    </main>
  `;

  target.querySelectorAll<HTMLButtonElement>('[data-action="complete"]').forEach((button) => {
    button.addEventListener('click', () => {
      store.apply({ kind: 'complete', taskId: button.dataset.taskId ?? '' });
      renderTaskBoard(target, store);
    });
  });

  target.querySelectorAll<HTMLSelectElement>('[data-action="assign"]').forEach((select) => {
    select.addEventListener('change', () => {
      store.apply({
        kind: 'assign',
        taskId: select.dataset.taskId ?? '',
        responsibleUserId: select.value || undefined,
      });
      renderTaskBoard(target, store);
    });
  });
}

function renderParticipantColumn(
  participantId: string,
  participantName: string,
  tasks: ReturnType<FixtureTaskBoardStore['getState']>['tasks'],
  participants: ReturnType<FixtureTaskBoardStore['getState']>['participants'],
): string {
  const participantTasks = tasks.filter(
    (task) => task.assignment === 'individual' && task.responsibleUserId === participantId,
  );

  return `
    <section class="task-column">
      <div class="task-column-heading">
        <h2>${escapeHtml(participantName)}</h2>
        <span>${participantTasks.filter((task) => task.status === 'pending').length}</span>
      </div>
      <div class="task-list">
        ${participantTasks.map((task) => renderTaskCard(task, participants)).join('')}
      </div>
    </section>
  `;
}

function renderTaskCard(
  task: ReturnType<FixtureTaskBoardStore['getState']>['tasks'][number],
  participants: ReturnType<FixtureTaskBoardStore['getState']>['participants'],
): string {
  const completed = task.status === 'completed';
  const assigneeOptions = participants
    .map(
      (participant) =>
        `<option value="${participant.id}" ${task.responsibleUserId === participant.id ? 'selected' : ''}>${escapeHtml(participant.name)}</option>`,
    )
    .join('');

  return `
    <article class="task-card ${completed ? 'task-card-completed' : ''}">
      <div class="task-card-main">
        <span class="task-domain">${task.domain}</span>
        <h3>${escapeHtml(task.title)}</h3>
      </div>
      <div class="task-card-actions">
        <label class="sr-only" for="assignee-${task.id}">Responsible participant</label>
        <select id="assignee-${task.id}" data-action="assign" data-task-id="${task.id}">
          <option value="">Household</option>
          ${assigneeOptions}
        </select>
        <button
          type="button"
          class="task-complete"
          data-action="complete"
          data-task-id="${task.id}"
          ${completed ? 'disabled' : ''}
        >${completed ? 'Done' : 'Complete'}</button>
      </div>
    </article>
  `;
}

function renderAmbientContext(value: AmbientContext): string {
  if (value.kind === 'transient') {
    return `
      <aside class="ambient-context ambient-context-transient" aria-live="polite">
        <span class="ambient-message">${escapeHtml(value.message)}</span>
      </aside>
    `;
  }

  return `
    <aside class="ambient-context" aria-label="Current household context">
      <span class="ambient-message">${escapeHtml(value.date)} · ${escapeHtml(value.time)} · ${escapeHtml(value.weather)}</span>
    </aside>
  `;
}

function renderOccurrences(occurrences: TemporalOccurrence[]): string {
  return occurrences.map(toHorizonEvent).map(renderOccurrence).join('');
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
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
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
