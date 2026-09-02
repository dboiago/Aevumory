import './styles.css';
import { horizonPosition, horizonVisual, type HorizonEvent } from './horizon';
import { FixtureTaskBoardQuery } from './tasks';
import { FixtureTaskBoardStore } from './task-board';
import { FixtureTemporalQuery, type TemporalOccurrence } from './temporal';

type AmbientContext =
  | { kind: 'ordinary'; date: string; time: string; weather: string }
  | { kind: 'transient'; message: string };

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Aevumory application root was not found');

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

async function render(target: HTMLDivElement): Promise<void> {
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
    .map((participant) => renderParticipantColumn(participant.id, participant.name, state.tasks))
    .join('');
  const householdTasks = state.tasks.filter((task) => task.assignment === 'household');

  target.innerHTML = `
    <main class="task-board" aria-label="Aevumory Task Board">
      <header class="task-board-header">
        <div>
          <p class="eyebrow">Household</p>
          <h1>Tasks</h1>
        </div>
      </header>
      <section class="task-columns" aria-label="Household responsibilities">
        ${participantSections}
        ${renderTaskColumn('Household', undefined, householdTasks)}
      </section>
    </main>
  `;

  target.querySelectorAll<HTMLElement>('[data-task-id]').forEach((card) => {
    card.addEventListener('dragstart', (event) => {
      const dataTransfer = event.dataTransfer;
      if (!dataTransfer) return;
      dataTransfer.effectAllowed = 'move';
      dataTransfer.setData('text/task-id', card.dataset.taskId ?? '');
      card.classList.add('task-card-dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('task-card-dragging');
      target.querySelectorAll('.task-column-drag-over').forEach((column) => column.classList.remove('task-column-drag-over'));
    });
  });

  target.querySelectorAll<HTMLElement>('[data-drop-target]').forEach((column) => {
    column.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      column.classList.add('task-column-drag-over');
    });

    column.addEventListener('dragleave', (event) => {
      if (!column.contains(event.relatedTarget as Node | null)) {
        column.classList.remove('task-column-drag-over');
      }
    });

    column.addEventListener('drop', (event) => {
      event.preventDefault();
      column.classList.remove('task-column-drag-over');
      const taskId = event.dataTransfer?.getData('text/task-id');
      if (!taskId) return;

      store.apply({
        kind: 'assign',
        taskId,
        responsibleUserId: column.dataset.dropTarget || undefined,
      });
      renderTaskBoard(target, store);
    });
  });

  target.querySelectorAll<HTMLButtonElement>('[data-action="complete"]').forEach((button) => {
    button.addEventListener('click', () => {
      store.apply({ kind: 'complete', taskId: button.dataset.taskId ?? '' });
      renderTaskBoard(target, store);
    });
  });
}

function renderParticipantColumn(
  participantId: string,
  participantName: string,
  tasks: ReturnType<FixtureTaskBoardStore['getState']>['tasks'],
): string {
  const participantTasks = tasks.filter(
    (task) => task.assignment === 'individual' && task.responsibleUserId === participantId,
  );

  return renderTaskColumn(participantName, participantId, participantTasks);
}

function renderTaskColumn(
  heading: string,
  participantId: string | undefined,
  tasks: ReturnType<FixtureTaskBoardStore['getState']>['tasks'],
): string {
  return `
    <section class="task-column" data-drop-target="${participantId ?? ''}">
      <div class="task-column-heading">
        <h2>${escapeHtml(heading)}</h2>
        <span>${tasks.filter((task) => task.status === 'pending').length}</span>
      </div>
      <div class="task-list">
        ${tasks.map((task) => renderTaskCard(task)).join('')}
      </div>
    </section>
  `;
}

function renderTaskCard(
  task: ReturnType<FixtureTaskBoardStore['getState']>['tasks'][number],
): string {
  const completed = task.status === 'completed';
  const reward = task.completionReward;
  const rewardLabel = reward
    ? `${reward.experience} XP · ${reward.credits} credits${reward.exceptional ? ' · Exceptional' : ''}`
    : '';

  return `
    <article class="task-card ${completed ? 'task-card-completed' : ''}" draggable="true" data-task-id="${task.id}" tabindex="0" title="Drag to change responsibility">
      <div class="task-card-main">
        <div class="task-card-meta">
          <span class="task-domain">${escapeHtml(task.domain)}</span>
          ${task.dueAt ? `<time datetime="${escapeHtml(task.dueAt)}">${escapeHtml(formatTaskDue(task.dueAt))}</time>` : ''}
        </div>
        <h3>${escapeHtml(task.title)}</h3>
      </div>
      <div class="task-card-actions">
        ${reward ? `<span class="task-reward ${reward.exceptional ? 'task-reward-exceptional' : ''}" aria-label="Reward earned">${escapeHtml(rewardLabel)}</span>` : ''}
        <button type="button" class="task-complete" data-action="complete" data-task-id="${task.id}" aria-label="${completed ? 'Mark task as not done' : 'Mark task as done'}">
          ${completed ? 'Done' : 'Complete'}
        </button>
      </div>
    </article>
  `;
}

function formatTaskDue(value: string): string {
  const date = new Date(value);
  const sameDay = value.startsWith(now.slice(0, 10));
  const time = new Intl.DateTimeFormat('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  if (sameDay) return `Today · ${time}`;

  return `${new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(date)} · ${time}`;
}

function renderAmbientContext(value: AmbientContext): string {
  if (value.kind === 'transient') {
    return `<aside class="ambient-context ambient-context-transient" aria-live="polite"><span class="ambient-message">${escapeHtml(value.message)}</span></aside>`;
  }

  return `<aside class="ambient-context" aria-label="Current household context"><span class="ambient-message">${escapeHtml(value.date)} · ${escapeHtml(value.time)} · ${escapeHtml(value.weather)}</span></aside>`;
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
    `left:${(position.x * 100).toFixed(3)}%`, `top:${(position.y * 100).toFixed(3)}%`,
    `--opacity:${visual.opacity.toFixed(3)}`, `--font-size:${Math.max(10, Math.min(25, 10 + visual.size * 10)).toFixed(2)}px`,
    `--scale:${visual.scale.toFixed(3)}`, `--blur:${visual.blur.toFixed(2)}px`, `--tracking:${visual.tracking}`,
    `--weight:${visual.weight}`, `--time-opacity:${visual.timeOpacity.toFixed(3)}`, `--time-scale:${visual.timeScale.toFixed(3)}`,
    `--time-rise:${visual.timeRise}`,
  ].join(';');

  return `<article class="horizon-event" style="${style}"><span class="horizon-event-title">${escapeHtml(event.title)}</span><span class="horizon-event-time">${escapeHtml(event.timeLabel)}</span></article>`;
}

function formatTime(value?: string): string {
  if (!value) return 'All day';
  return new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
}

function offsetForTimezone(timezone: string): string {
  if (timezone === 'America/Toronto') return '-04:00';
  return 'Z';
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
