import './participant-profile.css';
import type { HouseholdParticipant } from './tasks';

type DomainFixture = {
  name: string;
  rank: number;
  disciplines: { name: string; rank: number }[];
};

const domainFixtures: Record<string, DomainFixture[]> = {
  'participant:alex': [
    { name: 'Kinetic', rank: 3, disciplines: [{ name: 'Force', rank: 2 }, { name: 'Motion', rank: 4 }, { name: 'Precision', rank: 2 }] },
    { name: 'Erudite', rank: 2, disciplines: [{ name: 'Inquiry', rank: 3 }, { name: 'Reason', rank: 2 }, { name: 'Synthesis', rank: 1 }] },
    { name: 'Form', rank: 1, disciplines: [{ name: 'Making', rank: 2 }, { name: 'Composition', rank: 1 }, { name: 'Craft', rank: 1 }] },
    { name: 'Keeping', rank: 4, disciplines: [{ name: 'Care', rank: 4 }, { name: 'Order', rank: 5 }, { name: 'Renewal', rank: 3 }] },
  ],
};

const fallbackDomains: DomainFixture[] = [
  { name: 'Kinetic', rank: 1, disciplines: [{ name: 'Force', rank: 1 }, { name: 'Motion', rank: 1 }, { name: 'Precision', rank: 1 }] },
  { name: 'Erudite', rank: 1, disciplines: [{ name: 'Inquiry', rank: 1 }, { name: 'Reason', rank: 1 }, { name: 'Synthesis', rank: 1 }] },
  { name: 'Form', rank: 1, disciplines: [{ name: 'Making', rank: 1 }, { name: 'Composition', rank: 1 }, { name: 'Craft', rank: 1 }] },
  { name: 'Keeping', rank: 1, disciplines: [{ name: 'Care', rank: 1 }, { name: 'Order', rank: 1 }, { name: 'Renewal', rank: 1 }] },
];

const profileFixtures: Record<string, { credits: number; perks: string[] }> = {
  'participant:alex': {
    credits: 142,
    perks: ['Early riser', 'Kitchen regular', 'Reliable hands'],
  },
};

export async function renderParticipantProfile(target: HTMLDivElement, participant: HouseholdParticipant): Promise<void> {
  const fixture = profileFixtures[participant.id] ?? { credits: 0, perks: [] };
  const domains = domainFixtures[participant.id] ?? fallbackDomains;

  target.innerHTML = `
    <main class="participant-profile" aria-label="${escapeHtml(participant.name)} profile">
      <header class="participant-profile-toolbar">
        <button type="button" class="participant-profile-back" data-profile-back>Back</button>
      </header>

      <div class="participant-profile-sheet">
        <section class="participant-profile-hero" aria-label="Identity and progression">
          <div class="participant-expression-stage">
            <div class="participant-expression-field" aria-label="Participant expression field">
              <div class="participant-expression-inner" aria-hidden="true"></div>
              <div class="participant-identity-marker" aria-hidden="true">${renderParticipantInitial(participant)}</div>
              <div class="participant-expression-name">${escapeHtml(participant.name)}</div>
            </div>
          </div>

          <aside class="participant-domain-ledger" aria-label="Domain progression">
            <div class="participant-domains">
              ${domains.map(renderDomain).join('')}
            </div>
          </aside>
        </section>

        <section class="participant-profile-foundation" aria-label="Participant profile details">
          <section class="participant-profile-section participant-perks" aria-labelledby="participant-perks-heading">
            <div class="participant-section-heading">
              <h2 id="participant-perks-heading">Perks</h2>
            </div>
            ${fixture.perks.length
              ? `<ul>${fixture.perks.map((perk) => `<li>${escapeHtml(perk)}</li>`).join('')}</ul>`
              : '<p class="participant-empty">None earned yet</p>'}
          </section>

          <section class="participant-profile-section participant-rewards" aria-labelledby="participant-rewards-heading">
            <div class="participant-section-heading">
              <h2 id="participant-rewards-heading">Rewards</h2>
            </div>
            <div class="participant-credit-balance">
              <strong>${fixture.credits}</strong>
              <span>Credits available</span>
            </div>
            <p class="participant-empty">No redemption history</p>
          </section>

          <section class="participant-profile-section participant-connections" aria-labelledby="participant-connections-heading">
            <div class="participant-section-heading">
              <h2 id="participant-connections-heading">Connections</h2>
            </div>
            <p class="participant-empty">No connected services</p>
          </section>
        </section>
      </div>
    </main>
  `;

  target.querySelector<HTMLButtonElement>('[data-profile-back]')?.addEventListener('click', () => {
    window.history.back();
  });
}

function renderParticipantInitial(participant: HouseholdParticipant): string {
  const first = participant.name.trim().charAt(0);
  if (participant.avatarUrl) return `<img src="${escapeHtml(participant.avatarUrl)}" alt="">`;
  return escapeHtml(first.toUpperCase());
}

function renderDomain(domain: DomainFixture): string {
  return `
    <div class="participant-domain">
      <div class="participant-domain-head">
        <span class="participant-domain-rank">${toRoman(domain.rank)}</span>
        <span class="participant-domain-name">${escapeHtml(domain.name)}</span>
      </div>
      <ul class="participant-disciplines">
        ${domain.disciplines.map((discipline) => `
          <li><span class="participant-discipline-rank">${toRoman(discipline.rank)}</span><span>${escapeHtml(discipline.name)}</span></li>
        `).join('')}
      </ul>
    </div>
  `;
}

function toRoman(value: number): string {
  const numerals: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let remaining = Math.max(1, Math.floor(value));
  let result = '';
  for (const [unit, numeral] of numerals) {
    while (remaining >= unit) {
      result += numeral;
      remaining -= unit;
    }
  }
  return result;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
