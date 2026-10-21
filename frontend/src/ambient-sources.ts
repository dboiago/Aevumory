export type AmbientSourceKind = 'google-photos' | 'icloud' | 'device' | 'aevumory';
export type AmbientSourceStatus = 'included' | 'not-included' | 'unavailable' | 'empty';

export type AmbientImageSource = {
  id: string;
  kind: AmbientSourceKind;
  name: string;
  owner?: string;
  scope: string;
  imageCount: number;
  status: AmbientSourceStatus;
};

/**
 * Real installs start with NO image sources (product decision,
 * 2026-10-20: the fake Alice/Bob/household fixture sources are gone).
 * Sources appear here only when a real provider connection exists —
 * the secure sync work is future scope; until then the Sources screen
 * honestly shows the available source kinds with nothing connected.
 */
export const fixtureAmbientSources: AmbientImageSource[] = [];

export const availableAmbientSourceKinds: Array<{ kind: AmbientSourceKind; name: string }> = [
  { kind: 'google-photos', name: 'Google Photos' },
  { kind: 'icloud', name: 'iCloud Photos' },
  { kind: 'device', name: 'This device' },
  { kind: 'aevumory', name: 'Aevumory Collection' },
];
