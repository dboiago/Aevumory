import './activity.css';
import { goBack } from './navigation';
import { getCachedAdminStatus, openAdminUnlockDialog, refreshAdminStatus } from './admin';
import {
  participantLedgerApi,
  participantRedemptionsApi,
  participantsApi,
  rewardAdjustmentsApi,
  rewardsApi,
  tasksApi,
  type RewardTransactionDto,
} from './api-client';

type ActivityRow = {
  at: string;
  kind: 'completion' | 'foothold' | 'pruning' | 'redemption' | 'adjustment';
  text: string;
  detail: string;
  transaction?: RewardTransactionDto;
  reversed: boolean;
};

/**
 * Activity — the "trust but verify" screen (product decision,
 * 2026-10-20). PIN-locked via admin mode: it lists what actually
 * happened — completions and the rewards they granted, redemptions,
 * and corrections — and lets an admin reverse a granted reward.
 * Reversal uses the existing corrective-transaction endpoint: history
 * is never edited, a compensating entry is appended, and the task's
 * cycle reopens. Redemption reversal is intentionally not offered:
 * the backend treats refunding a redemption as a distinct,
 * not-yet-implemented concept (see task-execution.service.ts).
 */
export async function renderActivity(target: HTMLDivElement): Promise<void> {
  const status = getCachedAdminStatus() ?? await refreshAdminStatus();

  if (!status.pin_configured) {
    target.innerHTML = lockedShell('Set an admin PIN in Household Setup first — Activity is PIN-locked so rewards cannot be quietly changed.');
    wireLocked(target);
    return;
  }
  if (!status.authenticated) {
    target.innerHTML = lockedShell('Activity is locked. Unlock admin mode to see household activity and reverse rewards.');
    wireLocked(target);
    return;
  }

  target.innerHTML = `<main class="activity" aria-label="Activity"><p class="activity-loading">Loading activity…</p></main>`;
  const rows = await loadRows().catch(() => [] as ActivityRow[]);
  paint(target, rows);
}

function lockedShell(message: string): string {
  return `
    <main class="activity" aria-label="Activity">
      <header class="activity-header">
        <button type="button" class="activity-back" data-activity-back>← Back</button>
        <h1>Activity</h1>
      </header>
      <section class="activity-locked">
        <p>${message}</p>
        <button type="button" class="activity-primary" data-activity-unlock>🔒 Unlock admin</button>
      </section>
    </main>
  `;
}

function wireLocked(target: HTMLDivElement): void {
  target.querySelector('[data-activity-back]')?.addEventListener('click', () => goBack(''));
  target.querySelector('[data-activity-unlock]')?.addEventListener('click', async () => {
    if (await openAdminUnlockDialog()) void renderActivity(target);
  });
}

async function loadRows(): Promise<ActivityRow[]> {
  const [participants, tasks, rewards] = await Promise.all([
    participantsApi.list().catch(() => []),
    tasksApi.list().catch(() => []),
    rewardsApi.list().catch(() => []),
  ]);
  const names = new Map(participants.map((p) => [p.participant_id, p.display_name]));
  const taskTitles = new Map(tasks.map((t) => [t.task_id, t.title]));
  const rewardTitles = new Map(rewards.map((r) => [r.id, r.title]));

  const rows: ActivityRow[] = [];
  for (const participant of participants) {
    const [ledger, redemptions] = await Promise.all([
      participantLedgerApi.get(participant.participant_id).catch(() => null),
      participantRedemptionsApi.list(participant.participant_id).catch(() => []),
    ]);
    const reversedIds = new Set((ledger?.adjustments ?? []).map((a) => a.original_transaction_id));
    for (const tx of ledger?.transactions ?? []) {
      if (tx.reward_event_type === 'reward_redemption') continue; // shown via redemptions below
      const who = names.get(tx.reward_owner_user_id ?? '') ?? 'Household';
      const title = taskTitles.get(tx.task_id ?? '') ?? 'a task';
      rows.push({
        at: tx.processed_at,
        kind: tx.reward_event_type === 'foothold_initiation' ? 'foothold' : tx.reward_event_type === 'deductive_pruning' ? 'pruning' : 'completion',
        text: tx.reward_event_type === 'foothold_initiation'
          ? `Started “${title}” (Foothold)`
          : tx.reward_event_type === 'deductive_pruning'
            ? `Pruned “${title}” — didn’t need doing (Reason)`
            : `Completed “${title}”`,
        detail: tx.reward_event_type === 'deductive_pruning'
          ? `${who} · +${tx.yield.primary_xp} Reason XP · no credits`
          : `${who} · +${tx.yield.primary_xp} XP · +${tx.yield.credits_earned} credits`,
        transaction: tx,
        reversed: reversedIds.has(tx.transaction_id),
      });
    }
    for (const adj of ledger?.adjustments ?? []) {
      rows.push({
        at: adj.created_at,
        kind: 'adjustment',
        text: adj.reason === 'system_correction' ? 'Completion undone (reward reversed)' : 'Reward corrected by admin',
        detail: `${adj.xp_adjustments.map((x) => `${x.xp_delta} XP (${x.discipline})`).join(', ')} · ${adj.credits_delta} credits`,
        reversed: true,
      });
    }
    for (const redemption of redemptions) {
      rows.push({
        at: redemption.redeemed_at,
        kind: 'redemption',
        text: `Redeemed “${rewardTitles.get(redemption.reward_id) ?? 'a reward'}”`,
        detail: `${names.get(redemption.user_id) ?? 'Someone'} · −${redemption.final_cost_paid} credits`,
        reversed: false,
      });
    }
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100);
}

function paint(target: HTMLDivElement, rows: ActivityRow[]): void {
  target.innerHTML = `
    <main class="activity" aria-label="Activity">
      <header class="activity-header">
        <button type="button" class="activity-back" data-activity-back>← Back</button>
        <h1>Activity</h1>
        <p class="activity-sub">Recent completions, redemptions, and corrections. Reversing a completion removes its reward and reopens the task.</p>
      </header>
      ${rows.length === 0 ? '<p class="activity-empty">Nothing yet — completed tasks and redeemed rewards will show up here.</p>' : `
      <ul class="activity-list">
        ${rows.map((row, index) => `
          <li class="activity-row">
            <div class="activity-row-main">
              <span class="activity-row-text">${escapeHtml(row.text)}</span>
              <span class="activity-row-detail">${escapeHtml(row.detail)} · ${formatWhen(row.at)}</span>
            </div>
            ${row.transaction && !row.reversed && row.kind !== 'foothold'
              ? `<button type="button" class="activity-reverse" data-activity-reverse="${index}">Reverse</button>`
              : row.reversed && row.transaction ? '<span class="activity-reversed">Reversed</span>' : ''}
            ${row.transaction && !row.reversed && row.kind === 'foothold'
              ? `<button type="button" class="activity-reverse" data-activity-reverse="${index}">Reverse</button>` : ''}
          </li>`).join('')}
      </ul>`}
      <p class="activity-error" data-activity-error role="alert" hidden></p>
    </main>
  `;

  target.querySelector('[data-activity-back]')?.addEventListener('click', () => goBack(''));
  target.querySelectorAll<HTMLButtonElement>('[data-activity-reverse]').forEach((button) => {
    button.addEventListener('click', async () => {
      const row = rows[Number(button.dataset.activityReverse)];
      const tx = row?.transaction;
      if (!tx) return;
      if (!window.confirm(`Reverse this reward? ${row.detail}. The task will reopen.`)) return;
      try {
        await rewardAdjustmentsApi.create({
          original_transaction_id: tx.transaction_id,
          reason: 'admin_reversal',
          xp_adjustments: [
            ...(tx.yield.primary_discipline ? [{ discipline: tx.yield.primary_discipline, xp_delta: -tx.yield.primary_xp }] : []),
            ...tx.yield.secondary_yields.map((y) => ({ discipline: y.discipline, xp_delta: -y.xp })),
          ],
          credits_delta: -tx.yield.credits_earned,
          created_by_user_id: 'admin',
        });
        void renderActivity(target);
      } catch (error) {
        const box = target.querySelector<HTMLElement>('[data-activity-error]');
        if (box) { box.textContent = `Could not reverse: ${(error as Error).message}`; box.hidden = false; }
      }
    });
  });
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
