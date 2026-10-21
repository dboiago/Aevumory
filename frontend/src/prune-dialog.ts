import './prune-dialog.css';
import type { HouseholdParticipant } from './tasks';
import type { PruneActionInput } from './task-board';

export interface PruneDialogTaskOption {
  taskId: string;
  title: string;
}

const REASON_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'another_task_satisfied', label: 'Another task already covered it' },
  { code: 'external_event_resolved', label: 'An outside event took care of it' },
  { code: 'condition_no_longer_exists', label: 'The condition no longer exists' },
  { code: 'established_redundant', label: 'Looked into it — the task is redundant' },
];

/** Resolution dialog for a task that turned out not to be needed. */
export function openPruneDialog(input: {
  taskTitle: string;
  participants: HouseholdParticipant[];
  defaultActorId?: string;
  otherTasks: PruneDialogTaskOption[];
}): Promise<PruneActionInput | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'prune-dialog';
    dialog.innerHTML = `
      <form class="prune-dialog-form">
        <header class="prune-dialog-header">
          <h2>Didn’t need doing</h2>
          <button type="button" class="prune-dialog-close" data-prune-close aria-label="Close">×</button>
        </header>
        <p class="prune-dialog-sub">“${escapeHtml(input.taskTitle)}” won’t be done — tell Aevumory why, so the record stays honest.</p>
        <div class="prune-dialog-fields">
          <label>Why wasn’t it needed?
            <select name="reason_code" data-prune-reason>
              ${REASON_OPTIONS.map((option) => `<option value="${option.code}">${option.label}</option>`).join('')}
            </select>
          </label>
          <label data-prune-linked-wrap hidden>Which task covered it?
            <select name="linked_task_id" data-prune-linked>
              ${input.otherTasks.map((task) => `<option value="${escapeHtml(task.taskId)}">${escapeHtml(task.title)}</option>`).join('')}
            </select>
          </label>
          <label class="prune-dialog-recognition">
            <span><input type="checkbox" name="recognize" data-prune-recognize> Recognize the person who spotted it</span>
          </label>
          <label data-prune-actor-wrap hidden>Who spotted it?
            <select name="completed_by_user_id" data-prune-actor>
              ${input.participants.map((p) => `<option value="${escapeHtml(p.id)}"${p.id === input.defaultActorId ? ' selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
            </select>
          </label>
          <label>Note (optional)
            <input type="text" name="note" maxlength="140" placeholder="e.g. Checked — already fixed">
          </label>
        </div>
        <footer class="prune-dialog-actions">
          <button type="button" class="prune-dialog-secondary" data-prune-close>Cancel</button>
          <button type="submit" class="prune-dialog-primary">Mark not needed</button>
        </footer>
        <p class="prune-dialog-hint">This records why the task wasn’t needed. Recognition is optional; no Credits are awarded because the task wasn’t completed.</p>
      </form>
    `;
    document.body.append(dialog);
    dialog.showModal();

    const reasonSelect = dialog.querySelector<HTMLSelectElement>('[data-prune-reason]');
    const linkedWrap = dialog.querySelector<HTMLElement>('[data-prune-linked-wrap]');
    const recognize = dialog.querySelector<HTMLInputElement>('[data-prune-recognize]');
    const actorWrap = dialog.querySelector<HTMLElement>('[data-prune-actor-wrap]');
    const syncFields = (): void => {
      if (linkedWrap) linkedWrap.hidden = reasonSelect?.value !== 'another_task_satisfied';
      if (actorWrap) actorWrap.hidden = !recognize?.checked;
    };
    reasonSelect?.addEventListener('change', syncFields);
    recognize?.addEventListener('change', syncFields);
    syncFields();

    let settled = false;
    const settle = (value: PruneActionInput | null): void => {
      if (settled) return;
      settled = true;
      dialog.close();
      resolve(value);
    };
    dialog.addEventListener('close', () => { dialog.remove(); if (!settled) { settled = true; resolve(null); } });
    dialog.querySelector('[data-prune-close]')?.addEventListener('click', () => settle(null));

    const readFields = (): Omit<PruneActionInput, 'award_reason_yield'> => {
      const form = dialog.querySelector('form') as HTMLFormElement;
      const data = new FormData(form);
      const reason = String(data.get('reason_code') ?? '');
      return {
        reason_code: reason,
        note: String(data.get('note') ?? '').trim() || undefined,
        linked_task_id: reason === 'another_task_satisfied' ? (String(data.get('linked_task_id') ?? '') || undefined) : undefined,
        completed_by_user_id: recognize?.checked ? (String(data.get('completed_by_user_id') ?? '') || undefined) : undefined,
      };
    };

    dialog.querySelector('form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      settle({ ...readFields(), award_reason_yield: recognize?.checked ?? false });
    });
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
