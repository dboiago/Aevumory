import { FixtureCalendarQuery } from './calendar';
import { renderCalendar } from './calendar-view';

const calendarQuery = new FixtureCalendarQuery();

async function renderCalendarRoute(): Promise<void> {
  if (window.location.hash !== '#calendar') return;

  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) throw new Error('Aevumory application root was not found');

  await renderCalendar(root, calendarQuery);
}

window.addEventListener('hashchange', () => void renderCalendarRoute());
void renderCalendarRoute();
