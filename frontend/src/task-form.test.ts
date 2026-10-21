import { describe, expect, it } from 'vitest';
import { buildTaskInput, domainOfDiscipline, inferDiscipline, emptyTaskFormState, type TaskFormState } from './task-form';
import type { HouseholdParticipant } from './tasks';

const participants: HouseholdParticipant[] = [
  { id: 'kid-1', name: 'Kid' },
  { id: 'parent-1', name: 'Parent' },
];

function state(overrides: Partial<TaskFormState> = {}): TaskFormState {
  return { ...emptyTaskFormState(), title: 'Brush teeth', ...overrides };
}

describe('inferDiscipline', () => {
  it('maps movement titles to Kinetic (motion)', () => {
    expect(inferDiscipline('Soccer practice')).toBe('motion');
    expect(inferDiscipline('Jujitsu class')).toBe('motion');
    expect(domainOfDiscipline(inferDiscipline('Go to the gym'))).toBe('kinetic');
  });

  it('maps cleaning/feeding titles to Keeping', () => {
    expect(inferDiscipline('Clean the bathroom')).toBe('order');
    expect(inferDiscipline('Feed the cat')).toBe('care');
    expect(domainOfDiscipline(inferDiscipline('Feed the cat'))).toBe('keeping');
  });

  it('maps study titles to Erudite and making titles to Form', () => {
    expect(domainOfDiscipline(inferDiscipline('Do homework'))).toBe('erudite');
    expect(domainOfDiscipline(inferDiscipline('Paint a picture'))).toBe('form');
  });

  it('falls back to order (Keeping) when nothing matches', () => {
    expect(inferDiscipline('Brush teeth')).toBe('care'); // brush is a care hint
    expect(inferDiscipline('Mystery task')).toBe('order');
  });
});

describe('buildTaskInput', () => {
  it('defaults to the Household pool with the first participant as administrative owner', () => {
    const input = buildTaskInput(state(), participants);
    expect(input.assignment.scope).toBe('household');
    expect(input.assignment.assigned_user_id).toBeUndefined();
    expect(input.assignment.owner_id).toBe('kid-1');
    expect(input.source_type).toBe('ad_hoc');
  });

  it('assigns an individual when a participant chip is chosen', () => {
    const input = buildTaskInput(state({ assigneeId: 'kid-1' }), participants);
    expect(input.assignment).toEqual({ scope: 'individual', assigned_user_id: 'kid-1', owner_id: 'kid-1' });
  });

  it('uses the inferred discipline until the user picks a domain', () => {
    expect(buildTaskInput(state({ title: 'Soccer practice' }), participants).primary_discipline).toBe('motion');
    expect(buildTaskInput(state({ title: 'Soccer practice', domain: 'keeping', domainChosen: true }), participants).primary_discipline).toBe('order');
  });

  it('maps repeats onto schedule policies like the calendar-style options', () => {
    expect(buildTaskInput(state(), participants).schedule.cadence_type).toBe('one_off');
    expect(buildTaskInput(state({ repeat: 'daily' }), participants).schedule).toMatchObject({ cadence_type: 'interval', interval_days: 1 });
    expect(buildTaskInput(state({ repeat: 'interval', intervalDays: 3 }), participants).schedule).toMatchObject({ cadence_type: 'interval', interval_days: 3 });
    const weekly = buildTaskInput(state({ repeat: 'weekly', date: '2026-10-26' }), participants); // a Monday
    expect(weekly.schedule).toMatchObject({ cadence_type: 'calendar_anchor', calendar_anchor: { unit: 'week', value: 1 } });
  });

  it('derives effort from the domain and leaves reward numbers to the engine', () => {
    expect(buildTaskInput(state({ domain: 'kinetic', domainChosen: true }), participants).effort_type).toBe('physical');
    expect(buildTaskInput(state({ domain: 'erudite', domainChosen: true }), participants).effort_type).toBe('mental');
    expect(buildTaskInput(state(), participants).duration_tier).toBe('moderate');
  });
});

describe('due time (2026-10-20)', () => {
  it('defaults the due moment to roughly 12 hours from creation', () => {
    const before = Date.now();
    const fresh = emptyTaskFormState();
    const due = new Date(`${fresh.date}T${fresh.time}`);
    const deltaHours = (due.getTime() - before) / 3_600_000;
    expect(deltaHours).toBeGreaterThan(11.9);
    expect(deltaHours).toBeLessThan(12.1);
  });

  it('carries the due time into the schedule as the strict window end', () => {
    const input = buildTaskInput(state({ time: '07:30' }), participants);
    expect(input.schedule.has_strict_window).toBe(true);
    expect(input.schedule.window_start_time).toBe('00:00');
    expect(input.schedule.window_end_time).toBe('07:30');
  });
});
