import { DisciplineTag } from './task';

export type DisciplineState = 'developing' | 'mastered';

/** Thresholds derived from Cumulative XP = 100 * Level^2 */
export const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 400,
  3: 900,
  4: 1600,
  5: 2500,
  6: 3600,
  7: 4900,
  8: 6400,
  9: 8100,
  10: 10000,
};

export function resolveDisciplineLevel(cumulativeXP: number): number {
  for (let level = 10; level >= 1; level--) {
    if (cumulativeXP >= LEVEL_THRESHOLDS[level]) {
      return level;
    }
  }
  return 1;
}

export function isMastered(cumulativeXP: number): boolean {
  return cumulativeXP >= LEVEL_THRESHOLDS[10];
}

export interface DisciplineProgress {
  discipline: DisciplineTag;
  cumulative_xp: number;
  current_level: number;
  state: DisciplineState;
}
