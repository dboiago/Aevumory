import {
  availableAmbientSourceKinds,
  fixtureAmbientSources,
  type AmbientImageSource,
  type AmbientSourceKind,
} from './ambient-sources';

export function renderAmbientDisplay(target: HTMLDivElement, path: string): void {
  const sourceMatch = path.match(/^#ambient-display\/source\/([^/]+)$/);
  if (sourceMatch) {
    const source = fixtureAmbientSources.find((item) => item.id === decodeURIComponent(sourceMatch[1]));
    if (source) {
      renderSourceDetail(target, source);
      return;
    }
  }

  if (path === '#ambient-display/add') {
    renderAddSource(target);
    return;
  }

  renderSourceOverview(target);
}

function renderSourceOverview(target: HTMLDivElement): void {
  target.innerHTML = `
    <main class="ambient-settings" aria-label="Ambient Display">
      <header class="ambient-settings-header">
        <div>
          <p class="eyebrow">Ambient Display</p>
          <h1>Image Sources</h1>
        </div>
      </header>
      <section class="ambient-source-list" aria-label="Ambient image sources">
        ${fixtureAmbientSources.map(renderSourceCard).join('')}
      </section>
      <div class="ambient-settings-actions">
        <button type="button" class="ambient-secondary-action" data-add-source>+ Add image source</button>
      </div>
    </main>
  `;

  target.querySelectorAll<HTMLElement>('[data-source-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const sourceId = card.dataset.sourceId;
      if (sourceId) window.location.hash = `#ambient-display/source/${encodeURIComponent(sourceId)}`;
    });
  });

  target.querySelector<HTMLButtonElement>('[data-add-source]')?.addEventListener('click', () => {
    window.location.hash = '#ambient-display/add';
  });
}

function renderSourceCard(source: AmbientImageSource): string {
  const status = source.status === 'included' ? 'Included' : source.status === 'not-included' ? 'Not included' : source.status === 'unavailable' ? 'Temporarily unavailable' : 'No eligible images';
  const scope = source.owner ? `${escapeHtml(source.owner)} · ${escapeHtml(source.scope)}` : escapeHtml(source.scope);

  return `
    <button type="button" class="ambient-source-card" data-source-id="${escapeHtml(source.id)}">
      <span class="ambient-source-card-main">
        <span class="ambient-source-name">${escapeHtml(source.name)}</span>
        <span class="ambient-source-meta">${scope} · ${source.imageCount.toLocaleString('en-CA')} images</span>
      </span>
      <span class="ambient-source-status ${source.status === 'included' ? 'ambient-source-status-included' : ''}">${status}</span>
    </button>
  `;
}

function renderAddSource(target: HTMLDivElement): void {
  target.innerHTML = `
    <main class="ambient-settings" aria-label="Add image source">
      <header class="ambient-settings-header ambient-settings-header-with-back">
        <button type="button" class="ambient-back-action" data-back>Image Sources</button>
        <div>
          <p class="eyebrow">Ambient Display</p>
          <h1>Add image source</h1>
        </div>
      </header>
      <section class="ambient-source-choices" aria-label="Available image sources">
        ${availableAmbientSourceKinds.map(renderSourceChoice).join('')}
      </section>
    </main>
  `;

  target.querySelector<HTMLButtonElement>('[data-back]')?.addEventListener('click', () => {
    window.location.hash = '#ambient-display';
  });

  target.querySelectorAll<HTMLButtonElement>('[data-source-kind]').forEach((button) => {
    button.addEventListener('click', () => {
      const kind = button.dataset.sourceKind as AmbientSourceKind | undefined;
      if (kind) renderConnectionStep(target, kind);
    });
  });
}

function renderSourceChoice(source: { kind: AmbientSourceKind; name: string }): string {
  return `
    <button type="button" class="ambient-source-choice" data-source-kind="${source.kind}">
      <span>${escapeHtml(source.name)}</span>
      <span aria-hidden="true">›</span>
    </button>
  `;
}

function renderConnectionStep(target: HTMLDivElement, kind: AmbientSourceKind): void {
  const name = availableAmbientSourceKinds.find((item) => item.kind === kind)?.name ?? 'Image source';
  const local = kind === 'device' || kind === 'aevumory';

  target.innerHTML = `
    <main class="ambient-settings" aria-label="Connect image source">
      <header class="ambient-settings-header ambient-settings-header-with-back">
        <button type="button" class="ambient-back-action" data-back>Add image source</button>
        <div>
          <p class="eyebrow">${escapeHtml(name)}</p>
          <h1>${local ? 'Choose source' : `Connect ${escapeHtml(name)}`}</h1>
        </div>
      </header>
      <section class="ambient-source-step">
        <p class="ambient-source-explanation">${local ? 'Choose what Aevumory may use from this device.' : `Your photos remain in ${escapeHtml(name)}. Aevumory only uses the images you choose.`}</p>
        <button type="button" class="ambient-primary-action" data-continue>Continue</button>
      </section>
    </main>
  `;

  target.querySelector<HTMLButtonElement>('[data-back]')?.addEventListener('click', () => {
    renderAddSource(target);
    window.history.replaceState(null, '', '#ambient-display/add');
  });

  target.querySelector<HTMLButtonElement>('[data-continue]')?.addEventListener('click', () => {
    renderSelectionStep(target, kind, name);
  });
}

function renderSelectionStep(target: HTMLDivElement, kind: AmbientSourceKind, name: string): void {
  const source = fixtureAmbientSources.find((item) => item.kind === kind);
  const owner = source?.owner;
  const canSelectIndividuals = kind !== 'aevumory';

  target.innerHTML = `
    <main class="ambient-settings" aria-label="Choose Ambient Display images">
      <header class="ambient-settings-header ambient-settings-header-with-back">
        <button type="button" class="ambient-back-action" data-back>Back</button>
        <div>
          <p class="eyebrow">${escapeHtml(name)}</p>
          <h1>Choose what to include</h1>
        </div>
      </header>
      <section class="ambient-selection-panel">
        ${owner ? `<p class="ambient-selection-owner">Source owner · ${escapeHtml(owner)}</p>` : ''}
        <label class="ambient-selection-row ambient-selection-row-all">
          <span>
            <span class="ambient-selection-title">All photos</span>
            <span class="ambient-selection-description">Include current and future photos available through this connection</span>
          </span>
          <input type="checkbox" checked>
        </label>
        <div class="ambient-selection-section-label">${kind === 'device' ? 'Folders' : 'Albums'}</div>
        ${renderSelectionRow('Family', true)}
        ${renderSelectionRow('Travel', true)}
        ${renderSelectionRow('Cottage', false)}
        ${canSelectIndividuals ? '<button type="button" class="ambient-individual-selection">Individual images <span aria-hidden="true">›</span></button>' : ''}
      </section>
      <div class="ambient-settings-actions">
        <button type="button" class="ambient-primary-action" data-done>Done</button>
      </div>
    </main>
  `;

  target.querySelector<HTMLButtonElement>('[data-back]')?.addEventListener('click', () => {
    renderConnectionStep(target, kind);
  });

  target.querySelector<HTMLButtonElement>('[data-done]')?.addEventListener('click', () => {
    renderCompletionStep(target, name, owner);
  });
}

function renderSelectionRow(label: string, checked: boolean): string {
  return `
    <label class="ambient-selection-row">
      <span class="ambient-selection-title">${escapeHtml(label)}</span>
      <input type="checkbox" ${checked ? 'checked' : ''}>
    </label>
  `;
}

function renderCompletionStep(target: HTMLDivElement, name: string, owner?: string): void {
  target.innerHTML = `
    <main class="ambient-settings" aria-label="Image source added">
      <header class="ambient-settings-header">
        <div>
          <p class="eyebrow">${escapeHtml(name)}</p>
          <h1>Included in Ambient Display</h1>
        </div>
      </header>
      <section class="ambient-completion-panel">
        ${owner ? `<p>${escapeHtml(owner)}</p>` : ''}
        <p>3 albums · 1,284 images</p>
      </section>
      <div class="ambient-settings-actions">
        <button type="button" class="ambient-primary-action" data-done>Done</button>
      </div>
    </main>
  `;

  target.querySelector<HTMLButtonElement>('[data-done]')?.addEventListener('click', () => {
    window.location.hash = '#ambient-display';
  });
}

function renderSourceDetail(target: HTMLDivElement, source: AmbientImageSource): void {
  const privateSource = Boolean(source.owner);
  target.innerHTML = `
    <main class="ambient-settings" aria-label="${escapeHtml(source.name)}">
      <header class="ambient-settings-header ambient-settings-header-with-back">
        <button type="button" class="ambient-back-action" data-back>Image Sources</button>
        <div>
          <p class="eyebrow">Ambient Display</p>
          <h1>${escapeHtml(source.name)}</h1>
        </div>
      </header>
      <section class="ambient-source-detail">
        <div class="ambient-detail-line"><span>Owner</span><strong>${privateSource ? escapeHtml(source.owner ?? '') : 'Household'}</strong></div>
        <div class="ambient-detail-line"><span>Included</span><strong>${escapeHtml(source.scope)}</strong></div>
        <div class="ambient-detail-line"><span>Images</span><strong>${source.imageCount.toLocaleString('en-CA')}</strong></div>
        ${privateSource ? '<p class="ambient-private-note">Further source contents require the source owner’s PIN</p>' : ''}
      </section>
      <div class="ambient-settings-actions">
        <button type="button" class="ambient-primary-action" data-edit>${privateSource ? 'Authenticate to manage' : 'Manage source'}</button>
      </div>
    </main>
  `;

  target.querySelector<HTMLButtonElement>('[data-back]')?.addEventListener('click', () => {
    window.location.hash = '#ambient-display';
  });

  target.querySelector<HTMLButtonElement>('[data-edit]')?.addEventListener('click', () => {
    if (privateSource) {
      window.alert(`Enter ${source.owner}'s PIN to continue`);
      return;
    }
    renderSelectionStep(target, source.kind, source.name);
  });
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
