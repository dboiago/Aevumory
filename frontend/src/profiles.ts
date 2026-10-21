import './profiles.css';
import { goBack } from './navigation';
import { attachPolling, participantsApi, startPolling, type ParticipantDto } from './api-client';

/**
 * Profiles — the household member list (added 2026-10-20: previously an
 * individual profile was only reachable via Tasks → name). Tapping a
 * member opens their profile; this screen is what the flyout links to.
 */
export async function renderProfiles(target: HTMLDivElement): Promise<void> {
  let participants: ParticipantDto[] = await participantsApi.list().catch(() => []);

  const render = (): void => {
    target.innerHTML = `
      <main class="profiles-page" aria-label="Profiles">
        <header class="profiles-header">
          <button type="button" class="profiles-back" data-profiles-back>← Back</button>
          <h1>Profiles</h1>
        </header>
        ${participants.length === 0
          ? '<p class="profiles-empty">No profiles yet — add household members in Household Setup.</p>'
          : `<ul class="profiles-grid">${participants.map((p) => `
              <li>
                <button type="button" class="profiles-card" data-profile="${escapeHtml(p.participant_id)}">
                  <span class="profiles-avatar" aria-hidden="true">${p.representation_ref
                    ? `<img src="${escapeHtml(p.representation_ref)}" alt="">`
                    : escapeHtml(initials(p.display_name))}</span>
                  <span class="profiles-name">${escapeHtml(p.display_name)}</span>
                </button>
              </li>`).join('')}
            </ul>`}
      </main>`;
    target.querySelector('[data-profiles-back]')?.addEventListener('click', () => goBack('#tasks'));
    target.querySelectorAll<HTMLButtonElement>('[data-profile]').forEach((button) => {
      button.addEventListener('click', () => {
        window.location.hash = `#participant/${encodeURIComponent(button.dataset.profile ?? '')}`;
      });
    });
  };

  render();
  attachPolling(target, startPolling(async () => {
    const fresh = await participantsApi.list().catch(() => null);
    if (fresh) { participants = fresh; render(); }
  }));
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
