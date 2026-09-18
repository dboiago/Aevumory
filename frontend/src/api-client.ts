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
  primary_discipline?: string;
  primary_xp: number;
  secondary_yields: Array<{ discipline: string; xp: number }>;
  credits_earned: number;
}

export interface RewardTransactionDto {
  transaction_id: string;
  idempotency_key: string;
  task_id?: string;
  cycle_id?: string;
  reward_event_type: 'foothold_initiation' | 'completion' | 'deductive_pruning' | 'reward_redemption';
  reward_owner_user_id?: string;
  /** Present only for `reward_redemption` — links back to its RewardRedemption (Phase 4). */
  redemption_id?: string;
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

// ============================================================================
// Rewards (Phase 4)
// ============================================================================

export type RewardCategoryDto = 'personal_leisure' | 'household' | 'experience';

export interface RewardDto {
  id: string;
  title: string;
  description?: string;
  category: RewardCategoryDto;
  base_cost: number;
  is_discountable: boolean;
  is_active: boolean;
}

export interface RewardRedemptionDto {
  id: string;
  user_id: string;
  reward_id: string;
  base_cost: number;
  final_cost_paid: number;
  redeemed_at: string;
}

export interface RedeemRewardResultDto {
  redemption: RewardRedemptionDto;
  balance: number;
}

export interface CreateRewardDtoInput {
  title: string;
  description?: string;
  category: RewardCategoryDto;
  base_cost: number;
  is_active?: boolean;
}

export const rewardsApi = {
  list: (): Promise<RewardDto[]> => apiRequest('/api/rewards'),

  create: (input: CreateRewardDtoInput): Promise<RewardDto> =>
    apiRequest('/api/rewards', { method: 'POST', body: input }),

  update: (rewardId: string, input: Partial<CreateRewardDtoInput>): Promise<RewardDto> =>
    apiRequest(`/api/rewards/${encodeURIComponent(rewardId)}`, { method: 'PATCH', body: input }),

  redeem: (rewardId: string, input: { user_id: string; idempotency_key: string }): Promise<RedeemRewardResultDto> =>
    apiRequest(`/api/rewards/${encodeURIComponent(rewardId)}/redeem`, { method: 'POST', body: input }),
};

// The existing Phase 3 ledger endpoint is the single authoritative spendable
// Credit balance — redemption debits are ordinary reward_transactions rows,
// so there is no separate rewards-balance endpoint (see reward.service.ts).
export interface ParticipantLedgerDto {
  reward_owner_user_id: string;
  balance: number;
  transactions: RewardTransactionDto[];
  adjustments: Array<{ adjustment_id: string; credits_delta: number }>;
}

export const participantLedgerApi = {
  get: (participantId: string): Promise<ParticipantLedgerDto> =>
    apiRequest(`/api/participants/${encodeURIComponent(participantId)}/ledger`),
};

// The existing Phase 3 progression endpoint is the single authoritative
// source of cumulative XP/level per Discipline — never stored, always
// derived from the ledger (see ProgressionService).
export interface DisciplineProgressDto {
  discipline: string;
  cumulative_xp: number;
  current_level: number;
  state: 'developing' | 'mastered';
}

export const participantProgressionApi = {
  get: (participantId: string): Promise<DisciplineProgressDto[]> =>
    apiRequest(`/api/participants/${encodeURIComponent(participantId)}/progression`),
};

export const participantRedemptionsApi = {
  list: (participantId: string): Promise<RewardRedemptionDto[]> =>
    apiRequest(`/api/participants/${encodeURIComponent(participantId)}/redemptions`),
};

// ============================================================================
// Calendar (Phase 5)
// ============================================================================

export type TemporalSourceKindDto = 'local' | 'external';
export type TemporalSyncStatusDto = 'never_synced' | 'syncing' | 'synced' | 'degraded' | 'error';

export interface TemporalSourceDto {
  source_id: string;
  kind: TemporalSourceKindDto;
  name: string;
  enabled: boolean;
  sync_status: TemporalSyncStatusDto;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export type EventScheduleDto =
  | { kind: 'timed'; local_start: string; local_end: string }
  | { kind: 'all_day'; local_start_date: string; local_end_date: string };

export interface RecurrenceRuleDto {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  by_weekday?: number[];
  by_month_day?: number;
  until?: string;
}

export interface HouseholdEventDto {
  event_id: string;
  source_id: string;
  title: string;
  description?: string;
  location?: string;
  status: 'active' | 'cancelled';
  timezone: string;
  relevance: 'ordinary' | 'meaningful';
  significance: 'low' | 'normal' | 'high';
  schedule: EventScheduleDto;
  recurrence?: RecurrenceRuleDto;
  created_at: string;
  updated_at: string;
}

export interface CreateCalendarEventDtoInput {
  title: string;
  description?: string;
  location?: string;
  source_id: string;
  timezone: string;
  schedule: EventScheduleDto;
  recurrence?: RecurrenceRuleDto;
  relevance?: 'ordinary' | 'meaningful';
  significance?: 'low' | 'normal' | 'high';
}

export interface CalendarOccurrenceDto {
  occurrence_id: string;
  event_id: string;
  title: string;
  description?: string;
  location?: string;
  starts_at?: string;
  ends_at?: string;
  local_start_date: string;
  local_end_date: string;
  timezone: string;
  relevance: 'ordinary' | 'meaningful';
  significance: 'low' | 'normal' | 'high';
  status: 'scheduled' | 'cancelled';
}

export const calendarSourcesApi = {
  list: (): Promise<TemporalSourceDto[]> => apiRequest('/api/calendar/sources'),

  create: (input: { name: string }): Promise<TemporalSourceDto> =>
    apiRequest('/api/calendar/sources', { method: 'POST', body: input }),

  update: (sourceId: string, input: { name?: string; enabled?: boolean }): Promise<TemporalSourceDto> =>
    apiRequest(`/api/calendar/sources/${encodeURIComponent(sourceId)}`, { method: 'PATCH', body: input }),

  remove: (sourceId: string): Promise<void> =>
    apiRequest(`/api/calendar/sources/${encodeURIComponent(sourceId)}`, { method: 'DELETE' }),
};

export const calendarEventsApi = {
  list: (): Promise<HouseholdEventDto[]> => apiRequest('/api/calendar/events'),

  create: (input: CreateCalendarEventDtoInput): Promise<HouseholdEventDto> =>
    apiRequest('/api/calendar/events', { method: 'POST', body: input }),

  update: (eventId: string, input: Partial<CreateCalendarEventDtoInput>): Promise<HouseholdEventDto> =>
    apiRequest(`/api/calendar/events/${encodeURIComponent(eventId)}`, { method: 'PATCH', body: input }),

  remove: (eventId: string): Promise<void> =>
    apiRequest(`/api/calendar/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' }),
};

export const calendarOccurrencesApi = {
  listInWindow: (window: { starts_at: string; ends_at: string }): Promise<CalendarOccurrenceDto[]> => {
    const params = new URLSearchParams({ window: `${window.starts_at},${window.ends_at}` });
    return apiRequest(`/api/calendar/occurrences?${params.toString()}`);
  },
};

// ============================================================================
// Shared polling (Phase 7)
//
// Multiple devices stay eventually consistent via periodic refetch, not
// push (FUNCTIONAL_FOUNDATION_PLAN.md "Real-time sync: polling, not push").
// No specific interval is doc-mandated; 20s is a judgment call balancing
// "materially the same state within one poll interval" against not hammering
// a household-scale SQLite-backed server.
// ============================================================================

export const POLLING_INTERVAL_MS = 20_000;

export interface PollingHandle {
  stop(): void;
}

/**
 * Runs `refresh` on a fixed interval and whenever the document becomes
 * visible again, until `stop()` is called. `refresh` failures are swallowed
 * (a transient fetch error should not stop future polling ticks).
 */
export function startPolling(refresh: () => void | Promise<void>, intervalMs: number = POLLING_INTERVAL_MS): PollingHandle {
  let stopped = false;
  const tick = (): void => {
    if (stopped) return;
    void Promise.resolve(refresh()).catch(() => undefined);
  };

  const timer = window.setInterval(tick, intervalMs);
  const onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') tick();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    stop(): void {
      if (stopped) return;
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    },
  };
}

const activePollers = new WeakMap<Element, PollingHandle>();

/**
 * Registers `handle` as the active poller for `target`, stopping whatever
 * poller was previously registered for that same element first — the clean
 * teardown mechanism screens use when a hash-route re-render replaces their
 * content in place, so timers/listeners never accumulate.
 */
export function attachPolling(target: Element, handle: PollingHandle): void {
  activePollers.get(target)?.stop();
  activePollers.set(target, handle);
}

/** Stops and unregisters whatever poller (if any) is active for `target`. */
export function stopPolling(target: Element): void {
  activePollers.get(target)?.stop();
  activePollers.delete(target);
}

