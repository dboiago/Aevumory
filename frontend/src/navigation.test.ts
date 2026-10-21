import { beforeEach, describe, expect, it } from 'vitest';
import { isAmbientRoute, isFunctionalRoute, noteRoute, previousRoute, resetRouteHistory } from './navigation';

describe('navigation route classification', () => {
  it('treats the empty hash as the Ambient (Event Horizon) route', () => {
    expect(isAmbientRoute('')).toBe(true);
    expect(isFunctionalRoute('')).toBe(false);
  });

  it('treats the functional screens as functional routes', () => {
    for (const hash of ['#tasks', '#calendar', '#rewards', '#household-setup', '#ambient-display']) {
      expect(isFunctionalRoute(hash)).toBe(true);
      expect(isAmbientRoute(hash)).toBe(false);
    }
  });

  it('treats participant profiles as functional routes', () => {
    expect(isFunctionalRoute('#participant/abc-123')).toBe(true);
  });

  it('does not treat an unknown hash as functional', () => {
    expect(isFunctionalRoute('#nope')).toBe(false);
  });

  it('treats the settings screen as a functional route', () => {
    expect(isFunctionalRoute('#settings')).toBe(true);
  });
});

describe('route history (Back = last screen)', () => {
  beforeEach(() => resetRouteHistory());

  it('has no previous route on a direct landing', () => {
    noteRoute('#calendar');
    expect(previousRoute()).toBeNull();
  });

  it('returns to the last visited screen', () => {
    noteRoute('');
    noteRoute('#tasks');
    noteRoute('#calendar');
    expect(previousRoute()).toBe('#tasks');
  });

  it('truncates the stack when revisiting an earlier screen', () => {
    noteRoute('');
    noteRoute('#tasks');
    noteRoute('#calendar');
    noteRoute('#tasks'); // went back to Tasks
    expect(previousRoute()).toBe('');
    noteRoute('#tasks'); // duplicate consecutive visit is ignored
    expect(previousRoute()).toBe('');
  });
});
