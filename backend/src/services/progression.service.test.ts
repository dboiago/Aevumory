import { describe, expect, it } from 'vitest';
import { InMemoryLedgerRepository } from '../persistence/ledger.repository.memory.js';
import { ProgressionService } from './progression.service.js';
import type { RewardTransaction } from '../types/task-domain.types.js';

function makeTransaction(overrides: Partial<RewardTransaction> = {}): RewardTransaction {
  return {
    transaction_id: 'transaction-1',
    idempotency_key: 'task-1:task-1:2026-01-05:participant-1:completion',
    task_id: 'task-1',
    cycle_id: 'task-1:2026-01-05',
    reward_event_type: 'completion',
    reward_owner_user_id: 'participant-1',
    yield: { primary_discipline: 'order', primary_xp: 100, secondary_yields: [], credits_earned: 10 },
    processed_at: '2026-01-05T08:00:00Z',
    ...overrides,
  };
}

describe('ProgressionService', () => {
  it('returns cumulative XP/level for all Disciplines, defaulting to level 1 with no history', async () => {
    const ledgerRepository = new InMemoryLedgerRepository();
    const service = new ProgressionService(ledgerRepository);

    const progression = await service.getParticipantProgression('participant-1');

    expect(progression).toHaveLength(12);
    for (const entry of progression) {
      expect(entry.cumulative_xp).toBe(0);
      expect(entry.current_level).toBe(1);
      expect(entry.state).toBe('developing');
    }
  });

  it('accumulates primary and secondary XP per Discipline across transactions', async () => {
    const ledgerRepository = new InMemoryLedgerRepository();
    await ledgerRepository.saveTransaction(makeTransaction());
    await ledgerRepository.saveTransaction(
      makeTransaction({
        transaction_id: 'transaction-2',
        idempotency_key: 'task-2:task-2:2026-01-06:participant-1:completion',
        yield: { primary_discipline: 'order', primary_xp: 50, secondary_yields: [{ discipline: 'care', xp: 20 }], credits_earned: 5 },
      }),
    );

    const service = new ProgressionService(ledgerRepository);
    const progression = await service.getParticipantProgression('participant-1');

    expect(progression.find((entry) => entry.discipline === 'order')?.cumulative_xp).toBe(150);
    expect(progression.find((entry) => entry.discipline === 'care')?.cumulative_xp).toBe(20);
  });

  it('reflects Mastery at 10,000 cumulative XP (PROGRESSION_SPEC.md §2)', async () => {
    const ledgerRepository = new InMemoryLedgerRepository();
    await ledgerRepository.saveTransaction(
      makeTransaction({ yield: { primary_discipline: 'order', primary_xp: 10000, secondary_yields: [], credits_earned: 1000 } }),
    );

    const service = new ProgressionService(ledgerRepository);
    const progression = await service.getParticipantProgression('participant-1');

    const order = progression.find((entry) => entry.discipline === 'order');
    expect(order?.current_level).toBe(10);
    expect(order?.state).toBe('mastered');
  });

  it('applies compensating xp_adjustments from reward-adjustment corrections', async () => {
    const ledgerRepository = new InMemoryLedgerRepository();
    await ledgerRepository.saveTransaction(makeTransaction());
    await ledgerRepository.saveAdjustment({
      adjustment_id: 'adjustment-1',
      original_transaction_id: 'transaction-1',
      reason: 'admin_reversal',
      xp_adjustments: [{ discipline: 'order', xp_delta: -100 }],
      credits_delta: -10,
      created_at: '2026-01-06T00:00:00Z',
      created_by_user_id: 'admin-1',
    });

    const service = new ProgressionService(ledgerRepository);
    const progression = await service.getParticipantProgression('participant-1');

    expect(progression.find((entry) => entry.discipline === 'order')?.cumulative_xp).toBe(0);
  });

  it('never returns negative cumulative XP even if adjustments over-correct', async () => {
    const ledgerRepository = new InMemoryLedgerRepository();
    await ledgerRepository.saveTransaction(makeTransaction());
    await ledgerRepository.saveAdjustment({
      adjustment_id: 'adjustment-1',
      original_transaction_id: 'transaction-1',
      reason: 'system_correction',
      xp_adjustments: [{ discipline: 'order', xp_delta: -500 }],
      credits_delta: -50,
      created_at: '2026-01-06T00:00:00Z',
      created_by_user_id: 'admin-1',
    });

    const service = new ProgressionService(ledgerRepository);
    const progression = await service.getParticipantProgression('participant-1');

    expect(progression.find((entry) => entry.discipline === 'order')?.cumulative_xp).toBe(0);
  });
});
