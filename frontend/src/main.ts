import './styles.css';

type AmbientContext = {
  date: string;
  time: string;
  weather: string;
};

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Aevumory application root was not found');
}

const context: AmbientContext = {
  date: 'Wednesday, September 2',
  time: '18:00',
  weather: 'Clear · 18°',
};

app.innerHTML = `
  <section class="ambient-shell">
    <header class="ambient-context" aria-label="Current household context">
      <time class="date">${context.date}</time>
      <time class="time">${context.time}</time>
      <span class="weather">${context.weather}</span>
    </header>

    <section class="horizon" aria-label="Event Horizon">
      <p class="eyebrow">Event Horizon</p>
      <p class="empty-state">No approaching events</p>
    </section>
  </section>
`;
