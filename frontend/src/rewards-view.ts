import './rewards.css';
import {
  adminApi,
  attachPolling,
  participantLedgerApi,
  rewardsApi,
  startPolling,
  type ParticipantDto,
  type RewardCategoryDto,
  type RewardDto,
} from './api-client';
import type { RewardsQuery } from './rewards';

interface RewardsPageState {
  participants: ParticipantDto[];
  rewards: RewardDto[];
  selectedParticipantId: string | null;
  balance: number | null;
  authorized: boolean;
  showCreateForm: boolean;
  editingRewardId: string | null;
  error: string | null;
  pendingRewardId: string | null;
}

const CATEGORY_LABELS: Record<RewardCategoryDto, string> = {
  personal_leisure: 'Personal leisure',
  household: 'Household',
  experience: 'Experience',
};

export async function renderRewards(target: HTMLDivElement, query: RewardsQuery): Promise<void> {
  const initial = await query.getState();
  const state: RewardsPageState = {
    participants: initial.participants,
    rewards: initial.rewards,
    selectedParticipantId: initial.participants[0]?.participant_id ?? null,
    balance: null,
    authorized: false,
    showCreateForm: false,
    editingRewardId: null,
    error: null,
    pendingRewardId: null,
  };

  const rerender = (): void => {
    target.innerHTML = renderPage(state);
    wire(target, state, rerender);
  };

  await refreshBalance(state);
  rerender();

  attachPolling(target, startPolling(() => pollRefresh(query, state, rerender)));
}

// Skips merging fresh data while the admin is mid-edit/mid-redemption, so a
// periodic refetch never clobbers in-progress form input (Phase 7 polling).
async function pollRefresh(query: RewardsQuery, state: RewardsPageState, rerender: () => void): Promise<void> {
  if (state.showCreateForm || state.editingRewardId || state.pendingRewardId) return;

  const fresh = await query.getState();
  state.participants = fresh.participants;
  state.rewards = fresh.rewards;
  if (state.selectedParticipantId && !fresh.participants.some((participant) => participant.participant_id === state.selectedParticipantId)) {
    state.selectedParticipantId = fresh.participants[0]?.participant_id ?? null;
  }
  await refreshBalance(state);
  rerender();
}

async function refreshBalance(state: RewardsPageState): Promise<void> {
  if (!state.selectedParticipantId) {
    state.balance = null;
    return;
  }

  try {
    const ledger = await participantLedgerApi.get(state.selectedParticipantId);
    state.balance = ledger.balance;
  } catch {
    state.balance = null;
  }
}

function renderPage(state: RewardsPageState): string {
  return `
    <main class="rewards-page" aria-label="Aevumory Rewards">
      <header class="rewards-header">
        <button type="button" class="rewards-back" data-rewards-back>← Back</button>
        <h1>Rewards</h1>
      </header>
      ${state.error ? `<p class="rewards-error" role="alert">${escapeHtml(state.error)}</p>` : ''}
      ${renderParticipantSection(state)}
      ${renderAdminSection(state)}
      ${state.showCreateForm ? renderRewardForm(null) : ''}
      ${renderCatalogue(state)}
    </main>
  `;
}

function renderParticipantSection(state: RewardsPageState): string {
  if (!state.participants.length) {
    return '<p class="rewards-empty">Add a participant in Household Setup before redeeming rewards.</p>';
  }

  const options = state.participants
    .map(
      (participant) =>
        `<option value="${escapeHtml(participant.participant_id)}" ${participant.participant_id === state.selectedParticipantId ? 'selected' : ''}>${escapeHtml(participant.display_name)}</option>`,
    )
    .join('');

  const balanceLabel = state.balance === null ? '—' : `${formatCredits(state.balance)} credits`;

  return `
    <section class="rewards-participant-bar" aria-label="Redeeming participant">
      <label class="rewards-participant-select">Redeeming as
        <select data-rewards-participant>${options}</select>
      </label>
      <span class="rewards-balance">Balance: <strong>${escapeHtml(balanceLabel)}</strong></span>
    </section>
  `;
}

function renderAdminSection(state: RewardsPageState): string {
  if (!state.authorized) {
    return `
      <section class="rewards-admin-bar" aria-label="Admin sign-in">
        <form class="rewards-inline-form" data-rewards-pin-form>
          <input type="password" inputmode="numeric" pattern="[0-9]*" name="pin" placeholder="Admin PIN" autocomplete="current-password" required>
          <button type="submit" class="rewards-secondary-action">Unlock catalogue editing</button>
        </form>
      </section>
    `;
  }

  return `
    <section class="rewards-admin-bar" aria-label="Admin actions">
      <span class="rewards-admin-status">Admin actions unlocked.</span>
      ${!state.showCreateForm ? '<button type="button" class="rewards-primary-action" data-rewards-add>Add a reward</button>' : ''}
    </section>
  `;
}

function renderCatalogue(state: RewardsPageState): string {
  if (!state.rewards.length) {
    return `
      <p class="rewards-empty">No rewards yet.${
        state.authorized && !state.showCreateForm
          ? ' <button type="button" class="rewards-inline-action" data-rewards-add>Add a reward</button>'
          : ''
      }</p>
    `;
  }

  return `
    <ul class="rewards-list" aria-label="Reward catalogue">
      ${state.rewards.map((reward) => renderRewardItem(reward, state)).join('')}
    </ul>
  `;
}

function renderRewardItem(reward: RewardDto, state: RewardsPageState): string {
  if (state.editingRewardId === reward.id) {
    return `<li class="rewards-card">${renderRewardForm(reward)}</li>`;
  }

  const affordable = state.balance !== null && reward.is_active && state.balance >= reward.base_cost;
  const disabledReason = !reward.is_active
    ? 'Unavailable'
    : state.balance === null
      ? 'Select a participant'
      : 'Not enough credits';
  const pending = state.pendingRewardId === reward.id;

  return `
    <li class="rewards-card ${reward.is_active ? '' : 'rewards-card-inactive'}">
      <div class="rewards-card-main">
        <h3>${escapeHtml(reward.title)}</h3>
        ${reward.description ? `<p class="rewards-card-description">${escapeHtml(reward.description)}</p>` : ''}
        <span class="rewards-card-category">${escapeHtml(CATEGORY_LABELS[reward.category])}</span>
      </div>
      <div class="rewards-card-footer">
        <span class="rewards-cost" aria-label="Credit cost">${reward.base_cost} credits</span>
        <div class="rewards-card-actions">
          ${
            state.authorized
              ? `<button type="button" class="rewards-inline-action" data-rewards-edit="${escapeHtml(reward.id)}">Edit</button>`
              : ''
          }
          <button
            type="button"
            class="rewards-redeem-action"
            data-rewards-redeem="${escapeHtml(reward.id)}"
            ${affordable && !pending ? '' : 'disabled'}
            aria-label="${affordable ? `Redeem ${escapeHtml(reward.title)}` : `${disabledReason}: ${escapeHtml(reward.title)}`}"
          >
            ${pending ? 'Redeeming…' : affordable ? 'Redeem' : disabledReason}
          </button>
        </div>
      </div>
    </li>
  `;
}

function renderRewardForm(reward: RewardDto | null): string {
  const isEdit = reward !== null;
  return `
    <form class="rewards-form ${isEdit ? '' : 'rewards-create-form'}" data-rewards-reward-form data-reward-id="${isEdit ? escapeHtml(reward.id) : ''}">
      <label>Title
        <input type="text" name="title" maxlength="60" value="${isEdit ? escapeHtml(reward.title) : ''}" required>
      </label>
      <label>Description
        <textarea name="description" maxlength="240" rows="2">${isEdit ? escapeHtml(reward.description ?? '') : ''}</textarea>
      </label>
      <label>Category
        <select name="category">
          ${(Object.keys(CATEGORY_LABELS) as RewardCategoryDto[])
            .map(
              (category) =>
                `<option value="${category}" ${isEdit && reward.category === category ? 'selected' : ''}>${CATEGORY_LABELS[category]}</option>`,
            )
            .join('')}
        </select>
      </label>
      <label>Credit cost
        <input type="number" name="base_cost" min="1" step="1" value="${isEdit ? reward.base_cost : ''}" required>
      </label>
      <label class="rewards-form-checkbox">
        <input type="checkbox" name="is_active" ${!isEdit || reward.is_active ? 'checked' : ''}>
        Active
      </label>
      <div class="rewards-form-actions">
        <button type="submit" class="rewards-primary-action">${isEdit ? 'Save' : 'Add reward'}</button>
        <button type="button" class="rewards-secondary-action" data-rewards-cancel-form>Cancel</button>
      </div>
    </form>
  `;
}

function wire(target: HTMLDivElement, state: RewardsPageState, rerender: () => void): void {
  target.querySelector<HTMLButtonElement>('[data-rewards-back]')?.addEventListener('click', () => {
    window.location.hash = '';
  });

  target.querySelector<HTMLSelectElement>('[data-rewards-participant]')?.addEventListener('change', async (event) => {
    state.selectedParticipantId = (event.currentTarget as HTMLSelectElement).value;
    state.balance = null;
    rerender();
    await refreshBalance(state);
    rerender();
  });

  target.querySelector<HTMLFormElement>('[data-rewards-pin-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const pin = (form.elements.namedItem('pin') as HTMLInputElement).value;

    try {
      await adminApi.login(pin);
      state.authorized = true;
      state.error = null;
    } catch (error) {
      state.error = errorMessage(error);
    }
    rerender();
  });

  target.querySelector<HTMLButtonElement>('[data-rewards-add]')?.addEventListener('click', () => {
    state.showCreateForm = true;
    state.editingRewardId = null;
    rerender();
  });

  target.querySelectorAll<HTMLButtonElement>('[data-rewards-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      state.editingRewardId = button.dataset.rewardsEdit ?? null;
      state.showCreateForm = false;
      rerender();
    });
  });

  target.querySelectorAll<HTMLButtonElement>('[data-rewards-cancel-form]').forEach((button) => {
    button.addEventListener('click', () => {
      state.showCreateForm = false;
      state.editingRewardId = null;
      rerender();
    });
  });

  target.querySelector<HTMLFormElement>('[data-rewards-reward-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const rewardId = form.dataset.rewardId || undefined;
    const input = {
      title: (form.elements.namedItem('title') as HTMLInputElement).value,
      description: (form.elements.namedItem('description') as HTMLTextAreaElement).value || undefined,
      category: (form.elements.namedItem('category') as HTMLSelectElement).value as RewardCategoryDto,
      base_cost: Number((form.elements.namedItem('base_cost') as HTMLInputElement).value),
      is_active: (form.elements.namedItem('is_active') as HTMLInputElement).checked,
    };

    try {
      if (rewardId) {
        const updated = await rewardsApi.update(rewardId, input);
        state.rewards = state.rewards.map((reward) => (reward.id === updated.id ? updated : reward));
        state.editingRewardId = null;
      } else {
        const created = await rewardsApi.create(input);
        state.rewards = [...state.rewards, created];
        state.showCreateForm = false;
      }
      state.error = null;
    } catch (error) {
      state.error = errorMessage(error);
    }
    rerender();
  });

  target.querySelectorAll<HTMLButtonElement>('[data-rewards-redeem]').forEach((button) => {
    button.addEventListener('click', async () => {
      const rewardId = button.dataset.rewardsRedeem;
      if (!rewardId || !state.selectedParticipantId) return;

      state.pendingRewardId = rewardId;
      rerender();

      try {
        const result = await rewardsApi.redeem(rewardId, {
          user_id: state.selectedParticipantId,
          idempotency_key: crypto.randomUUID(),
        });
        state.balance = result.balance;
        state.error = null;
      } catch (error) {
        state.error = errorMessage(error);
      }

      state.pendingRewardId = null;
      rerender();
    });
  });
}

function formatCredits(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
