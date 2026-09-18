import './participant-profile.css';
import type { HouseholdParticipant } from './tasks';
import {
  attachPolling,
  participantLedgerApi,
  participantProgressionApi,
  participantRedemptionsApi,
  rewardsApi,
  startPolling,
  type DisciplineProgressDto,
  type RewardDto,
  type RewardRedemptionDto,
  type RewardTransactionDto,
} from './api-client';

type TaskDomain = 'kinetic' | 'erudite' | 'form' | 'keeping';

const DOMAIN_ORDER: TaskDomain[] = ['kinetic', 'erudite', 'form', 'keeping'];
const DOMAIN_LABELS: Record<TaskDomain, string> = {
  kinetic: 'Kinetic',
  erudite: 'Erudite',
  form: 'Form',
  keeping: 'Keeping',
};

// Mirrors DISCIPLINE_DOMAIN_MAP in backend/src/types/task-domain.types.ts.
const DISCIPLINE_DOMAIN_MAP: Record<string, TaskDomain> = {
  motion: 'kinetic',
  force: 'kinetic',
  precision: 'kinetic',
  inquiry: 'erudite',
  reason: 'erudite',
  synthesis: 'erudite',
  making: 'form',
  composition: 'form',
  craft: 'form',
  care: 'keeping',
  order: 'keeping',
  renewal: 'keeping',
};

type DomainView = {
  name: string;
  rank: number;
  disciplines: { name: string; rank: number }[];
};

type CreditActivityItem = { label: string; amountLabel: string };
type RedemptionHistoryItem = { title: string; costLabel: string };

type ProfileData = {
  domains: DomainView[];
  balance: number | null;
  creditActivity: CreditActivityItem[];
  redemptionHistory: RedemptionHistoryItem[];
};

const RECENT_ITEM_LIMIT = 4;

export async function renderParticipantProfile(target: HTMLDivElement, participant: HouseholdParticipant): Promise<void> {
  const draw = async (): Promise<void> => {
    const data = await loadProfileData(participant.id);
    target.innerHTML = renderMarkup(participant, data);
    wire(target);
  };

  await draw();
  attachPolling(target, startPolling(draw));
}

async function loadProfileData(participantId: string): Promise<ProfileData> {
  const [progression, ledger, redemptions, rewards] = await Promise.all([
    participantProgressionApi.get(participantId).catch(() => [] as DisciplineProgressDto[]),
    participantLedgerApi.get(participantId).catch(() => null),
    participantRedemptionsApi.list(participantId).catch(() => [] as RewardRedemptionDto[]),
    rewardsApi.list().catch(() => [] as RewardDto[]),
  ]);

  const rewardsById = new Map(rewards.map((reward) => [reward.id, reward]));

  return {
    domains: toDomainViews(progression),
    balance: ledger?.balance ?? null,
    creditActivity: buildCreditActivity(ledger?.transactions ?? []),
    redemptionHistory: buildRedemptionHistory(redemptions, rewardsById),
  };
}

function toDomainViews(progression: DisciplineProgressDto[]): DomainView[] {
  const byDomain = new Map<TaskDomain, DisciplineProgressDto[]>();
  for (const entry of progression) {
    const domain = DISCIPLINE_DOMAIN_MAP[entry.discipline];
    if (!domain) continue;
    const list = byDomain.get(domain) ?? [];
    list.push(entry);
    byDomain.set(domain, list);
  }

  return DOMAIN_ORDER.map((domain) => {
    const disciplines = byDomain.get(domain) ?? [];
    return {
      name: DOMAIN_LABELS[domain],
      // Domain rank is not a documented concept (PARTICIPANT_PROFILE_SPEC.md
      // only defines per-Discipline levels) — judgment call: the highest
      // level among the Domain's constituent Disciplines.
      rank: disciplines.reduce((max, item) => Math.max(max, item.current_level), 1),
      disciplines: disciplines.map((item) => ({ name: capitalize(item.discipline), rank: item.current_level })),
    };
  });
}

function buildCreditActivity(transactions: RewardTransactionDto[]): CreditActivityItem[] {
  return [...transactions]
    .filter((transaction) => transaction.reward_event_type !== 'reward_redemption')
    .sort((a, b) => b.processed_at.localeCompare(a.processed_at))
    .slice(0, RECENT_ITEM_LIMIT)
    .map((transaction) => {
      const label = transaction.yield.primary_discipline ? capitalize(transaction.yield.primary_discipline) : 'Task';
      return { label, amountLabel: `${formatSigned(transaction.yield.credits_earned)} credits` };
    });
}

function buildRedemptionHistory(
  redemptions: RewardRedemptionDto[],
  rewardsById: Map<string, RewardDto>,
): RedemptionHistoryItem[] {
  return [...redemptions]
    .sort((a, b) => b.redeemed_at.localeCompare(a.redeemed_at))
    .slice(0, RECENT_ITEM_LIMIT)
    .map((redemption) => ({
      title: rewardsById.get(redemption.reward_id)?.title ?? 'Reward',
      costLabel: `${redemption.final_cost_paid} credits`,
    }));
}

function renderMarkup(participant: HouseholdParticipant, data: ProfileData): string {
  return `
    <main class="participant-profile" aria-label="${escapeHtml(participant.name)} profile">
      <header class="participant-profile-toolbar">
        <button type="button" class="participant-profile-back" data-profile-back>Back</button>
        <button type="button" class="participant-profile-rewards-link" data-profile-rewards>Rewards</button>
      </header>

      <div class="participant-profile-composition">
        <section class="participant-expression-composition" aria-label="Identity and expression">
          <div class="participant-expression-field">
            <div class="participant-expression-inner" aria-hidden="true"></div>
            <div class="participant-identity-marker">${renderParticipantInitial(participant)}</div>
            <div class="participant-expression-name">${escapeHtml(participant.name)}</div>
          </div>

          <aside class="domain-arc-group" aria-label="Domain progression">
            ${data.domains.map((domain, index) => renderDomain(domain, index)).join('')}
          </aside>
        </section>

        <section class="participant-profile-foundation" aria-label="Participant profile details">
          <section class="participant-profile-section participant-perks" aria-labelledby="participant-perks-heading">
            <h2 id="participant-perks-heading">Perks</h2>
            <p>None earned yet</p>
          </section>

          <section class="participant-profile-section participant-credits" aria-labelledby="participant-credits-heading">
            <h2 id="participant-credits-heading">Credits</h2>
            <p class="participant-credits-balance">${data.balance === null ? '—' : formatCredits(data.balance)} <span>credits</span></p>
            <div class="participant-credits-groups">
              <div class="participant-credits-group" aria-label="Recent credits">
                <h3>Recent</h3>
                ${data.creditActivity.length
                  ? `<ul>${data.creditActivity.map((item) => `<li><span>${escapeHtml(item.label)}</span><span>${escapeHtml(item.amountLabel)}</span></li>`).join('')}</ul>`
                  : '<p class="participant-credits-empty">No activity yet</p>'}
              </div>
              <div class="participant-credits-group" aria-label="Redemption history">
                <h3>Redeemed</h3>
                ${data.redemptionHistory.length
                  ? `<ul>${data.redemptionHistory.map((item) => `<li><span>${escapeHtml(item.title)}</span><span>${escapeHtml(item.costLabel)}</span></li>`).join('')}</ul>`
                  : '<p class="participant-credits-empty">No redemptions yet</p>'}
              </div>
            </div>
          </section>

          <section class="participant-profile-section participant-connections" aria-labelledby="participant-connections-heading">
            <h2 id="participant-connections-heading">Connections</h2>
            <p>No connected services</p>
          </section>
        </section>
      </div>
    </main>
  `;
}

function wire(target: HTMLDivElement): void {
  target.querySelector<HTMLButtonElement>('[data-profile-back]')?.addEventListener('click', () => window.history.back());
  target.querySelector<HTMLButtonElement>('[data-profile-rewards]')?.addEventListener('click', () => {
    window.location.hash = '#rewards';
  });
}

function renderParticipantInitial(participant: HouseholdParticipant): string {
  const first = participant.name.trim().charAt(0);
  if (participant.avatarUrl) return `<img src="${escapeHtml(participant.avatarUrl)}" alt="">`;
  return escapeHtml(first.toUpperCase());
}

function renderDomain(domain: DomainView, index: number): string {
  return `
    <div class="domain-node domain-node-${index + 1}">
      <div class="domain-vessel">
        <svg class="domain-vessel-frame" viewBox="0 0 150 100" aria-hidden="true" preserveAspectRatio="none">
          <path d="M25 1 H125 L149 50 L125 99 H25 L1 50 Z" fill="none" stroke="currentColor" vector-effect="non-scaling-stroke" />
        </svg>
        <span class="domain-rank-badge">${toRoman(domain.rank)}</span>
        <span class="domain-name-badge">${escapeHtml(domain.name)}</span>
      </div>
      <div class="discipline-list" aria-label="${escapeHtml(domain.name)} disciplines">
        ${domain.disciplines.map((discipline) => `
          <div class="discipline-item">
            <span class="discipline-rank">${toRoman(discipline.rank).toLowerCase()}</span>
            <span class="discipline-name">${escapeHtml(discipline.name)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function toRoman(value: number): string {
  const numerals: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let remaining = Math.max(1, Math.floor(value));
  let result = '';
  for (const [unit, numeral] of numerals) {
    while (remaining >= unit) { result += numeral; remaining -= unit; }
  }
  return result;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCredits(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${formatCredits(value)}` : formatCredits(value);
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

