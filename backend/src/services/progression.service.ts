/**
 * Progression Service
 *
 * Wraps the existing pure `resolveDisciplineLevel`/`isMastered` functions
 * (progression.ts) against persisted cumulative XP derived from the reward
 * ledger — FUNCTIONAL_FOUNDATION_PLAN.md Phase 3: "`/progression` ... never
 * merged [with Credits]". Cumulative XP per Discipline is computed, never
 * stored as mutable state (CORE_BASELINE.md §3: "Level Resolution").
 */

import type { LedgerRepository } from '../repositories/ledger.repository.js';
import {
  DISCIPLINE_DOMAIN_MAP,
  type DisciplineTag,
} from '../types/task-domain.types.js';
import {
  isMastered,
  resolveDisciplineLevel,
  type DisciplineProgress,
} from '../types/progression.js';

const ALL_DISCIPLINES = Object.keys(DISCIPLINE_DOMAIN_MAP) as DisciplineTag[];

export class ProgressionService {
  constructor(private readonly ledgerRepository: LedgerRepository) {}

  async getParticipantProgression(reward_owner_user_id: string): Promise<DisciplineProgress[]> {
    const [transactions, adjustments] = await Promise.all([
      this.ledgerRepository.listTransactionsForOwner(reward_owner_user_id),
      this.ledgerRepository.listAdjustmentsForOwner(reward_owner_user_id),
    ]);

    const xpByDiscipline = new Map<DisciplineTag, number>();
    const addXp = (discipline: DisciplineTag, delta: number) => {
      xpByDiscipline.set(discipline, (xpByDiscipline.get(discipline) ?? 0) + delta);
    };

    for (const transaction of transactions) {
      addXp(transaction.yield.primary_discipline, transaction.yield.primary_xp);
      for (const secondary of transaction.yield.secondary_yields) {
        addXp(secondary.discipline, secondary.xp);
      }
    }

    for (const adjustment of adjustments) {
      for (const xpAdjustment of adjustment.xp_adjustments) {
        addXp(xpAdjustment.discipline, xpAdjustment.xp_delta);
      }
    }

    return ALL_DISCIPLINES.map((discipline) => {
      const cumulative_xp = Math.max(0, xpByDiscipline.get(discipline) ?? 0);
      const current_level = resolveDisciplineLevel(cumulative_xp);
      return {
        discipline,
        cumulative_xp,
        current_level,
        state: isMastered(cumulative_xp) ? 'mastered' : 'developing',
      };
    });
  }
}
