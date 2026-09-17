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

// ============================================================================
// Task / Task Cycle (Phase 2)
// ============================================================================

export interface TaskAssignmentPolicyDto {
  scope: 'individual' | 'household';
  assigned_user_id?: string;
  owner_id: string;
}

export interface SchedulePolicyDto {
  cadence_type: 'one_off' | 'interval' | 'calendar_anchor';
  interval_days?: number;
  series_anchor_date?: string;
  calendar_anchor?: { unit: 'week' | 'month'; value: number };
  delay_policy: 'none' | 'bounded' | 'flexible';
  has_strict_window: boolean;
  window_start_time?: string;
  window_end_time?: string;
  max_daily_completions?: number;
  cooldown_hours?: number;
}

export interface LifecyclePolicyDto {
  expires_at?: string;
  on_expiration?: 'archive' | 'expire_quietly';
  ttl_hours?: number;
}

export interface TaskDto {
  task_id: string;
  title: string;
  description?: string;
  primary_discipline: string;
  secondary_disciplines: string[];
  source_type: string;
  source_event_id?: string;
  created_at: string;
  created_by_user_id: string;
  assignment: TaskAssignmentPolicyDto;
  schedule: SchedulePolicyDto;
  lifecycle: LifecyclePolicyDto;
  supports_foothold: boolean;
  duration_tier: 'quick' | 'moderate' | 'sustained' | 'heavy';
  effort_type: 'physical' | 'mental' | 'balanced';
  cognitive_load: 'low' | 'medium' | 'high';
}

export interface TaskCycleDto {
  cycle_id: string;
  task_id: string;
  target_date: string;
  window_start: string;
  window_end: string;
  window_source: 'base' | 'precision_elastic';
  status: 'pending' | 'satisfied' | 'deferred' | 'historical_absence' | 'superseded';
  responsible_user_id?: string;
  satisfied_at?: string;
  satisfied_by_user_id?: string;
  resolved_at?: string;
}

export interface CreateTaskDtoInput {
  title: string;
  description?: string;
  primary_discipline: string;
  secondary_disciplines?: string[];
  source_type: string;
  source_event_id?: string;
  created_by_user_id: string;
  assignment: TaskAssignmentPolicyDto;
  schedule: SchedulePolicyDto;
  lifecycle?: LifecyclePolicyDto;
  supports_foothold?: boolean;
  duration_tier: 'quick' | 'moderate' | 'sustained' | 'heavy';
  effort_type: 'physical' | 'mental' | 'balanced';
  cognitive_load: 'low' | 'medium' | 'high';
}

// ============================================================================
// Execution / Rewards (Phase 3)
// ============================================================================

export interface RewardYieldDto {
  primary_discipline: string;
  primary_xp: number;
  secondary_yields: Array<{ discipline: string; xp: number }>;
  credits_earned: number;
}

export interface RewardTransactionDto {
  transaction_id: string;
  idempotency_key: string;
  task_id: string;
  cycle_id: string;
  reward_event_type: 'foothold_initiation' | 'completion' | 'deductive_pruning';
  reward_owner_user_id?: string;
  yield: RewardYieldDto;
  processed_at: string;
}

export interface CompleteCycleResultDto {
  cycle: TaskCycleDto;
  transaction: RewardTransactionDto | null;
}

export const tasksApi = {
  list: (): Promise<TaskDto[]> => apiRequest('/api/tasks'),

  create: (input: CreateTaskDtoInput): Promise<TaskDto> =>
    apiRequest('/api/tasks', { method: 'POST', body: input }),

  update: (taskId: string, input: Partial<CreateTaskDtoInput>): Promise<TaskDto> =>
    apiRequest(`/api/tasks/${encodeURIComponent(taskId)}`, { method: 'PATCH', body: input }),

  remove: (taskId: string): Promise<void> =>
    apiRequest(`/api/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' }),

  listCycles: (taskId: string): Promise<TaskCycleDto[]> =>
    apiRequest(`/api/tasks/${encodeURIComponent(taskId)}/cycles`),
};

export const taskCyclesApi = {
  listInWindow: (window: { starts_at: string; ends_at: string }): Promise<TaskCycleDto[]> => {
    const params = new URLSearchParams({ window: `${window.starts_at},${window.ends_at}` });
    return apiRequest(`/api/task-cycles?${params.toString()}`);
  },

  assign: (cycleId: string, responsibleUserId: string | undefined): Promise<TaskCycleDto> =>
    apiRequest(`/api/task-cycles/${encodeURIComponent(cycleId)}/assign`, {
      method: 'POST',
      body: { responsible_user_id: responsibleUserId ?? null },
    }),

  complete: (cycleId: string, input: { completed_by_user_id?: string } = {}): Promise<CompleteCycleResultDto> =>
    apiRequest(`/api/task-cycles/${encodeURIComponent(cycleId)}/complete`, { method: 'POST', body: input }),
};
