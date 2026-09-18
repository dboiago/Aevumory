import type { TemporalOccurrence } from './temporal';

// EVENT_HORIZON.md §10: eligibility decides whether an occurrence belongs in
// the Horizon's input set at all; horizon.ts alone decides how an eligible
// occurrence is positioned/visually progressed. This module must not import
// anything from horizon.ts, and horizon.ts must not import from here.
export type HorizonEligibilityInput = Pick<TemporalOccurrence, 'relevance' | 'significance'>;

/**
 * Interpretive decision (EVENT_HORIZON.md §17 leaves "exact eligibility
 * scoring" deliberately open): `relevance === 'meaningful'` is the
 * documented "favor meaningful events over routine temporal noise" signal
 * (§8/§9); `significance !== 'low'` additionally excludes meaningful-but-
 * minor occurrences, since §8 separately lists "event significance" as its
 * own eligibility consideration rather than folding it entirely into
 * relevance. Both existing fields are used; no new field is introduced.
 */
export function isHorizonEligible(occurrence: HorizonEligibilityInput): boolean {
  return occurrence.relevance === 'meaningful' && occurrence.significance !== 'low';
}

export function selectEligibleOccurrences<T extends HorizonEligibilityInput>(occurrences: T[]): T[] {
  return occurrences.filter(isHorizonEligible);
}
