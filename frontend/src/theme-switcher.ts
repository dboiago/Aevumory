import './theme-overrides.css';

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
