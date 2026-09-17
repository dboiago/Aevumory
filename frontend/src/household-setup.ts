import './household-setup.css';
import { adminApi, householdApi, participantsApi, type HouseholdDto, type ParticipantDto } from './api-client';

interface SetupState {
  household: HouseholdDto;
  participants: ParticipantDto[];
  authorized: boolean;
  editingParticipantId: string | null;
  error: string | null;
}

export async function renderHouseholdSetup(target: HTMLDivElement): Promise<void> {
  const state: SetupState = {
    household: await householdApi.get(),
    participants: await participantsApi.list(),
    authorized: false,
    editingParticipantId: null,
    error: null,
  };

  const rerender = (): void => {
    target.innerHTML = renderPage(state);
    wire(target, state, rerender);
  };

  rerender();
}

function renderPage(state: SetupState): string {
  return `
    <main class="household-setup-page" aria-label="Aevumory Household Setup">
      <header class="household-setup-header">
        <button type="button" class="household-setup-back" data-setup-back>← Back</button>
        <h1>Household Setup</h1>
      </header>
      ${state.error ? `<p class="household-setup-error" role="alert">${escapeHtml(state.error)}</p>` : ''}
      ${renderAdminSection(state)}
      ${renderParticipantsSection(state)}
    </main>
  `;
}

function renderAdminSection(state: SetupState): string {
  if (!state.household.admin_pin_set) {
    return `
      <section class="household-setup-card" aria-label="Set up household admin PIN">
        <h2>Set up household admin PIN</h2>
        <p>This PIN protects administrative actions such as adding participants. It is not required for everyday household use.</p>
        <form class="household-setup-form" data-pin-setup-form>
          <label>New PIN
            <input type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="12" name="pin" autocomplete="new-password" required>
          </label>
          <label>Confirm PIN
            <input type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="12" name="confirm" autocomplete="new-password" required>
          </label>
          <button type="submit" class="household-setup-primary-action">Set PIN</button>
        </form>
      </section>
    `;
  }

  if (!state.authorized) {
    return `
      <section class="household-setup-card" aria-label="Admin sign-in">
        <h2>Admin sign-in</h2>
        <p>Enter the household admin PIN to add or edit participants.</p>
        <form class="household-setup-form" data-pin-login-form>
          <label>Admin PIN
            <input type="password" inputmode="numeric" pattern="[0-9]*" name="pin" autocomplete="current-password" required>
          </label>
          <button type="submit" class="household-setup-primary-action">Unlock</button>
        </form>
      </section>
    `;
  }

  return `
    <section class="household-setup-card" aria-label="Admin unlocked">
      <p class="household-setup-status">Admin actions unlocked for this session.</p>
    </section>
  `;
}

function renderParticipantsSection(state: SetupState): string {
  const list = state.participants.length
    ? `<ul class="household-setup-participant-list">${state.participants.map((participant) => renderParticipantRow(participant, state)).join('')}</ul>`
    : `<p class="household-setup-empty">No participants yet.${state.authorized ? '' : ' An administrator can add the first participant.'}</p>`;

  const addForm = state.authorized
    ? `
      <form class="household-setup-form household-setup-add-form" data-add-participant-form>
        <label>Display name
          <input type="text" name="display_name" maxlength="60" required>
        </label>
        <button type="submit" class="household-setup-primary-action">Add participant</button>
      </form>
    `
    : '';

  return `
    <section class="household-setup-card" aria-label="Participants">
      <h2>Participants</h2>
      ${list}
      ${addForm}
    </section>
  `;
}

function renderParticipantRow(participant: ParticipantDto, state: SetupState): string {
  if (state.editingParticipantId === participant.participant_id) {
    return `
      <li class="household-setup-participant-row" data-participant-id="${escapeHtml(participant.participant_id)}">
        <form class="household-setup-inline-form" data-edit-participant-form>
          <input type="text" name="display_name" value="${escapeHtml(participant.display_name)}" maxlength="60" required>
          <button type="submit" class="household-setup-secondary-action">Save</button>
          <button type="button" class="household-setup-secondary-action" data-cancel-edit>Cancel</button>
        </form>
      </li>
    `;
  }

  const actions = state.authorized
    ? `
      <span class="household-setup-participant-actions">
        <button type="button" class="household-setup-inline-action" data-edit-participant="${escapeHtml(participant.participant_id)}">Rename</button>
        <button type="button" class="household-setup-inline-action" data-remove-participant="${escapeHtml(participant.participant_id)}">Remove</button>
      </span>
    `
    : '';

  return `
    <li class="household-setup-participant-row" data-participant-id="${escapeHtml(participant.participant_id)}">
      <span class="household-setup-participant-name">${escapeHtml(participant.display_name)}</span>
      ${actions}
    </li>
  `;
}

function wire(target: HTMLDivElement, state: SetupState, rerender: () => void): void {
  target.querySelector<HTMLButtonElement>('[data-setup-back]')?.addEventListener('click', () => {
    window.location.hash = '';
  });

  target.querySelector<HTMLFormElement>('[data-pin-setup-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const pin = (form.elements.namedItem('pin') as HTMLInputElement).value;
    const confirmPin = (form.elements.namedItem('confirm') as HTMLInputElement).value;

    if (pin !== confirmPin) {
      state.error = 'PIN and confirmation do not match.';
      rerender();
      return;
    }

    try {
      await adminApi.setupPin(pin);
      state.household = await householdApi.get();
      state.authorized = true;
      state.error = null;
    } catch (error) {
      state.error = errorMessage(error);
    }
    rerender();
  });

  target.querySelector<HTMLFormElement>('[data-pin-login-form]')?.addEventListener('submit', async (event) => {
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

  target.querySelector<HTMLFormElement>('[data-add-participant-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const displayName = (form.elements.namedItem('display_name') as HTMLInputElement).value;

    try {
      const participant = await participantsApi.create({ display_name: displayName });
      state.participants = [...state.participants, participant];
      state.error = null;
    } catch (error) {
      state.error = errorMessage(error);
    }
    rerender();
  });

  target.querySelectorAll<HTMLButtonElement>('[data-edit-participant]').forEach((button) => {
    button.addEventListener('click', () => {
      state.editingParticipantId = button.dataset.editParticipant ?? null;
      rerender();
    });
  });

  target.querySelectorAll<HTMLButtonElement>('[data-cancel-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      state.editingParticipantId = null;
      rerender();
    });
  });

  target.querySelector<HTMLFormElement>('[data-edit-participant-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const row = form.closest<HTMLElement>('[data-participant-id]');
    const participantId = row?.dataset.participantId;
    const displayName = (form.elements.namedItem('display_name') as HTMLInputElement).value;
    if (!participantId) return;

    try {
      const updated = await participantsApi.update(participantId, { display_name: displayName });
      state.participants = state.participants.map((participant) =>
        participant.participant_id === updated.participant_id ? updated : participant,
      );
      state.editingParticipantId = null;
      state.error = null;
    } catch (error) {
      state.error = errorMessage(error);
    }
    rerender();
  });

  target.querySelectorAll<HTMLButtonElement>('[data-remove-participant]').forEach((button) => {
    button.addEventListener('click', async () => {
      const participantId = button.dataset.removeParticipant;
      if (!participantId) return;

      try {
        await participantsApi.remove(participantId);
        state.participants = state.participants.filter(
          (participant) => participant.participant_id !== participantId,
        );
        state.error = null;
      } catch (error) {
        state.error = errorMessage(error);
      }
      rerender();
    });
  });
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
