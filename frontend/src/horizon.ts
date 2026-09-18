// Reconciled against docs/prototypes/event-horizon/index.html
// (FUNCTIONAL_FOUNDATION_PLAN.md Phase 6) — that prototype is the
// authoritative reference for this module's mathematics.

export type HorizonEvent = {
  id: string;
  title: string;
  timeLabel: string;
  occurrenceStart: string;
};

export type HorizonPosition = {
  x: number;
  y: number;
};

export type HorizonVisual = {
  opacity: number;
  size: number;
  scale: number;
  blur: number;
  tracking: string;
  weight: number;
  timeOpacity: number;
  timeScale: number;
  timeRise: string;
};

export const HORIZON_HOURS = 168;
export const SETTLING_HOURS = 8;
// Prototype's default departure-slider value (3 minutes) — not user
// configurable in production, unlike the prototype's inspection control.
export const DEPARTURE_GRACE_MINUTES = 3;
// Prototype default `visibleCount`; composition-level cap (EVENT_HORIZON.md
// §16: "composition must reduce or prioritize" when too many events are
// eligible), not a user-facing control.
export const MAX_VISIBLE_EVENTS = 5;

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function smoothstep(progress: number): number {
  const value = clamp(progress);
  return value * value * (3 - 2 * value);
}

// Matches the prototype's `spatialSeed(id, salt)` FNV-1a hash exactly, so
// that independently-salted seeds (e.g. 'x' vs 'y') are uncorrelated.
function spatialSeed(id: string, salt: string): number {
  let hash = 2166136261;
  const input = `${id}:${salt}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1_000_000) / 1_000_000;
}

function hoursUntilOccurrence(event: HorizonEvent, now: string): number {
  const nowMs = Date.parse(now);
  const occurrenceMs = Date.parse(event.occurrenceStart);
  return (occurrenceMs - nowMs) / 3_600_000;
}

function eventProgress(hoursUntil: number): number {
  return clamp(1 - Math.max(hoursUntil, 0) / HORIZON_HOURS);
}

// Prototype's `departureProgress`: 0 until the occurrence starts, then rises
// to 1 across the short departure-grace window as the event dissolves out.
function departureProgress(hoursUntil: number): number {
  if (hoursUntil >= 0) return 0;
  const graceHours = DEPARTURE_GRACE_MINUTES / 60;
  return clamp(-hoursUntil / graceHours);
}

// Prototype's ingress point has its own deterministic spatial identity,
// independent from trajectory phase/bias, so composition does not inherit
// phase bias (docs comment preserved verbatim from the prototype).
function weightedIngress(event: HorizonEvent): HorizonPosition {
  const ySeed = spatialSeed(event.id, 'y');
  const xSeed = spatialSeed(event.id, 'x');

  // Larger Y values are lower on screen; weighting makes lower ingress
  // statistically more common while preserving the full range.
  const yWeight = 1 - Math.pow(1 - ySeed, 0.55);
  const y = lerp(0.88, 0.97, yWeight);

  // Mild centre avoidance. Centre remains possible; it is simply less common.
  const side = xSeed < 0.5 ? -1 : 1;
  const distance = 0.07 + Math.pow(Math.abs(xSeed - 0.5) * 2, 0.72) * 0.4;
  const x = clamp(0.5 + side * distance, 0.035, 0.965);

  return { x, y };
}

export function horizonPosition(event: HorizonEvent, now: string): HorizonPosition {
  const hoursUntil = hoursUntilOccurrence(event, now);
  const progress = eventProgress(hoursUntil);
  const settleStart = clamp(1 - SETTLING_HOURS / HORIZON_HOURS);
  const seed = spatialSeed(event.id, 'phase');
  const phase = 0.17 + (seed * 0.73);
  const bias = (seed - 0.5) * 0.08;
  const arrivalLane = ((seed * 2) - 1) * 0.05;
  const loop = ((seed * 2) - 1) * 0.14;

  const ingressPoint = weightedIngress(event);
  const distalX = ingressPoint.x;
  const distalY = ingressPoint.y;

  const middleX = clamp(0.29 + phase * 0.42 + bias * 0.9, 0.29, 0.71);
  const middleY = clamp(
    0.755 +
      Math.sin((phase * 2.2 + 0.13) * Math.PI) * 0.065 +
      arrivalLane * 0.42 +
      bias * 0.14,
    0.72,
    0.88,
  );

  const arrivalX = clamp(0.43 + phase * 0.14 + bias * 0.4, 0.38, 0.62);
  const arrivalY = 0.885 + arrivalLane;
  const u = clamp(progress / settleStart);
  const ingressRate = 0.56 + phase * 0.16;
  const ingress = smoothstep(u / ingressRate);

  let x = lerp(distalX, middleX, ingress);
  let y = lerp(distalY, middleY, smoothstep(u / (0.42 + phase * 0.13)));

  const envelope = Math.sin(Math.PI * u);
  const sweep = Math.sin((u * (2.2 + phase * 1.35) + phase * 0.73) * Math.PI);
  const drift = Math.cos((u * (1.35 + phase * 0.85) + phase * 0.41) * Math.PI);

  x += loop * envelope * (0.95 + phase * 0.35) + sweep * 0.025 * envelope;
  y += drift * (0.018 + phase * 0.01) * envelope + bias * 0.1 * envelope;

  if (progress > settleStart) {
    const settlingProgress = smoothstep((progress - settleStart) / (1 - settleStart));
    x = lerp(middleX, arrivalX, settlingProgress);
    y = lerp(middleY, arrivalY, settlingProgress);
  }

  // Departure treatment includes a small downward drift as the event
  // dissolves out of the field (prototype's `departureDrift`).
  const departure = smoothstep(departureProgress(hoursUntil));
  y += 0.014 * departure;

  return {
    x: clamp(x, 0.035, 0.965),
    y: clamp(y, 0.64, 0.95),
  };
}

export function horizonVisual(event: HorizonEvent, now: string): HorizonVisual {
  const hoursUntil = hoursUntilOccurrence(event, now);
  const progress = eventProgress(hoursUntil);
  const settleStart = clamp(1 - SETTLING_HOURS / HORIZON_HOURS);
  const readable = smoothstep((progress - 0.15) / 0.85);
  const settleProgress = clamp((progress - settleStart) / (1 - settleStart));
  const timeProgress = smoothstep((settleProgress - 0.46) / 0.54);

  const base: HorizonVisual = {
    opacity: lerp(0.1, 0.98, Math.pow(readable, 1.08)),
    size: lerp(0.2, 1.46, Math.pow(progress, 0.72)),
    scale: lerp(0.7, 1, smoothstep((progress - 0.08) / 0.92)),
    blur: lerp(2.2, 0, Math.pow(progress, 0.92)),
    tracking: `${lerp(0.29, 0.012, Math.pow(progress, 0.76)).toFixed(3)}em`,
    weight: Math.round(lerp(255, 500, Math.pow(progress, 0.94))),
    timeOpacity: lerp(0, 0.84, timeProgress),
    timeScale: lerp(0.82, 1, timeProgress),
    timeRise: `${lerp(-0.38, 0, timeProgress).toFixed(3)}em`,
  };

  const departure = departureProgress(hoursUntil);
  if (departure <= 0) return base;

  // Prototype's `departureVisual`: dissolve the event downward and out
  // rather than having it disappear the instant it starts.
  const q = smoothstep(departure);
  return {
    ...base,
    opacity: base.opacity * (1 - q),
    scale: base.scale * lerp(1, 0.92, q),
    size: base.size * lerp(1, 0.96, q),
    blur: lerp(base.blur, 0.85, q),
    timeOpacity: base.timeOpacity * (1 - q),
  };
}

// Whether an occurrence still belongs on the display at all right now
// (temporal proximity + departure grace) — a composition-level admission
// gate, distinct from horizon-eligibility.ts's relevance/significance gate.
export function isWithinHorizonWindow(event: HorizonEvent, now: string): boolean {
  const hoursUntil = hoursUntilOccurrence(event, now);
  const graceHours = DEPARTURE_GRACE_MINUTES / 60;
  return hoursUntil <= HORIZON_HOURS && hoursUntil >= -graceHours;
}

// Prototype's candidate selection: filter to the current display lifetime,
// prioritize the soonest occurrences, and cap composition occupancy.
export function selectHorizonCandidates(
  events: HorizonEvent[],
  now: string,
  limit = MAX_VISIBLE_EVENTS,
): HorizonEvent[] {
  return events
    .filter((event) => isWithinHorizonWindow(event, now))
    .sort((a, b) => Date.parse(a.occurrenceStart) - Date.parse(b.occurrenceStart))
    .slice(0, limit);
}
