import './admin.css';
import { adminApi, type AdminSessionStatusDto } from './api-client';

/**
 * Admin mode (product decision, 2026-10-20): enter the PIN once to
 * unlock admin capabilities; a padlock action locks again. The session
 * itself is the server's cookie (30-minute TTL) — this module is the
 * shared UI state + the unlock dialog used by the flyout padlock and
 * the Activity screen, so there is exactly one unlock flow.
 */

let cachedStatus: AdminSessionStatusDto | null = null;
const listeners = new Set<(status: AdminSessionStatusDto) => void>();

export function onAdminStatusChange(listener: (status: AdminSessionStatusDto) => void): void {
  listeners.add(listener);
}

function publish(status: AdminSessionStatusDto): void {
  cachedStatus = status;
  listeners.forEach((listener) => listener(status));
}

export async function refreshAdminStatus(): Promise<AdminSessionStatusDto> {
  try {
    const status = await adminApi.status();
    publish(status);
    return status;
  } catch {
    const fallback: AdminSessionStatusDto = { pin_configured: true, authenticated: false };
    publish(fallback);
    return fallback;
  }
}

export function getCachedAdminStatus(): AdminSessionStatusDto | null {
  return cachedStatus;
}

export async function lockAdmin(): Promise<void> {
  try { await adminApi.logout(); } catch { /* already locked/expired */ }
  publish({ pin_configured: cachedStatus?.pin_configured ?? true, authenticated: false });
}

/** Shows the PIN unlock dialog; resolves true when admin mode is on. */
export function openAdminUnlockDialog(): Promise<boolean> {
  return new Promise((resolve) => {
    document.querySelector('[data-admin-dialog]')?.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'admin-dialog-backdrop';
    backdrop.dataset.adminDialog = '';
    backdrop.innerHTML = `
      <form class="admin-dialog" role="dialog" aria-modal="true" aria-label="Unlock admin mode">
        <h2>Admin mode</h2>
        <p>Enter the household admin PIN to unlock admin actions. It stays unlocked until you lock it or the session expires.</p>
        <label>
          <span>PIN</span>
          <input type="password" inputmode="numeric" autocomplete="off" data-admin-pin required />
        </label>
        <p class="admin-dialog-error" data-admin-error role="alert" hidden></p>
        <div class="admin-dialog-actions">
          <button type="submit" class="admin-dialog-primary">Unlock</button>
          <button type="button" class="admin-dialog-secondary" data-admin-cancel>Cancel</button>
        </div>
      </form>
    `;
    document.body.appendChild(backdrop);

    const close = (result: boolean): void => {
      backdrop.remove();
      resolve(result);
    };
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) close(false);
    });
    backdrop.querySelector('[data-admin-cancel]')?.addEventListener('click', () => close(false));

    const form = backdrop.querySelector<HTMLFormElement>('form');
    const input = backdrop.querySelector<HTMLInputElement>('[data-admin-pin]');
    input?.focus();
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const pin = input?.value ?? '';
      try {
        await adminApi.login(pin);
        await refreshAdminStatus();
        close(true);
      } catch {
        const error = backdrop.querySelector<HTMLElement>('[data-admin-error]');
        if (error) {
          error.textContent = 'That PIN did not work. Try again.';
          error.hidden = false;
        }
        if (input) { input.value = ''; input.focus(); }
      }
    });
  });
}
