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

function seededValue(event: HorizonEvent): number {
  let hash = 0;
  for (let index = 0; index < event.id.length; index += 1) {
    hash = (hash * 31 + event.id.charCodeAt(index)) | 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}

export function horizonPosition(
  event: HorizonEvent,
  now: string,
): HorizonPosition {
  const nowMs = Date.parse(now);
  const occurrenceMs = Date.parse(event.occurrenceStart);
  const hoursUntil = (occurrenceMs - nowMs) / 3_600_000;
  const progress = clamp(1 - Math.max(hoursUntil, 0) / HORIZON_HOURS);
  const settleStart = clamp(1 - SETTLING_HOURS / HORIZON_HOURS);
  const seed = seededValue(event);
  const side = seed >= 0.5 ? 1 : -1;
  const phase = 0.17 + (seed * 0.73);
  const bias = (seed - 0.5) * 0.08;
  const arrivalLane = ((seed * 2) - 1) * 0.05;
  const loop = ((seed * 2) - 1) * 0.14;

  const distalX = side < 0
    ? 0.035 + phase * 0.17 + bias * 0.5
    : 0.965 - phase * 0.17 + bias * 0.5;
  const distalY = clamp(0.80 + phase * 0.13 + arrivalLane * 0.35 + bias * 0.25, 0.79, 0.94);

  const middleX = clamp(0.29 + phase * 0.42 + bias * 0.9, 0.29, 0.71);
  const middleY = clamp(
    0.645 +
      Math.sin((phase * 2.2 + 0.13) * Math.PI) * 0.085 +
      arrivalLane * 0.55 +
      bias * 0.18,
    0.61,
    0.79,
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

  return {
    x: clamp(x, 0.035, 0.965),
    y: clamp(y, 0.64, 0.95),
  };
}

export function horizonVisual(event: HorizonEvent, now: string): HorizonVisual {
  const nowMs = Date.parse(now);
  const occurrenceMs = Date.parse(event.occurrenceStart);
  const hoursUntil = (occurrenceMs - nowMs) / 3_600_000;
  const progress = clamp(1 - Math.max(hoursUntil, 0) / HORIZON_HOURS);
  const settleStart = clamp(1 - SETTLING_HOURS / HORIZON_HOURS);
  const readable = smoothstep((progress - 0.15) / 0.85);
  const settleProgress = clamp((progress - settleStart) / (1 - settleStart));
  const timeProgress = smoothstep((settleProgress - 0.46) / 0.54);

  return {
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
}
