/**
 * Aevumory API Client
 *
 * Thin fetch wrapper isolating HTTP/API concerns from UI/domain presentation.
 * All requests are same-origin (served by the backend directly in production,
 * proxied via Vite's dev server under /api in development).
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    credentials: 'same-origin',
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { error?: string } | undefined;
    throw new ApiError(response.status, payload?.error ?? `Request to ${path} failed with status ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export interface HouseholdDto {
  household_id: string;
  name: string;
  created_at: string;
  admin_pin_set: boolean;
}

export interface ParticipantDto {
  participant_id: string;
  household_id: string;
  display_name: string;
  representation_ref?: string;
  created_at: string;
  updated_at: string;
}

export const householdApi = {
  get: (): Promise<HouseholdDto> => apiRequest('/api/household'),
};

export const participantsApi = {
  list: (): Promise<ParticipantDto[]> => apiRequest('/api/participants'),

  create: (input: { display_name: string; representation_ref?: string }): Promise<ParticipantDto> =>
    apiRequest('/api/participants', { method: 'POST', body: input }),

  update: (
    participantId: string,
    input: { display_name?: string; representation_ref?: string | null },
  ): Promise<ParticipantDto> =>
    apiRequest(`/api/participants/${encodeURIComponent(participantId)}`, { method: 'PATCH', body: input }),

  remove: (participantId: string): Promise<void> =>
    apiRequest(`/api/participants/${encodeURIComponent(participantId)}`, { method: 'DELETE' }),
};

export const adminApi = {
  setupPin: (pin: string): Promise<{ ok: true }> =>
    apiRequest('/api/admin/pin/setup', { method: 'POST', body: { pin } }),

  login: (pin: string): Promise<{ ok: true }> =>
    apiRequest('/api/admin/session', { method: 'POST', body: { pin } }),
};
