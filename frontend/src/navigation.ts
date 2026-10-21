import './navigation.css';
import { getCachedAdminStatus, lockAdmin, onAdminStatusChange, openAdminUnlockDialog, refreshAdminStatus } from './admin';

/**
 * Global navigation (HANDOFF.md "Ambient Interaction" / AMBIENT_SCREEN.md):
 *
 *   - Swipe up from the Ambient (Event Horizon) screen reveals the
 *     functional interface.
 *   - Swipe down from a functional screen returns to Ambient.
 *   - Functional screens carry a fly-out side menu (the navigation model
 *     HANDOFF.md left open as "tabs, a flyout, or a similar navigation
 *     model" — settled as a flyout) linking the functional routes, plus
 *     an explicit "return to Ambient" action so navigation never depends
 *     on gestures alone.
 *
 * The Ambient screen itself deliberately has no persistent navigation
 * control. The flyout shell is mounted on <body>, not inside #app, so
 * per-screen polling re-renders (which replace #app content) cannot
 * remove it; syncAppNavigation() only toggles its visibility and the
 * active item for the current route.
 *
 * Gestures use Pointer Events so the same model works with touch on the
 * household tablet and with a mouse when testing on a desktop.
 */

export const AMBIENT_HASH = '';
export const DEFAULT_FUNCTIONAL_HASH = '#tasks';

const FUNCTIONAL_PREFIXES = [
  '#tasks',
  '#profiles',
  '#calendar',
  '#rewards',
  '#participant/',
  '#household-setup',
  '#ambient-display',
  '#settings',
  '#activity',
  '#countdown',
];

export function isFunctionalRoute(hash: string): boolean {
  return FUNCTIONAL_PREFIXES.some((prefix) => hash === prefix || hash.startsWith(prefix));
}

export function isAmbientRoute(hash: string): boolean {
  return hash === AMBIENT_HASH;
}

type NavItem = { label: string; hash: string };

const NAV_ITEMS: NavItem[] = [
  { label: 'Tasks', hash: '#tasks' },
  { label: 'Profiles', hash: '#profiles' },
  { label: 'Calendar', hash: '#calendar' },
  { label: 'Rewards', hash: '#rewards' },
  { label: 'Sources', hash: '#ambient-display' },
  { label: 'Household Setup', hash: '#household-setup' },
  { label: 'Countdown', hash: '#countdown' },
  { label: 'Activity', hash: '#activity' },
  { label: 'Settings', hash: '#settings' },
];

let shell: HTMLElement | null = null;

function ensureShell(): HTMLElement {
  if (shell && document.body.contains(shell)) return shell;

  shell = document.createElement('div');
  shell.className = 'app-nav';
  shell.innerHTML = `
    <button type="button" class="app-nav-toggle" aria-label="Open navigation menu" aria-expanded="false">
      <span class="app-nav-toggle-bars" aria-hidden="true"></span>
      <span class="app-nav-toggle-label">Menu</span>
    </button>
    <div class="app-nav-backdrop" hidden></div>
    <nav class="app-nav-drawer" aria-label="Aevumory" hidden>
      <p class="app-nav-title">Aevumory</p>
      <ul class="app-nav-list">
        ${NAV_ITEMS.map((item) => `<li><a class="app-nav-link" href="${item.hash}" data-nav-hash="${item.hash}">${item.label}</a></li>`).join('')}
      </ul>
      <button type="button" class="app-nav-ambient">Return to Ambient</button>
      <button type="button" class="app-navigation-admin" data-admin-toggle>🔒 Unlock admin</button>
    </nav>
  `;

  const toggle = shell.querySelector<HTMLButtonElement>('.app-nav-toggle');
  const backdrop = shell.querySelector<HTMLElement>('.app-nav-backdrop');
  const drawer = shell.querySelector<HTMLElement>('.app-nav-drawer');
  if (!toggle || !backdrop || !drawer) throw new Error('Navigation shell failed to initialise');

  const setOpen = (open: boolean): void => {
    backdrop.hidden = !open;
    drawer.hidden = !open;
    shell?.classList.toggle('app-nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', () => setOpen(drawer.hidden));
  backdrop.addEventListener('click', () => setOpen(false));
  drawer.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('a, button')) setOpen(false);
  });
  shell.querySelector('.app-nav-ambient')?.addEventListener('click', () => {
    setOpen(false);
    window.location.hash = AMBIENT_HASH;
  });
  const adminToggle = shell.querySelector<HTMLButtonElement>('[data-admin-toggle]');
  const paintAdminToggle = (): void => {
    if (!adminToggle) return;
    const status = getCachedAdminStatus();
    adminToggle.textContent = status?.authenticated ? '🔓 Lock admin' : '🔒 Unlock admin';
  };
  onAdminStatusChange(paintAdminToggle);
  adminToggle?.addEventListener('click', async () => {
    setOpen(false);
    if (getCachedAdminStatus()?.authenticated) await lockAdmin();
    else await openAdminUnlockDialog();
    paintAdminToggle();
  });
  void refreshAdminStatus().then(paintAdminToggle);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !drawer.hidden) setOpen(false);
  });

  document.body.appendChild(shell);
  return shell;
}

/** Shows/hides the flyout for the current route and marks the active item. */
export function syncAppNavigation(): void {
  const nav = ensureShell();
  const functional = isFunctionalRoute(window.location.hash);
  nav.style.display = functional ? '' : 'none';
  if (!functional) return;

  nav.querySelectorAll<HTMLElement>('[data-nav-hash]').forEach((link) => {
    const itemHash = link.dataset.navHash ?? '';
    const active = window.location.hash === itemHash
      || (itemHash !== '' && window.location.hash.startsWith(itemHash));
    link.classList.toggle('app-nav-link-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

// ---------------------------------------------------------------------------
// In-app route history ("Back" means "the last screen", not "Ambient")
// ---------------------------------------------------------------------------

const routeStack: string[] = [];

const LAST_SCREEN_KEY = 'aevumory-last-screen';
const LAST_SCREEN_AT_KEY = 'aevumory-last-screen-at';
const DEFAULT_SCREEN_KEY = 'aevumory-default-screen';
/** How long the last-used screen stays the Ambient exit target. */
export const LAST_SCREEN_WINDOW_MS = 60 * 60 * 1000;

/** The user's chosen default screen (Settings), falling back to Tasks. */
export function getDefaultScreen(): string {
  try {
    const stored = window.localStorage.getItem(DEFAULT_SCREEN_KEY);
    if (stored && isFunctionalRoute(stored)) return stored;
  } catch { /* fall through to the factory default */ }
  return DEFAULT_FUNCTIONAL_HASH;
}

export function setDefaultScreen(hash: string): void {
  try { window.localStorage.setItem(DEFAULT_SCREEN_KEY, hash); } catch { /* ignore */ }
}

/**
 * Where leaving the Ambient screen lands: the last-used functional
 * screen if it was visited within the last hour, otherwise the user's
 * default screen.
 */
export function ambientExitTarget(now: number = Date.now()): string {
  try {
    const last = window.localStorage.getItem(LAST_SCREEN_KEY);
    const at = Number(window.localStorage.getItem(LAST_SCREEN_AT_KEY) ?? '0');
    if (last && isFunctionalRoute(last) && now - at < LAST_SCREEN_WINDOW_MS) return last;
  } catch { /* fall through to the default */ }
  return getDefaultScreen();
}

/**
 * Records a route visit. Revisiting a route already in the stack (via
 * Back, the flyout, or a swipe) truncates the stack back to it, so the
 * stack always reflects the path the user actually took.
 */
export function noteRoute(hash: string): void {
  if (isFunctionalRoute(hash)) {
    try {
      window.localStorage.setItem(LAST_SCREEN_KEY, hash);
      window.localStorage.setItem(LAST_SCREEN_AT_KEY, String(Date.now()));
    } catch { /* storage unavailable — last-screen memory is a nicety */ }
  }
  if (routeStack[routeStack.length - 1] === hash) return;
  const existing = routeStack.lastIndexOf(hash);
  if (existing >= 0) routeStack.length = existing + 1;
  else routeStack.push(hash);
}

/** The route Back should go to, or null when there is no in-app history. */
export function previousRoute(): string | null {
  return routeStack.length >= 2 ? routeStack[routeStack.length - 2] : null;
}

/**
 * Navigates to the previous in-app route; falls back to `fallbackHash`
 * when the app was opened directly on this screen (no in-app history).
 */
export function goBack(fallbackHash: string): void {
  window.location.hash = previousRoute() ?? fallbackHash;
}

export function resetRouteHistory(): void {
  routeStack.length = 0;
}

// ---------------------------------------------------------------------------
// Idle return to Ambient
// ---------------------------------------------------------------------------
//
// The docs left the exact inactivity policy open; this is the settled
// default: after a few idle minutes on a functional screen, the display
// returns to Ambient on its own (a wall tablet should not sit on Tasks
// all day). Configurable in Settings; 0 disables it. Any interaction
// resets the timer; an open dialog defers the return rather than
// yanking the screen away mid-action.

const IDLE_STORAGE_KEY = 'aevumory-idle-minutes';
export const IDLE_OPTIONS_MINUTES = [0, 1, 3, 5, 10];
export const DEFAULT_IDLE_MINUTES = 3;

export function getIdleMinutes(): number {
  const stored = Number(window.localStorage.getItem(IDLE_STORAGE_KEY));
  return IDLE_OPTIONS_MINUTES.includes(stored) ? stored : DEFAULT_IDLE_MINUTES;
}

export function setIdleMinutes(minutes: number): void {
  window.localStorage.setItem(IDLE_STORAGE_KEY, String(minutes));
  resetIdleTimer();
}

let idleTimer: number | undefined;

function resetIdleTimer(): void {
  if (idleTimer !== undefined) window.clearTimeout(idleTimer);
  idleTimer = undefined;
  const minutes = getIdleMinutes();
  if (minutes <= 0) return;
  idleTimer = window.setTimeout(onIdleTimeout, minutes * 60_000);
}

function onIdleTimeout(): void {
  if (isAmbientRoute(window.location.hash)) return;
  const dialogOpen = document.querySelector('[data-admin-dialog], .calendar-day-dialog, .calendar-event-dialog, .calendar-colour-picker, dialog[open]');
  if (dialogOpen) {
    resetIdleTimer();
    return;
  }
  window.location.hash = AMBIENT_HASH;
}

export function installIdleReturn(): void {
  const reset = (): void => resetIdleTimer();
  window.addEventListener('pointerdown', reset, { passive: true });
  window.addEventListener('keydown', reset);
  window.addEventListener('hashchange', reset);
  resetIdleTimer();
}

// ---------------------------------------------------------------------------
// Vertical swipe navigation
// ---------------------------------------------------------------------------

const SWIPE_MIN_DISTANCE = 80; // px of vertical travel
const SWIPE_VERTICAL_DOMINANCE = 2; // |dy| must exceed |dx| * this
const SWIPE_MAX_DURATION_MS = 900;
/** On functional screens a return swipe must start in this top zone, so it
 *  cannot fight scrolling, form input, or task-card dragging further down. */
const RETURN_SWIPE_TOP_ZONE = 64;

let gestureInstalled = false;
let lastSwipeAt = 0;

function swipeTarget(fromHash: string, deltaY: number, startY: number): string | null {
  if (isAmbientRoute(fromHash) && deltaY <= -SWIPE_MIN_DISTANCE) {
    return ambientExitTarget();
  }
  if (isFunctionalRoute(fromHash) && deltaY >= SWIPE_MIN_DISTANCE && startY <= RETURN_SWIPE_TOP_ZONE) {
    return AMBIENT_HASH;
  }
  return null;
}

function gestureBlocked(target: EventTarget | null): boolean {
  if (document.querySelector('dialog[open]')) return true;
  if (!(target instanceof HTMLElement)) return true;
  if (target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return true;
  // Task cards own their pointer gestures (drag between columns).
  if (target.closest('.task-card')) return true;
  return false;
}

/** Installs the pointer-based swipe listeners (idempotent). */
export function installSwipeNavigation(): void {
  if (gestureInstalled) return;
  gestureInstalled = true;

  let startX = 0;
  let startY = 0;
  let startedAt = 0;
  let pointerId: number | null = null;
  let blocked = false;

  document.addEventListener('pointerdown', (event) => {
    if (pointerId !== null || !event.isPrimary) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startedAt = Date.now();
    blocked = gestureBlocked(event.target);
  }, { passive: true });

  document.addEventListener('pointerup', (event) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    if (blocked) return;
    if (Date.now() - startedAt > SWIPE_MAX_DURATION_MS) return;

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaY) < Math.abs(deltaX) * SWIPE_VERTICAL_DOMINANCE) return;

    const destination = swipeTarget(window.location.hash, deltaY, startY);
    if (destination !== null && destination !== window.location.hash) {
      lastSwipeAt = Date.now();
      window.location.hash = destination;
    }
  }, { passive: true });

  document.addEventListener('pointercancel', () => {
    pointerId = null;
  }, { passive: true });

  // A completed swipe can otherwise also fire a click on whatever element
  // sat under the pointer (e.g. an occurrence on the Ambient screen).
  document.addEventListener('click', (event) => {
    if (Date.now() - lastSwipeAt < 350) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, { capture: true });
}
