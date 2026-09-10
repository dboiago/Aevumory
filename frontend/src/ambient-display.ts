import './ambient-display.css';
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

  if (path.startsWith('#ambient-display/add')) {
    const query = path.split('?')[1] ?? '';
    const selectedKind = new URLSearchParams(query).get('kind') as AmbientSourceKind | null;
    if (selectedKind) {
      const name = availableAmbientSourceKinds.find((item) => item.kind === selectedKind)?.name ?? 'Image source';
      renderConnectionStep(target, selectedKind, name);
    } else {
      renderAddSource(target);
    }
    return;
  }

  renderSourceOverview(target);
}

function renderSourceOverview(target: HTMLDivElement): void {
  const grouped = availableAmbientSourceKinds.map((kind) => ({
    ...kind,
    sources: fixtureAmbientSources.filter((source) => source.kind === kind.kind),
  }));

  target.innerHTML = `
    <main class="ambient-settings" aria-label="Ambient Display">
      <header class="ambient-settings-header">
        <div>
          <p class="eyebrow">Ambient Display</p>
          <h1>Image Sources</h1>
        </div>
      </header>
      <section class="ambient-source-groups" aria-label="Ambient image sources">
        ${grouped.map(renderSourceGroup).join('')}
      </section>
      <p class="ambient-source-disclaimer">Aevumory only uses the images you choose and does not modify or send images off device.</p>
    </main>
  `;

  target.querySelectorAll<HTMLElement>('[data-source-id]').forEach((row) => {
    row.addEventListener('click', () => {
      const sourceId = row.dataset.sourceId;
      if (sourceId) window.location.hash = `#ambient-display/source/${encodeURIComponent(sourceId)}`;
    });
  });

  target.querySelectorAll<HTMLButtonElement>('[data-add-kind]').forEach((button) => {
    button.addEventListener('click', () => {
      const kind = button.dataset.addKind as AmbientSourceKind | undefined;
      if (kind) window.location.hash = `#ambient-display/add?kind=${encodeURIComponent(kind)}`;
    });
  });
}

function renderSourceGroup(group: {
  kind: AmbientSourceKind;
  name: string;
  sources: AmbientImageSource[];
}): string {
  const rows = group.sources.map(renderSourceRow).join('');
  const addAction = group.kind === 'aevumory' ? '' : `<button type="button" class="ambient-inline-action" data-add-kind="${escapeHtml(group.kind)}">Add</button>`;

  return `
    <section class="ambient-source-group" aria-label="${escapeHtml(group.name)}">
      <div class="ambient-source-group-card">
        <h2>${escapeHtml(group.name)}</h2>
        <div class="ambient-source-group-content">
          ${rows || '<p class="ambient-source-empty">Not connected</p>'}
          ${addAction ? `<div class="ambient-source-group-action">${addAction}</div>` : ''}
        </div>
      </div>
    </section>
  `;
}

function renderSourceRow(source: AmbientImageSource): string {
  const scope = `${escapeHtml(source.scope)} · ${source.imageCount.toLocaleString('en-CA')} images`;
  return `
    <button type="button" class="ambient-source-row" data-source-id="${escapeHtml(source.id)}">
      <span class="ambient-source-owner">${escapeHtml(source.owner ?? 'Household')}</span>
      <span class="ambient-source-meta">${scope}</span>
    </button>
  `;
}

function renderAddSource(target: HTMLDivElement): void {
  target.innerHTML = `
    <main class="ambient-settings" aria-label="Add image source">
      <header class="ambient-settings-header ambient-settings-header-with-back">
        <button type="button" class="ambient-back-action" data-back>← Back</button>
        <div>
          <h1>Add image source</h1>
        </div>
      </header>
      <section class="ambient-source-choices" aria-label="Available image sources">
        ${availableAmbientSourceKinds.map(renderSourceChoice).join('')}
      </section>
    </main>
  `;

  bindBack(target, () => {
    window.location.hash = '#ambient-display';
  });

  target.querySelectorAll<HTMLButtonElement>('[data-source-kind]').forEach((button) => {
    button.addEventListener('click', () => {
      const kind = button.dataset.sourceKind as AmbientSourceKind | undefined;
      if (kind) {
        const name = availableAmbientSourceKinds.find((item) => item.kind === kind)?.name ?? 'Image source';
        window.location.hash = `#ambient-display/add?kind=${encodeURIComponent(kind)}`;
        renderConnectionStep(target, kind, name);
      }
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

function renderConnectionStep(target: HTMLDivElement, kind: AmbientSourceKind, name: string): void {
  const local = kind === 'device' || kind === 'aevumory';

  target.innerHTML = `
    <main class="ambient-settings" aria-label="Add ${escapeHtml(name)} source">
      <header class="ambient-settings-header ambient-settings-header-with-back">
        <button type="button" class="ambient-back-action" data-back>← Back</button>
        <div>
          <h1>${escapeHtml(name)}</h1>
        </div>
      </header>
      <section class="ambient-source-step">
        <p class="ambient-source-explanation">${local ? 'Choose what Aevumory may use from this device.' : `Connect ${escapeHtml(name)} to choose what Aevumory may use.`}</p>
        <button type="button" class="ambient-primary-action" data-continue>${local ? 'Choose' : `Connect ${escapeHtml(name)}`}</button>
      </section>
    </main>
  `;

  bindBack(target, () => {
    window.location.hash = '#ambient-display';
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
        <button type="button" class="ambient-back-action" data-back>← Back</button>
        <div>
          <h1>${escapeHtml(name)}</h1>
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

  bindBack(target, () => {
    const name = availableAmbientSourceKinds.find((item) => item.kind === kind)?.name ?? 'Image source';
    renderConnectionStep(target, kind, name);
  });

  target.querySelector<HTMLButtonElement>('[data-done]')?.addEventListener('click', () => {
    renderCompletionStep(target, name, owner, kind);
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

function renderCompletionStep(target: HTMLDivElement, name: string, owner: string | undefined, kind: AmbientSourceKind): void {
  target.innerHTML = `
    <main class="ambient-settings" aria-label="Image source added">
      <header class="ambient-settings-header ambient-settings-header-with-back">
        <button type="button" class="ambient-back-action" data-back>← Back</button>
        <div>
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

  bindBack(target, () => renderSelectionStep(target, kind, name));

  target.querySelector<HTMLButtonElement>('[data-done]')?.addEventListener('click', () => {
    window.location.hash = '#ambient-display';
  });
}

function renderSourceDetail(target: HTMLDivElement, source: AmbientImageSource): void {
  const privateSource = Boolean(source.owner);
  target.innerHTML = `
    <main class="ambient-settings" aria-label="${escapeHtml(source.name)}">
      <header class="ambient-settings-header ambient-settings-header-with-back">
        <button type="button" class="ambient-back-action" data-back>← Back</button>
        <div>
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

  bindBack(target, () => {
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

function bindBack(target: HTMLDivElement, action: () => void): void {
  target.querySelector<HTMLButtonElement>('[data-back]')?.addEventListener('click', action);

  let startX = 0;
  let startY = 0;
  let tracking = false;

  target.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches[0];
    if (touch.clientX <= 32) {
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
    }
  }, { passive: true });

  target.addEventListener('touchend', (event) => {
    if (!tracking) return;
    tracking = false;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = Math.abs(touch.clientY - startY);
    if (deltaX >= 70 && deltaX > deltaY * 1.5) action();
  }, { passive: true });
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
