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

/**
 * "Didn't need doing" — the resolution dialog behind the board's
 * Not needed button. Two outcomes, kept visibly distinct:
 *  - Mark not needed: the ordinary resolution — recorded, no reward.
 *  - Prune (Reason): Deductive Pruning — the person who established the
 *    task was unnecessary earns Reason XP (no Credits), per
 *    PROGRESSION_SPEC.md §12. Requires the causal-evidence reason above.
 */
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
          <label>Who spotted it?
            <select name="completed_by_user_id" data-prune-actor>
              ${input.participants.map((p) => `<option value="${escapeHtml(p.id)}"${p.id === input.defaultActorId ? ' selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
            </select>
          </label>
          <label>Note (optional)
            <input type="text" name="note" maxlength="140" placeholder="e.g. Checked — already fixed">
          </label>
        </div>
        <footer class="prune-dialog-actions">
          <button type="button" class="prune-dialog-secondary" data-prune-ordinary>Just mark not needed</button>
          <button type="submit" class="prune-dialog-primary">Prune · earn Reason XP</button>
        </footer>
        <p class="prune-dialog-hint">Pruning credits the person who figured it out, with Reason XP based on the work avoided. No Credits — the work itself wasn’t done. An admin can reverse it in Activity.</p>
      </form>
    `;
    document.body.append(dialog);
    dialog.showModal();

    const reasonSelect = dialog.querySelector<HTMLSelectElement>('[data-prune-reason]');
    const linkedWrap = dialog.querySelector<HTMLElement>('[data-prune-linked-wrap]');
    const syncLinked = (): void => {
      if (linkedWrap) linkedWrap.hidden = reasonSelect?.value !== 'another_task_satisfied';
    };
    reasonSelect?.addEventListener('change', syncLinked);
    syncLinked();

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
        completed_by_user_id: String(data.get('completed_by_user_id') ?? '') || undefined,
      };
    };

    dialog.querySelector('[data-prune-ordinary]')?.addEventListener('click', () => {
      settle({ ...readFields(), award_reason_yield: false });
    });
    dialog.querySelector('form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      settle({ ...readFields(), award_reason_yield: true });
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
