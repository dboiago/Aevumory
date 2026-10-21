import './settings.css';
import { IDLE_OPTIONS_MINUTES, getDefaultScreen, getIdleMinutes, goBack, setDefaultScreen, setIdleMinutes } from './navigation';

const DEFAULT_SCREEN_OPTIONS: Array<{ hash: string; label: string }> = [
  { hash: '#tasks', label: 'Tasks' },
  { hash: '#calendar', label: 'Calendar' },
  { hash: '#rewards', label: 'Rewards' },
  { hash: '#profiles', label: 'Profiles' },
  { hash: '#countdown', label: 'Countdown' },
];
import { THEMES, applyTheme, getStoredTheme, type Theme } from './themes';

/**
 * Settings screen. For now this is the home for theme selection, which
 * used to be the floating prototype theme-switcher widget (removed —
 * see themes.ts). Add further household/app settings here rather than
 * as floating controls.
 */
export function renderSettings(target: HTMLDivElement): void {
  const current = getStoredTheme();

  target.innerHTML = `
    <main class="settings" aria-label="Settings">
      <header class="settings-header">
        <button type="button" class="settings-back" data-settings-back>← Back</button>
        <h1>Settings</h1>
      </header>
      <section class="settings-section" aria-label="Theme">
        <h2>Theme</h2>
        <label class="settings-theme-label" for="settings-theme">Colour theme</label>
        <select id="settings-theme" class="settings-theme-select" data-settings-theme>
          ${THEMES.map((theme) => `<option value="${theme}"${theme === current ? ' selected' : ''}>${theme}</option>`).join('')}
        </select>
      </section>
      <section class="settings-section" aria-label="Display">
        <h2>Display</h2>
        <label class="settings-theme-label" for="settings-idle">Return to Ambient when idle</label>
        <select id="settings-idle" class="settings-theme-select" data-settings-idle>
          ${IDLE_OPTIONS_MINUTES.map((minutes) => `<option value="${minutes}"${minutes === getIdleMinutes() ? ' selected' : ''}>${minutes === 0 ? 'Never' : `After ${minutes} min`}</option>`).join('')}
        </select>
        <label class="settings-theme-label" for="settings-default-screen">Screen shown when leaving Ambient</label>
        <select id="settings-default-screen" class="settings-theme-select" data-settings-default-screen>
          ${DEFAULT_SCREEN_OPTIONS.map((option) => `<option value="${option.hash}"${option.hash === getDefaultScreen() ? ' selected' : ''}>${option.label}</option>`).join('')}
        </select>
        <p class="settings-note">Leaving the Ambient screen goes to the screen you used most recently; after an hour away it uses this default instead.</p>
      </section>
    </main>
  `;

  target.querySelector<HTMLButtonElement>('[data-settings-back]')?.addEventListener('click', () => goBack(''));
  target.querySelector<HTMLSelectElement>('[data-settings-theme]')?.addEventListener('change', (event) => {
    applyTheme((event.currentTarget as HTMLSelectElement).value as Theme);
  });
  target.querySelector<HTMLSelectElement>('[data-settings-idle]')?.addEventListener('change', (event) => {
    setIdleMinutes(Number((event.currentTarget as HTMLSelectElement).value));
  });
  target.querySelector<HTMLSelectElement>('[data-settings-default-screen]')?.addEventListener('change', (event) => {
    setDefaultScreen((event.currentTarget as HTMLSelectElement).value);
  });
}
