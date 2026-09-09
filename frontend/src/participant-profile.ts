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

const profileFixtures: Record<string, { perks: string[] }> = {
  'participant:alex': { perks: ['Early riser', 'Kitchen regular', 'Reliable hands'] },
};

export async function renderParticipantProfile(target: HTMLDivElement, participant: HouseholdParticipant): Promise<void> {
  const fixture = profileFixtures[participant.id] ?? { perks: [] };
  const domains = domainFixtures[participant.id] ?? fallbackDomains;

  target.innerHTML = `
    <main class="participant-profile" aria-label="${escapeHtml(participant.name)} profile">
      <header class="participant-profile-toolbar">
        <button type="button" class="participant-profile-back" data-profile-back>Back</button>
      </header>

      <div class="participant-profile-composition">
        <section class="participant-expression-composition" aria-label="Identity and expression">
          <div class="participant-expression-field">
            <div class="participant-expression-inner" aria-hidden="true"></div>
            <div class="participant-identity-marker">${renderParticipantInitial(participant)}</div>
            <div class="participant-expression-name">${escapeHtml(participant.name)}</div>
          </div>

          <aside class="participant-domain-orbit" aria-label="Domain progression">
            ${domains.map((domain, index) => renderDomain(domain, index)).join('')}
          </aside>
        </section>

        <section class="participant-profile-foundation" aria-label="Participant profile details">
          <section class="participant-profile-section participant-perks" aria-labelledby="participant-perks-heading">
            <h2 id="participant-perks-heading">Perks</h2>
            ${fixture.perks.length ? `<ul>${fixture.perks.map((perk) => `<li>${escapeHtml(perk)}</li>`).join('')}</ul>` : '<p>None earned yet</p>'}
          </section>

          <section class="participant-profile-section participant-tbd" aria-label="Reserved profile space">
            <span>TBD</span>
          </section>

          <section class="participant-profile-section participant-connections" aria-labelledby="participant-connections-heading">
            <h2 id="participant-connections-heading">Connections</h2>
            <p>No connected services</p>
          </section>
        </section>
      </div>
    </main>
  `;

  target.querySelector<HTMLButtonElement>('[data-profile-back]')?.addEventListener('click', () => window.history.back());
}

function renderParticipantInitial(participant: HouseholdParticipant): string {
  const first = participant.name.trim().charAt(0);
  if (participant.avatarUrl) return `<img src="${escapeHtml(participant.avatarUrl)}" alt="">`;
  return escapeHtml(first.toUpperCase());
}

function renderDomain(domain: DomainFixture, index: number): string {
  return `
    <div class="participant-domain-node participant-domain-${index + 1}">
      <div class="participant-domain-vessel-wrap">
        <div class="participant-domain-vessel" aria-label="${escapeHtml(domain.name)} domain rank ${toRoman(domain.rank)}">
          <svg class="participant-domain-vessel-frame" viewBox="0 0 150 100" aria-hidden="true" preserveAspectRatio="none">
            <path d="M25 1 H125 L149 50 L125 99 H25 L1 50 Z" fill="none" stroke="currentColor" vector-effect="non-scaling-stroke" />
          </svg>
          <span class="domain-rank-badge">${toRoman(domain.rank)}</span>
          <span class="domain-name-badge">${escapeHtml(domain.name)}</span>
        </div>
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

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
