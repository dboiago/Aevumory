import './styles.css';
import { horizonPosition, horizonVisual, type HorizonEvent } from './horizon';
import { FixtureTaskBoardQuery, type HouseholdParticipant } from './tasks';
import { FixtureTaskBoardStore } from './task-board';
import { FixtureTemporalQuery, type TemporalOccurrence } from './temporal';

type AmbientContext =
  | { kind: 'ordinary'; date: string; time: string; weather: string }
  | { kind: 'transient'; message: string };

type TaskListScrollPositions = Record<string, number>;

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

  const participantMatch = window.location.hash.match(/^#participant\/(.+)$/);
  if (participantMatch) {
    const state = await taskBoardQuery.getBoard();
    const participant = state.participants.find((item) => item.id === decodeURIComponent(participantMatch[1]));
    if (participant) {
      renderParticipantProfileScaffold(target, participant);
      return;
    }
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

function renderTaskBoard(
  target: HTMLDivElement,
  store: FixtureTaskBoardStore,
  scrollPositions: TaskListScrollPositions = {},
): void {
  const state = store.getState();
  const todaysTasks = state.tasks.filter(isTaskForToday);
  const participantSections = state.participants
    .map((participant) => renderParticipantColumn(participant, todaysTasks))
    .join('');
  const householdTasks = todaysTasks.filter((task) => task.assignment === 'household');

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

  restoreTaskListScrollPositions(target, scrollPositions);

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

      const scrollPositions = captureTaskListScrollPositions(target);
      store.apply({
        kind: 'assign',
        taskId,
        responsibleUserId: column.dataset.dropTarget || undefined,
      });
      renderTaskBoard(target, store, scrollPositions);
    });
  });

  target.querySelectorAll<HTMLButtonElement>('[data-participant-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const participantId = button.dataset.participantId;
      if (participantId) window.location.hash = `#participant/${encodeURIComponent(participantId)}`;
    });
  });

  target.querySelectorAll<HTMLButtonElement>('[data-action="complete"]').forEach((button) => {
    button.addEventListener('click', () => {
      const scrollPositions = captureTaskListScrollPositions(target);
      store.apply({ kind: 'complete', taskId: button.dataset.taskId ?? '' });
      renderTaskBoard(target, store, scrollPositions);
    });
  });
}

function captureTaskListScrollPositions(target: HTMLDivElement): TaskListScrollPositions {
  const positions: TaskListScrollPositions = {};
  target.querySelectorAll<HTMLElement>('[data-task-list]').forEach((list) => {
    positions[list.dataset.taskList ?? ''] = list.scrollTop;
  });
  return positions;
}

function restoreTaskListScrollPositions(target: HTMLDivElement, positions: TaskListScrollPositions): void {
  target.querySelectorAll<HTMLElement>('[data-task-list]').forEach((list) => {
    const key = list.dataset.taskList ?? '';
    const position = positions[key];
    if (position !== undefined) list.scrollTop = position;
  });
}

function isTaskForToday(task: ReturnType<FixtureTaskBoardStore['getState']>['tasks'][number]): boolean {
  return !task.dueAt || task.dueAt.startsWith(now.slice(0, 10));
}

function renderParticipantColumn(
  participant: HouseholdParticipant,
  tasks: ReturnType<FixtureTaskBoardStore['getState']>['tasks'],
): string {
  const participantTasks = tasks.filter(
    (task) => task.assignment === 'individual' && task.responsibleUserId === participant.id,
  );

  return renderTaskColumn(participant.name, participant.id, participantTasks, participant);
}

function renderTaskColumn(
  heading: string,
  participantId: string | undefined,
  tasks: ReturnType<FixtureTaskBoardStore['getState']>['tasks'],
  participant?: HouseholdParticipant,
): string {
  const identity = participant
    ? `<button type="button" class="task-participant-identity" data-participant-id="${escapeHtml(participant.id)}" aria-label="Open ${escapeHtml(participant.name)}'s profile">
        <span class="task-participant-avatar" aria-hidden="true">${renderParticipantAvatar(participant)}</span>
        <span class="task-participant-name">${escapeHtml(participant.name)}</span>
      </button>`
    : `<h2>${escapeHtml(heading)}</h2>`;
  const orderedTasks = [...tasks].sort((left, right) => Number(left.status === 'completed') - Number(right.status === 'completed'));
  const scrollKey = participantId ?? 'household';

  return `
    <section class="task-column" data-drop-target="${participantId ?? ''}">
      <div class="task-column-heading">
        ${identity}
        <span>${tasks.filter((task) => task.status === 'pending').length}</span>
      </div>
      <div class="task-list" data-task-list="${escapeHtml(scrollKey)}">
        ${orderedTasks.map((task) => renderTaskCard(task)).join('')}
      </div>
    </section>
  `;
}

function renderParticipantAvatar(participant: HouseholdParticipant): string {
  if (participant.avatarUrl) {
    return `<img src="${escapeHtml(participant.avatarUrl)}" alt="">`;
  }

  return escapeHtml(participant.name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase());
}

function renderParticipantProfileScaffold(target: HTMLDivElement, participant: HouseholdParticipant): void {
  target.innerHTML = `
    <main class="task-board participant-profile-scaffold" aria-label="${escapeHtml(participant.name)} profile">
      <header class="task-board-header">
        <button type="button" class="participant-profile-back" data-profile-back>Tasks</button>
        <div class="participant-profile-heading">
          <span class="task-participant-avatar participant-profile-avatar" aria-hidden="true">${renderParticipantAvatar(participant)}</span>
          <h1>${escapeHtml(participant.name)}</h1>
        </div>
      </header>
    </main>
  `;

  target.querySelector<HTMLButtonElement>('[data-profile-back]')?.addEventListener('click', () => {
    window.location.hash = '#tasks';
  });
}

function renderTaskCard(
  task: ReturnType<FixtureTaskBoardStore['getState']>['tasks'][number],
): string {
  const completed = task.status === 'completed';
  const reward = task.completionReward;
  const rewardLabel = reward
    ? `${reward.experience} XP · ${reward.credits} credits${reward.exceptional ? ' · Exceptional' : ''}`
    : '';
  const metadata = [
    task.dueAt ? formatTaskDue(task.dueAt) : '',
    ...(task.indicators ?? []),
  ].filter(Boolean);
  const completionLabel = task.completedAt ? `Done · ${formatTaskTime(task.completedAt)}` : '';

  return `
    <article class="task-card task-domain-${task.domain} ${completed ? 'task-card-completed' : ''}" draggable="true" data-task-id="${task.id}" tabindex="0" title="Drag to change responsibility">
      <div class="task-card-main">
        <div class="task-card-meta">
          ${completed && completionLabel ? `<time class="task-completion-meta" datetime="${escapeHtml(task.completedAt ?? '')}">${escapeHtml(completionLabel)}</time>` : metadata.length ? `<span class="task-context">${escapeHtml(metadata.join(' · '))}</span>` : ''}
        </div>
        <h3>${escapeHtml(task.title)}</h3>
      </div>
      <div class="task-card-footer">
        <span class="task-domain" aria-label="Domain">${escapeHtml(task.domain)}</span>
        <div class="task-card-actions">
          ${reward ? `<span class="task-reward ${reward.exceptional ? 'task-reward-exceptional' : ''}" aria-label="Reward earned">${escapeHtml(rewardLabel)}</span>` : ''}
          <button type="button" class="task-complete" data-action="complete" data-task-id="${task.id}" aria-label="${completed ? 'Mark task as not done' : 'Mark task as done'}">
            ${completed ? 'Done' : 'Complete'}
          </button>
        </div>
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

  if (sameDay) return time;

  return `${new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(date)} · ${time}`;
}

function formatTaskTime(value: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
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
