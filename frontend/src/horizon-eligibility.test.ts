import { describe, expect, it } from 'vitest';
import { isHorizonEligible, selectEligibleOccurrences, type HorizonEligibilityInput } from './horizon-eligibility';

function occurrence(overrides: Partial<HorizonEligibilityInput> = {}): HorizonEligibilityInput {
  return { relevance: 'meaningful', significance: 'normal', ...overrides };
}

describe('isHorizonEligible', () => {
  it('admits a meaningful, normal-significance occurrence', () => {
    expect(isHorizonEligible(occurrence())).toBe(true);
  });

  it('admits a meaningful, high-significance occurrence', () => {
    expect(isHorizonEligible(occurrence({ significance: 'high' }))).toBe(true);
  });

  it('excludes ordinary occurrences regardless of significance', () => {
    expect(isHorizonEligible(occurrence({ relevance: 'ordinary', significance: 'high' }))).toBe(false);
    expect(isHorizonEligible(occurrence({ relevance: 'ordinary', significance: 'normal' }))).toBe(false);
    expect(isHorizonEligible(occurrence({ relevance: 'ordinary', significance: 'low' }))).toBe(false);
  });

  it('excludes meaningful-but-low-significance occurrences', () => {
    expect(isHorizonEligible(occurrence({ significance: 'low' }))).toBe(false);
  });
});

describe('selectEligibleOccurrences', () => {
  it('filters a mixed set down to only eligible occurrences', () => {
    const occurrences = [
      occurrence({ relevance: 'meaningful', significance: 'normal' }),
      occurrence({ relevance: 'ordinary', significance: 'high' }),
      occurrence({ relevance: 'meaningful', significance: 'low' }),
      occurrence({ relevance: 'meaningful', significance: 'high' }),
    ];

    expect(selectEligibleOccurrences(occurrences)).toEqual([
      occurrences[0],
      occurrences[3],
    ]);
  });
});
