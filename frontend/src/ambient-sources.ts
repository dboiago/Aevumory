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

export const fixtureAmbientSources: AmbientImageSource[] = [
  {
    id: 'google-photos-alice',
    kind: 'google-photos',
    name: 'Google Photos',
    owner: 'Alice',
    scope: '3 albums',
    imageCount: 1284,
    status: 'included',
  },
  {
    id: 'icloud-bob',
    kind: 'icloud',
    name: 'iCloud Photos',
    owner: 'Bob',
    scope: '2 folders',
    imageCount: 436,
    status: 'included',
  },
  {
    id: 'device',
    kind: 'device',
    name: 'This device',
    scope: 'Pictures',
    imageCount: 218,
    status: 'included',
  },
  {
    id: 'aevumory',
    kind: 'aevumory',
    name: 'Aevumory Collection',
    scope: 'Built-in collection',
    imageCount: 24,
    status: 'included',
  },
];

export const availableAmbientSourceKinds: Array<{ kind: AmbientSourceKind; name: string }> = [
  { kind: 'google-photos', name: 'Google Photos' },
  { kind: 'icloud', name: 'iCloud Photos' },
  { kind: 'device', name: 'This device' },
  { kind: 'aevumory', name: 'Aevumory Collection' },
];
