import './task-form.css';
import { ApiError, tasksApi, type CreateTaskDtoInput, type TaskDto } from './api-client';
import type { HouseholdParticipant, TaskDomain } from './tasks';

/**
 * Task create/edit form for the Task Board.
 *
 * Design intent (product decisions, 2026-10-20): creating a task should
 * feel like jotting it down — title, who it's for, when it repeats.
 * Anyone in the household may create and complete tasks (shared device,
 * no sign-in); editing/deleting a task definition stays admin-gated on
 * the server, so the form surfaces the server's refusal plainly.
 *
 * The domain is presented as four chips (Kinetic / Erudite / Form /
 * Keeping). Behind the chip sits a primary discipline: the form makes a
 * best guess from the title (see inferDiscipline) and the user can
 * override by tapping a different chip. Everything else the domain
 * requires (effort, cognitive load, source type, assignment owner) is
 * defaulted — rewards/XP follow from the duration tier via the reward
 * engine, exactly as the docs specify, so nobody sets numbers directly.
 */

export type TaskRepeat = 'once' | 'daily' | 'weekly' | 'interval';
export type DurationTier = 'quick' | 'moderate' | 'sustained' | 'heavy';

export interface TaskFormState {
  title: string;
  /** null = Household (shared pool). */
  assigneeId: string | null;
  domain: TaskDomain;
  /** True once the user picks a domain chip; stops title inference. */
  domainChosen: boolean;
  repeat: TaskRepeat;
  intervalDays: number;
  /** YYYY-MM-DD — due date (once) or first/anchor date (repeating). */
  date: string;
  /** HH:MM — time by which the task should be done, each occurrence. */
  time: string;
  durationTier: DurationTier;
  foothold: boolean;
}

export const DOMAINS: TaskDomain[] = ['kinetic', 'erudite', 'form', 'keeping'];

export const DOMAIN_DEFAULT_DISCIPLINE: Record<TaskDomain, string> = {
  kinetic: 'motion',
  erudite: 'inquiry',
  form: 'making',
  keeping: 'order',
};

const DISCIPLINE_DOMAIN: Record<string, TaskDomain> = {
  motion: 'kinetic', force: 'kinetic', precision: 'kinetic',
  inquiry: 'erudite', reason: 'erudite', synthesis: 'erudite',
  making: 'form', composition: 'form', craft: 'form',
  care: 'keeping', order: 'keeping', renewal: 'keeping',
};

export function domainOfDiscipline(discipline: string): TaskDomain {
  return DISCIPLINE_DOMAIN[discipline] ?? 'keeping';
}

/**
 * Keyword best-guess for a title's discipline. Deliberately conservative:
 * only confident, household-obvious matches; anything else falls back to
 * 'order' (Keeping), the generic household default. The user can always
 * override with the domain chips, and editing the title after choosing a
 * chip manually never overrides their choice.
 */
const TITLE_HINTS: [RegExp, string][] = [
  [/\b(workout|gym|soccer|jujitsu|jiu-?jitsu|run|running|jog|swim|swimming|bike|cycling|yoga|stretch|exercise|training|practice (soccer|martial|karate)|karate|dance)\b/i, 'motion'],
  [/\b(homework|study|studying|read|reading|math|spelling|essay|research|learn)\b/i, 'inquiry'],
  [/\b(draw|paint|build|make|craft|bake|lego|colour|color|write (a )?(story|song)|music practice|piano|guitar|violin)\b/i, 'making'],
  [/\b(feed|water (the )?(plants|cat|dog|pets)|walk the dog|vet|groom|brush (teeth|hair))\b/i, 'care'],
  [/\b(clean|tidy|vacuum|dishes|laundry|trash|garbage|recycling|mop|sweep|dust|organize|organise|put away|make (the )?bed)\b/i, 'order'],
];

export function inferDiscipline(title: string): string {
  for (const [pattern, discipline] of TITLE_HINTS) {
    if (pattern.test(title)) return discipline;
  }
  return 'order';
}

function todayDateValue(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function emptyTaskFormState(): TaskFormState {
  // Default due moment: 12 hours from creation (product decision,
  // 2026-10-20) — tonight's tasks land tomorrow morning and vice versa.
  const due = new Date(Date.now() + 12 * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    title: '',
    assigneeId: null,
    domain: 'keeping',
    domainChosen: false,
    repeat: 'once',
    intervalDays: 2,
    date: `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`,
    time: `${pad(due.getHours())}:${pad(due.getMinutes())}`,
    durationTier: 'moderate',
    foothold: false,
  };
}

export function taskFormStateFromTask(task: TaskDto): TaskFormState {
  const schedule = task.schedule;
  let repeat: TaskRepeat = 'once';
  let intervalDays = 2;
  if (schedule.cadence_type === 'interval') {
    intervalDays = schedule.interval_days ?? 1;
    repeat = intervalDays === 1 ? 'daily' : 'interval';
  } else if (schedule.cadence_type === 'calendar_anchor') {
    repeat = 'weekly';
  }
  return {
    title: task.title,
    assigneeId: task.assignment.scope === 'individual' ? (task.assignment.assigned_user_id ?? null) : null,
    domain: domainOfDiscipline(task.primary_discipline),
    domainChosen: true,
    repeat,
    intervalDays,
    date: schedule.series_anchor_date ?? todayDateValue(),
    time: schedule.window_end_time ?? '12:00',
    durationTier: task.duration_tier,
    foothold: task.supports_foothold ?? false,
  };
}

export function buildTaskInput(
  state: TaskFormState,
  participants: HouseholdParticipant[],
  existing?: TaskDto,
): CreateTaskDtoInput {
  const creatorId = state.assigneeId ?? participants[0]?.id ?? existing?.assignment.owner_id;
  if (!creatorId) throw new Error('Add a participant in Household Setup before creating tasks.');

  const schedule: CreateTaskDtoInput['schedule'] = {
    cadence_type: state.repeat === 'once' ? 'one_off' : state.repeat === 'weekly' ? 'calendar_anchor' : 'interval',
    delay_policy: 'none',
    // The due time rides the existing strict-window model: the cycle
    // window runs from the start of the target day until the due time.
    has_strict_window: true,
    window_start_time: '00:00',
    window_end_time: state.time || '12:00',
    series_anchor_date: state.date,
  };
  if (state.repeat === 'daily') schedule.interval_days = 1;
  if (state.repeat === 'interval') schedule.interval_days = Math.max(2, state.intervalDays || 2);
  if (state.repeat === 'weekly') {
    const parsed = new Date(`${state.date}T12:00:00`);
    const isoWeekday = ((parsed.getDay() + 6) % 7) + 1; // Mon=1 .. Sun=7
    schedule.calendar_anchor = { unit: 'week', value: isoWeekday };
  }

  return {
    title: state.title.trim(),
    primary_discipline: existing && domainOfDiscipline(existing.primary_discipline) === state.domain
      ? existing.primary_discipline
      : (state.domainChosen ? DOMAIN_DEFAULT_DISCIPLINE[state.domain] : inferDiscipline(state.title)),
    source_type: existing?.source_type ?? 'ad_hoc',
    created_by_user_id: existing?.created_by_user_id ?? creatorId,
    assignment: state.assigneeId
      ? { scope: 'individual', assigned_user_id: state.assigneeId, owner_id: existing?.assignment.owner_id ?? state.assigneeId }
      : { scope: 'household', owner_id: existing?.assignment.owner_id ?? creatorId },
    schedule,
    supports_foothold: state.foothold,
    duration_tier: state.durationTier,
    effort_type: state.domain === 'kinetic' ? 'physical' : state.domain === 'erudite' ? 'mental' : 'balanced',
    cognitive_load: 'medium',
  };
}

// ---------------------------------------------------------------------------
// Rendering / wiring
// ---------------------------------------------------------------------------

export interface TaskFormCallbacks {
  onSaved: () => void;
  onCancel: () => void;
}

function chip(label: string, active: boolean, attrs: string): string {
  return `<button type="button" class="task-form-chip${active ? ' task-form-chip-active' : ''}" ${attrs} aria-pressed="${active}">${label}</button>`;
}

export function renderTaskForm(
  slot: HTMLElement,
  state: TaskFormState,
  participants: HouseholdParticipant[],
  existing: TaskDto | undefined,
  callbacks: TaskFormCallbacks,
): void {
  const editing = existing !== undefined;
  slot.innerHTML = `
    <form class="task-form" data-task-form>
      <h2>${editing ? 'Edit task' : 'Add a task'}</h2>
      <label class="task-form-field">
        <span>Title</span>
        <input type="text" name="title" required maxlength="120" value="${escapeHtml(state.title)}" placeholder="e.g. Brush teeth" data-task-title />
      </label>
      <div class="task-form-field">
        <span>Who is it for?</span>
        <div class="task-form-chips" data-task-assignees>
          ${chip('Household', state.assigneeId === null, 'data-assignee=""')}
          ${participants.map((p) => chip(escapeHtml(p.name), state.assigneeId === p.id, `data-assignee="${escapeHtml(p.id)}"`)).join('')}
        </div>
      </div>
      <div class="task-form-field">
        <span>Domain</span>
        <div class="task-form-chips" data-task-domains>
          ${DOMAINS.map((d) => chip(capitalize(d), state.domain === d, `data-domain="${d}"`)).join('')}
        </div>
      </div>
      <div class="task-form-row">
        <label class="task-form-field">
          <span>Repeats</span>
          <select name="repeat" data-task-repeat>
            <option value="once"${state.repeat === 'once' ? ' selected' : ''}>Never</option>
            <option value="daily"${state.repeat === 'daily' ? ' selected' : ''}>Daily</option>
            <option value="weekly"${state.repeat === 'weekly' ? ' selected' : ''}>Weekly</option>
            <option value="interval"${state.repeat === 'interval' ? ' selected' : ''}>Every N days</option>
          </select>
        </label>
        <label class="task-form-field" data-task-interval-wrap>
          <span>Days</span>
          <input type="number" name="intervalDays" min="2" max="365" value="${state.intervalDays}" data-task-interval ${state.repeat === 'interval' ? '' : 'disabled'} />
        </label>
        <label class="task-form-field">
          <span>${state.repeat === 'once' ? 'Due date' : 'Starts'}</span>
          <input type="date" name="date" required value="${state.date}" data-task-date />
        </label>
        <label class="task-form-field">
          <span>Due time</span>
          <input type="time" name="time" required value="${state.time}" data-task-time />
        </label>
      </div>
      <div class="task-form-field">
        <span>How long does it take?</span>
        <div class="task-form-chips" data-task-tiers>
          ${(['quick', 'moderate', 'sustained', 'heavy'] as DurationTier[]).map((t) => chip(capitalize(t), state.durationTier === t, `data-tier="${t}"`)).join('')}
        </div>
      </div>
      <label class="task-form-checkbox">
        <input type="checkbox" data-task-foothold ${state.foothold ? 'checked' : ''} />
        <span>Foothold — reward starting this task, not just finishing it (for hard-to-start tasks)</span>
      </label>
      <p class="task-form-error" data-task-error role="alert" hidden></p>
      <div class="task-form-actions">
        <button type="submit" class="task-form-primary">${editing ? 'Save changes' : 'Add task'}</button>
        <button type="button" class="task-form-secondary" data-task-cancel>Cancel</button>
        ${editing ? '<button type="button" class="task-form-danger" data-task-delete>Delete task</button>' : ''}
      </div>
    </form>
  `;

  const form = slot.querySelector<HTMLFormElement>('[data-task-form]');
  if (!form) return;
  const errorBox = slot.querySelector<HTMLElement>('[data-task-error]');
  const showError = (message: string): void => {
    if (errorBox) { errorBox.textContent = message; errorBox.hidden = false; }
  };

  const titleInput = slot.querySelector<HTMLInputElement>('[data-task-title]');
  titleInput?.addEventListener('input', () => {
    state.title = titleInput.value;
    if (!state.domainChosen) {
      state.domain = domainOfDiscipline(inferDiscipline(state.title));
      slot.querySelectorAll<HTMLElement>('[data-domain]').forEach((el) => {
        const active = el.dataset.domain === state.domain;
        el.classList.toggle('task-form-chip-active', active);
        el.setAttribute('aria-pressed', String(active));
      });
    }
  });

  const bindChips = (selector: string, apply: (el: HTMLElement) => void): void => {
    slot.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      el.addEventListener('click', () => {
        apply(el);
        slot.querySelectorAll<HTMLElement>(selector).forEach((other) => {
          const active = other === el;
          other.classList.toggle('task-form-chip-active', active);
          other.setAttribute('aria-pressed', String(active));
        });
      });
    });
  };
  bindChips('[data-assignee]', (el) => { state.assigneeId = el.dataset.assignee ? el.dataset.assignee : null; });
  bindChips('[data-domain]', (el) => { state.domain = el.dataset.domain as TaskDomain; state.domainChosen = true; });
  bindChips('[data-tier]', (el) => { state.durationTier = el.dataset.tier as DurationTier; });

  const repeatSelect = slot.querySelector<HTMLSelectElement>('[data-task-repeat]');
  const intervalWrap = slot.querySelector<HTMLElement>('[data-task-interval-wrap]');
  const intervalInput = slot.querySelector<HTMLInputElement>('[data-task-interval]');
  repeatSelect?.addEventListener('change', () => {
    state.repeat = repeatSelect.value as TaskRepeat;
    if (intervalInput) intervalInput.disabled = state.repeat !== 'interval';
  });

  slot.querySelector('[data-task-cancel]')?.addEventListener('click', () => callbacks.onCancel());

  const deleteButton = slot.querySelector<HTMLButtonElement>('[data-task-delete]');
  deleteButton?.addEventListener('click', async () => {
    if (!existing) return;
    // Two-step inline confirm (the previous window.confirm flow could
    // fail silently in some browsers/embedders): first click arms the
    // button, second click deletes. The result is then VERIFIED
    // against the server list, so a failed delete always surfaces.
    if (deleteButton.dataset.armed !== 'true') {
      deleteButton.dataset.armed = 'true';
      deleteButton.textContent = `Confirm delete “${existing.title}”?`;
      return;
    }
    deleteButton.disabled = true;
    try {
      await tasksApi.remove(existing.task_id);
      const remaining = await tasksApi.list().catch(() => null);
      if (remaining && remaining.some((task) => task.task_id === existing.task_id)) {
        throw new Error('the server still has this task');
      }
      callbacks.onSaved();
    } catch (error) {
      deleteButton.disabled = false;
      deleteButton.dataset.armed = '';
      deleteButton.textContent = 'Delete task';
      showError(error instanceof ApiError && (error.status === 401 || error.status === 403)
        ? 'Deleting a task needs admin — unlock it with the padlock in the menu first, then try again.'
        : `Could not delete the task: ${(error as Error).message}`);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    state.title = titleInput?.value ?? state.title;
    state.date = slot.querySelector<HTMLInputElement>('[data-task-date]')?.value ?? state.date;
    state.time = slot.querySelector<HTMLInputElement>('[data-task-time]')?.value || state.time;
    state.intervalDays = Number(slot.querySelector<HTMLInputElement>('[data-task-interval]')?.value ?? state.intervalDays);
    state.foothold = slot.querySelector<HTMLInputElement>('[data-task-foothold]')?.checked ?? false;
    if (!state.title.trim()) { showError('Give the task a title.'); return; }
    try {
      const input = buildTaskInput(state, participants, existing);
      if (existing) await tasksApi.update(existing.task_id, input);
      else await tasksApi.create(input);
      callbacks.onSaved();
    } catch (error) {
      showError(error instanceof ApiError && (error.status === 401 || error.status === 403)
        ? 'Saving changes needs admin — unlock admin in Household Setup first, then try again.'
        : `Could not save the task: ${(error as Error).message}`);
    }
  });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
