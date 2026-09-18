import { describe, expect, it } from 'vitest';
import {
  DEPARTURE_GRACE_MINUTES,
  HORIZON_HOURS,
  MAX_VISIBLE_EVENTS,
  horizonPosition,
  horizonVisual,
  isWithinHorizonWindow,
  selectHorizonCandidates,
  type HorizonEvent,
} from './horizon';

const now = '2026-09-18T18:00:00Z';

function eventAt(id: string, hoursFromNow: number): HorizonEvent {
  const occurrenceStart = new Date(Date.parse(now) + hoursFromNow * 3_600_000).toISOString();
  return { id, title: id, timeLabel: '', occurrenceStart };
}

describe('horizonPosition / horizonVisual (prototype parity)', () => {
  it('is a pure, deterministic function of event id and now', () => {
    const event = eventAt('maya-arrives', 40);
    expect(horizonPosition(event, now)).toEqual(horizonPosition(event, now));
    expect(horizonVisual(event, now)).toEqual(horizonVisual(event, now));
  });

  it('keeps every position within the prototype field bounds', () => {
    for (const hours of [0, 4, 24, 72, 150, HORIZON_HOURS]) {
      const position = horizonPosition(eventAt('bounds-check', hours), now);
      expect(position.x).toBeGreaterThanOrEqual(0.035);
      expect(position.x).toBeLessThanOrEqual(0.965);
      expect(position.y).toBeGreaterThanOrEqual(0.64);
      expect(position.y).toBeLessThanOrEqual(0.95);
    }
  });

  it('gives distinct ingress spatial identities to different event ids at the same distal progress', () => {
    const far = HORIZON_HOURS - 1;
    const a = horizonPosition(eventAt('event-a', far), now);
    const b = horizonPosition(eventAt('event-b', far), now);
    expect(a).not.toEqual(b);
  });

  it('becomes progressively more legible (opaque, sharp, heavier) as an event approaches', () => {
    const distant = horizonVisual(eventAt('progression', 150), now);
    const imminent = horizonVisual(eventAt('progression', 1), now);
    expect(imminent.opacity).toBeGreaterThan(distant.opacity);
    expect(imminent.blur).toBeLessThan(distant.blur);
    expect(imminent.weight).toBeGreaterThan(distant.weight);
    expect(imminent.size).toBeGreaterThan(distant.size);
  });

  it('only resolves the time label near arrival, matching the settling window', () => {
    const distant = horizonVisual(eventAt('time-label', 100), now);
    const settling = horizonVisual(eventAt('time-label', 1), now);
    expect(distant.timeOpacity).toBeLessThan(settling.timeOpacity);
    expect(settling.timeOpacity).toBeGreaterThan(0);
  });

  it('applies departure dissolve treatment once an occurrence has started', () => {
    const arriving = horizonVisual(eventAt('departing', 0), now);
    const departing = horizonVisual(eventAt('departing', -DEPARTURE_GRACE_MINUTES / 60 / 2), now);
    const fullyDeparted = horizonVisual(eventAt('departing', -DEPARTURE_GRACE_MINUTES / 60), now);
    expect(departing.opacity).toBeLessThan(arriving.opacity);
    expect(fullyDeparted.opacity).toBeLessThan(departing.opacity);
  });
});

describe('isWithinHorizonWindow / selectHorizonCandidates', () => {
  it('excludes occurrences beyond the seven-day horizon', () => {
    expect(isWithinHorizonWindow(eventAt('too-far', HORIZON_HOURS + 1), now)).toBe(false);
    expect(isWithinHorizonWindow(eventAt('within', HORIZON_HOURS - 1), now)).toBe(true);
  });

  it('keeps an occurrence visible only through its departure grace window', () => {
    const graceHours = DEPARTURE_GRACE_MINUTES / 60;
    expect(isWithinHorizonWindow(eventAt('just-started', -graceHours / 2), now)).toBe(true);
    expect(isWithinHorizonWindow(eventAt('long-gone', -graceHours * 2), now)).toBe(false);
  });

  it('sorts candidates soonest-first and caps composition occupancy', () => {
    const events = [
      eventAt('later', 50),
      eventAt('soonest', 2),
      eventAt('middle', 20),
      eventAt('out-of-window', HORIZON_HOURS + 10),
    ];

    const candidates = selectHorizonCandidates(events, now, 2);

    expect(candidates.map((event) => event.id)).toEqual(['soonest', 'middle']);
    expect(candidates.length).toBeLessThanOrEqual(MAX_VISIBLE_EVENTS);
  });
});
