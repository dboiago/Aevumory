import { renderParticipantProfile } from './participant-profile';
import { FixtureTaskBoardQuery } from './tasks';

const themes = ['overgrown', 'nebula', 'vernal', 'maritime', 'memoix'] as const;
type Theme = (typeof themes)[number];

const stored = window.localStorage.getItem('aevumory-prototype-theme');
const initial = themes.includes(stored as Theme) ? stored as Theme : 'overgrown';

document.documentElement.dataset.theme = initial;

const switcher = document.createElement('div');
switcher.className = 'theme-switcher';
switcher.setAttribute('aria-label', 'Prototype theme controls');
switcher.innerHTML = `
  <label for="prototype-theme">Theme</label>
  <select id="prototype-theme">
    ${themes.map((theme) => `<option value="${theme}">${theme}</option>`).join('')}
  </select>
`;

document.body.appendChild(switcher);

const select = switcher.querySelector<HTMLSelectElement>('#prototype-theme');
if (select) {
  select.value = initial;
  select.addEventListener('change', () => applyTheme(select.value as Theme));
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem('aevumory-prototype-theme', theme);
}

const profileQuery = new FixtureTaskBoardQuery();

window.addEventListener('hashchange', () => {
  const match = window.location.hash.match(/^#participant\/(.+)$/);
  if (!match) return;

  window.setTimeout(async () => {
    const state = await profileQuery.getBoard();
    const participant = state.participants.find((item) => item.id === decodeURIComponent(match[1]));
    const root = document.querySelector<HTMLDivElement>('#app');
    if (participant && root) await renderParticipantProfile(root, participant);
  }, 0);
});

if (window.location.hash.startsWith('#participant/')) {
  window.setTimeout(async () => {
    const state = await profileQuery.getBoard();
    const match = window.location.hash.match(/^#participant\/(.+)$/);
    const participant = match
      ? state.participants.find((item) => item.id === decodeURIComponent(match[1]))
      : undefined;
    const root = document.querySelector<HTMLDivElement>('#app');
    if (participant && root) await renderParticipantProfile(root, participant);
  }, 0);
}
