/**
 * Aevumory Backend Server
 *
 * Fastify HTTP server with SQLite persistence.
 * Serves API endpoints and frontend static assets.
 * Uses better-sqlite3 with WAL mode enabled.
 */

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import Database from 'better-sqlite3';
import { getAppConfig } from './app.config.js';
import { runMigrations } from './persistence/migrate.js';
import { SqliteTemporalRepository } from './persistence/temporal.repository.sqlite.js';
import { SqliteHouseholdRepository } from './persistence/household.repository.sqlite.js';
import { SqliteParticipantRepository } from './persistence/participant.repository.sqlite.js';
import { SqliteTaskRepository } from './persistence/task.repository.sqlite.js';
import { SqliteExecutionRepository } from './persistence/execution.repository.sqlite.js';
import { SqliteLedgerRepository } from './persistence/ledger.repository.sqlite.js';
import { SqliteUserTaskStateRepository } from './persistence/user-task-state.repository.sqlite.js';
import { SqliteRewardRepository } from './persistence/reward.repository.sqlite.js';
import { HouseholdService } from './services/household.service.js';
import {
  ParticipantNotFoundError,
  ParticipantService,
} from './services/participant.service.js';
import {
  TaskCycleNotFoundError,
  TaskNotFoundError,
  TaskService,
  type CreateTaskInput,
  type UpdateTaskInput,
} from './services/task.service.js';
import {
  FootholdNotSupportedError,
  InvalidCycleStateError,
  RewardAdjustmentNotSupportedError,
  RewardTransactionNotFoundError,
  TaskExecutionService,
  type CreateRewardAdjustmentInput,
} from './services/task-execution.service.js';
import { ProgressionService } from './services/progression.service.js';
import {
  InsufficientCreditsError,
  RewardInactiveError,
  RewardNotFoundError,
  RewardService,
  type CreateRewardInput as CreateRewardServiceInput,
  type UpdateRewardInput as UpdateRewardServiceInput,
} from './services/reward.service.js';
import {
  AdminAuthService,
  AdminPinAlreadyConfiguredError,
  AdminPinNotConfiguredError,
  InvalidAdminPinError,
  isValidAdminPin,
} from './services/admin-auth.service.js';
import { createRequireAdminHook, setAdminSessionCookie } from './http/require-admin.js';
import type { Participant } from './types/household.types.js';
import { DefaultTemporalService } from './services/temporal.service.js';
import type { EventSchedule } from './types/event-schedule.types.js';
import type { HouseholdEvent, TemporalSource } from './types/temporal-domain.types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Initialize and configure the database.
 */
const initializeDatabase = (dbPath: string): Database.Database => {
  const db = new Database(dbPath);

  // Enable WAL mode for concurrent read access
  db.pragma('journal_mode = WAL');

  // Set a reasonable timeout for busy locks
  db.pragma('busy_timeout = 5000');

  return db;
};

/**
 * Create and configure the Fastify server.
 */
export const createServer = async (db: Database.Database, options: { logger?: boolean } = {}) => {
  const fastify = Fastify({
    logger: options.logger ?? true,
  });

  // Create repositories
  const temporalRepository = new SqliteTemporalRepository(db);
  const householdRepository = new SqliteHouseholdRepository(db);
  const participantRepository = new SqliteParticipantRepository(db);
  const taskRepository = new SqliteTaskRepository(db);
  const executionRepository = new SqliteExecutionRepository(db);
  const ledgerRepository = new SqliteLedgerRepository(db);
  const userTaskStateRepository = new SqliteUserTaskStateRepository(db);
  const rewardRepository = new SqliteRewardRepository(db);

  // Create application services
  const householdService = new HouseholdService(householdRepository);
  const participantService = new ParticipantService(participantRepository);
  const taskService = new TaskService(taskRepository);
  const taskExecutionService = new TaskExecutionService(
    taskService,
    taskRepository,
    executionRepository,
    ledgerRepository,
    userTaskStateRepository,
  );
  const progressionService = new ProgressionService(ledgerRepository);
  const rewardService = new RewardService(rewardRepository, ledgerRepository, taskExecutionService);
  const adminAuthService = new AdminAuthService(householdService);
  const requireAdmin = createRequireAdminHook(adminAuthService);
  const temporalService = new DefaultTemporalService(temporalRepository);

  // Structural bootstrap only — never seed/demo data. Safe to run every start.
  await householdService.ensureBootstrapped();
  await temporalService.ensureLocalSourceBootstrapped();

  // ============================================================================
  // Health Check Endpoint
  // ============================================================================

  fastify.get('/api/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  });

  // ============================================================================
  // Household & Participant Endpoints
  // ============================================================================

  fastify.get('/api/household', async (request, reply) => {
    const household = await householdService.getHousehold();
    return {
      household_id: household.household_id,
      name: household.name,
      created_at: household.created_at,
      admin_pin_set: household.admin_pin_hash !== null,
    };
  });

  fastify.get('/api/participants', async (request, reply) => {
    const household = await householdService.getHousehold();
    const participants = await participantService.list(household.household_id);
    return participants.map(toParticipantDto);
  });

  fastify.post('/api/participants', { onRequest: requireAdmin }, async (request, reply) => {
    const body = request.body as { display_name?: string; representation_ref?: string } | undefined;
    if (!body?.display_name || !body.display_name.trim()) {
      reply.code(400).send({ error: 'display_name is required' });
      return;
    }

    const household = await householdService.getHousehold();
    const participant = await participantService.create(household.household_id, {
      display_name: body.display_name,
      representation_ref: body.representation_ref,
    });

    reply.code(201);
    return toParticipantDto(participant);
  });

  fastify.patch('/api/participants/:id', { onRequest: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { display_name?: string; representation_ref?: string | null } | undefined;

    try {
      const participant = await participantService.update(id, body ?? {});
      return toParticipantDto(participant);
    } catch (error) {
      if (error instanceof ParticipantNotFoundError) {
        reply.code(404).send({ error: error.message });
        return;
      }
      reply.code(400).send({ error: (error as Error).message });
    }
  });

  fastify.delete('/api/participants/:id', { onRequest: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await participantService.remove(id);
    reply.code(204).send();
  });

  // ============================================================================
  // Task & Task Cycle Endpoints (Phase 2)
  //
  // Task definition mutations are admin-gated. Task/cycle reads and cycle
  // reassignment are ordinary household actions and require no admin session
  // (CORE_BASELINE.md §2: "Task Reassignment ... is an ordinary household
  // action, not a separate game mode").
  // ============================================================================

  fastify.get('/api/tasks', async (request, reply) => {
    return taskService.listTasks();
  });

  fastify.post('/api/tasks', { onRequest: requireAdmin }, async (request, reply) => {
    const body = request.body as Partial<CreateTaskInput> | undefined;
    if (!body?.title || !body.primary_discipline || !body.source_type ||
        !body.created_by_user_id || !body.assignment || !body.schedule ||
        !body.duration_tier || !body.effort_type || !body.cognitive_load) {
      reply.code(400).send({ error: 'title, primary_discipline, source_type, created_by_user_id, assignment, schedule, duration_tier, effort_type, and cognitive_load are required' });
      return;
    }

    try {
      const task = await taskService.createTask(body as CreateTaskInput);
      reply.code(201);
      return task;
    } catch (error) {
      reply.code(400).send({ error: (error as Error).message });
    }
  });

  fastify.patch('/api/tasks/:id', { onRequest: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as UpdateTaskInput | undefined;

    try {
      return await taskService.updateTask(id, body ?? {});
    } catch (error) {
      if (error instanceof TaskNotFoundError) {
        reply.code(404).send({ error: error.message });
        return;
      }
      reply.code(400).send({ error: (error as Error).message });
    }
  });

  fastify.delete('/api/tasks/:id', { onRequest: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await taskService.deleteTask(id);
    reply.code(204).send();
  });

  fastify.get('/api/tasks/:id/cycles', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      return await taskService.listPersistedCyclesForTask(id);
    } catch (error) {
      if (error instanceof TaskNotFoundError) {
        reply.code(404).send({ error: error.message });
        return;
      }
      throw error;
    }
  });

  // window format: "<starts_at>,<ends_at>" (ISO date or date-time strings).
  fastify.get('/api/task-cycles', async (request, reply) => {
    const { window } = request.query as { window?: string };
    if (!window) {
      reply.code(400).send({ error: 'window query parameter is required, formatted as "<starts_at>,<ends_at>"' });
      return;
    }

    const [starts_at, ends_at] = window.split(',');
    if (!starts_at || !ends_at) {
      reply.code(400).send({ error: 'window query parameter must be formatted as "<starts_at>,<ends_at>"' });
      return;
    }

    try {
      return await taskService.listCyclesInWindow({ starts_at, ends_at });
    } catch (error) {
      reply.code(400).send({ error: (error as Error).message });
    }
  });

  fastify.post('/api/task-cycles/:id/assign', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { responsible_user_id?: string | null } | undefined;
    const responsible_user_id = body?.responsible_user_id ?? undefined;

    try {
      return await taskService.reassignCycle(id, responsible_user_id);
    } catch (error) {
      if (error instanceof TaskCycleNotFoundError) {
        reply.code(404).send({ error: error.message });
        return;
      }
      reply.code(400).send({ error: (error as Error).message });
    }
  });

  // ============================================================================
  // Execution & Reward Endpoints (Phase 3)
  //
  // Completion, Foothold initiation, and Deductive Pruning are ordinary
  // household actions (matching /assign) and require no admin session.
  // Reward-adjustment corrections are admin-only (CORE_BASELINE.md §6:
  // "Corrective Transactions").
  // ============================================================================

  fastify.post('/api/task-cycles/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { completed_by_user_id?: string } | undefined;

    try {
      return await taskExecutionService.completeCycle(id, { completed_by_user_id: body?.completed_by_user_id });
    } catch (error) {
      if (error instanceof TaskNotFoundError || error instanceof TaskCycleNotFoundError) {
        reply.code(404).send({ error: error.message });
        return;
      }
      if (error instanceof InvalidCycleStateError) {
        reply.code(409).send({ error: error.message });
        return;
      }
      reply.code(400).send({ error: (error as Error).message });
    }
  });

  fastify.post('/api/task-cycles/:id/foothold', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { completed_by_user_id?: string } | undefined;

    try {
      return await taskExecutionService.establishFoothold(id, { completed_by_user_id: body?.completed_by_user_id });
    } catch (error) {
      if (error instanceof TaskNotFoundError || error instanceof TaskCycleNotFoundError) {
        reply.code(404).send({ error: error.message });
        return;
      }
      if (error instanceof FootholdNotSupportedError || error instanceof InvalidCycleStateError) {
        reply.code(409).send({ error: error.message });
        return;
      }
      reply.code(400).send({ error: (error as Error).message });
    }
  });

  // Ordinary (non-completion) cycle resolution — records why the cycle was
  // resolved without being completed; earns no reward by itself (see
  // TaskExecutionService.pruneCycle). Endpoint name kept as `/prune` to match
  // the already-documented `deductively_pruned` ExecutionOutcomeType.
  fastify.post('/api/task-cycles/:id/prune', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as
      | { reason_code?: string; note?: string; linked_task_id?: string; completed_by_user_id?: string }
      | undefined;

    if (!body?.reason_code) {
      reply.code(400).send({ error: 'reason_code is required' });
      return;
    }

    try {
      return await taskExecutionService.pruneCycle(id, {
        reason_code: body.reason_code,
        note: body.note,
        linked_task_id: body.linked_task_id,
        completed_by_user_id: body.completed_by_user_id,
      });
    } catch (error) {
      if (error instanceof TaskNotFoundError || error instanceof TaskCycleNotFoundError) {
        reply.code(404).send({ error: error.message });
        return;
      }
      if (error instanceof InvalidCycleStateError) {
        reply.code(409).send({ error: error.message });
        return;
      }
      reply.code(400).send({ error: (error as Error).message });
    }
  });

  fastify.post('/api/reward-adjustments', { onRequest: requireAdmin }, async (request, reply) => {
    const body = request.body as Partial<CreateRewardAdjustmentInput> | undefined;
    if (
      !body?.original_transaction_id ||
      !body.reason ||
      !body.xp_adjustments ||
      body.credits_delta === undefined ||
      !body.created_by_user_id
    ) {
      reply
        .code(400)
        .send({ error: 'original_transaction_id, reason, xp_adjustments, credits_delta, and created_by_user_id are required' });
      return;
    }

    try {
      return await taskExecutionService.createRewardAdjustment(body as CreateRewardAdjustmentInput);
    } catch (error) {
      if (error instanceof RewardTransactionNotFoundError) {
        reply.code(404).send({ error: error.message });
        return;
      }
      if (error instanceof RewardAdjustmentNotSupportedError) {
        reply.code(409).send({ error: error.message });
        return;
      }
      reply.code(400).send({ error: (error as Error).message });
    }
  });

  fastify.get('/api/participants/:id/ledger', async (request, reply) => {
    const { id } = request.params as { id: string };
    return taskExecutionService.getParticipantLedger(id);
  });

  fastify.get('/api/participants/:id/progression', async (request, reply) => {
    const { id } = request.params as { id: string };
    return progressionService.getParticipantProgression(id);
  });

  // ============================================================================
  // Rewards Catalogue & Redemption (Phase 4)
  //
  // Catalogue mutations are admin-gated; redemption is an ordinary household
  // action, matching the /task-cycles pattern above.
  // ============================================================================

  fastify.get('/api/rewards', async (request, reply) => {
    return rewardService.listRewards();
  });

  fastify.post('/api/rewards', { onRequest: requireAdmin }, async (request, reply) => {
    const body = request.body as Partial<CreateRewardServiceInput> | undefined;
    if (!body?.title || !body.category || body.base_cost === undefined) {
      reply.code(400).send({ error: 'title, category, and base_cost are required' });
      return;
    }

    try {
      const reward = await rewardService.createReward(body as CreateRewardServiceInput);
      reply.code(201);
      return reward;
    } catch (error) {
      reply.code(400).send({ error: (error as Error).message });
    }
  });

  fastify.patch('/api/rewards/:id', { onRequest: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as UpdateRewardServiceInput | undefined;

    try {
      return await rewardService.updateReward(id, body ?? {});
    } catch (error) {
      if (error instanceof RewardNotFoundError) {
        reply.code(404).send({ error: error.message });
        return;
      }
      reply.code(400).send({ error: (error as Error).message });
    }
  });

  fastify.post('/api/rewards/:id/redeem', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { user_id?: string; idempotency_key?: string } | undefined;
    if (!body?.user_id || !body.idempotency_key) {
      reply.code(400).send({ error: 'user_id and idempotency_key are required' });
      return;
    }

    try {
      return await rewardService.redeemReward(id, {
        user_id: body.user_id,
        idempotency_key: body.idempotency_key,
      });
    } catch (error) {
      if (error instanceof RewardNotFoundError) {
        reply.code(404).send({ error: error.message });
        return;
      }
      if (error instanceof RewardInactiveError || error instanceof InsufficientCreditsError) {
        reply.code(409).send({ error: error.message });
        return;
      }
      reply.code(400).send({ error: (error as Error).message });
    }
  });

  // ============================================================================
  // Admin PIN Endpoints
  // ============================================================================

  fastify.post('/api/admin/pin/setup', async (request, reply) => {
    const body = request.body as { pin?: string } | undefined;
    if (!isValidAdminPin(body?.pin)) {
      reply.code(400).send({ error: 'A numeric PIN of 4-12 digits is required' });
      return;
    }

    try {
      const token = await adminAuthService.setupPin(body.pin);
      setAdminSessionCookie(reply, token, request.protocol === 'https');
      return { ok: true };
    } catch (error) {
      if (error instanceof AdminPinAlreadyConfiguredError) {
        reply.code(409).send({ error: error.message });
        return;
      }
      throw error;
    }
  });

  fastify.post('/api/admin/session', async (request, reply) => {
    const body = request.body as { pin?: string } | undefined;
    if (!isValidAdminPin(body?.pin)) {
      reply.code(400).send({ error: 'A numeric PIN of 4-12 digits is required' });
      return;
    }

    try {
      const token = await adminAuthService.verifyPin(body.pin);
      setAdminSessionCookie(reply, token, request.protocol === 'https');
      return { ok: true };
    } catch (error) {
      if (error instanceof AdminPinNotConfiguredError) {
        reply.code(409).send({ error: error.message });
        return;
      }
      if (error instanceof InvalidAdminPinError) {
        reply.code(401).send({ error: error.message });
        return;
      }
      throw error;
    }
  });

  // ============================================================================
  // Calendar Endpoints (Phase 5)
  //
  // The temporal domain (SqliteTemporalRepository / DefaultTemporalService /
  // resolveEventOccurrences) already existed from Phase 0; this section is
  // wiring only, no new recurrence logic. Only the local Aevumory calendar
  // source is in scope — external providers stay behind the existing
  // CalendarSourceAdapter boundary, unimplemented.
  //
  // Source mutations are admin-gated (structural configuration, matching the
  // participants pattern). Event mutations and occurrence reads are ordinary
  // household actions — adding/editing/removing a calendar entry is everyday
  // household coordination, matching the /task-cycles assign/complete
  // pattern, not a corrective admin authority.
  // ============================================================================

  fastify.get('/api/calendar/sources', async (request, reply) => {
    return temporalService.listSources();
  });

  fastify.post('/api/calendar/sources', { onRequest: requireAdmin }, async (request, reply) => {
    const body = request.body as { name?: string } | undefined;
    if (!body?.name || !body.name.trim()) {
      reply.code(400).send({ error: 'name is required' });
      return;
    }

    const now = new Date().toISOString();
    const source: TemporalSource = {
      source_id: randomUUID(),
      kind: 'local',
      name: body.name.trim(),
      enabled: true,
      sync_status: 'never_synced',
      created_at: now,
      updated_at: now,
    };

    await temporalService.saveSource(source);
    reply.code(201);
    return source;
  });

  fastify.patch('/api/calendar/sources/:id', { onRequest: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string; enabled?: boolean } | undefined;

    const existing = await temporalService.getSource(id);
    if (!existing) {
      reply.code(404).send({ error: `Calendar source not found: ${id}` });
      return;
    }

    const updated: TemporalSource = {
      ...existing,
      name: body?.name?.trim() || existing.name,
      enabled: body?.enabled ?? existing.enabled,
      updated_at: new Date().toISOString(),
    };

    await temporalService.saveSource(updated);
    return updated;
  });

  fastify.delete('/api/calendar/sources/:id', { onRequest: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await temporalService.deleteSource(id);
    reply.code(204).send();
  });

  fastify.get('/api/calendar/events', async (request, reply) => {
    const { source_id, status } = request.query as { source_id?: string; status?: HouseholdEvent['status'] };
    return temporalService.listEvents({ source_id, status });
  });

  fastify.post('/api/calendar/events', async (request, reply) => {
    const body = request.body as Partial<CreateCalendarEventInput> | undefined;
    if (!body?.title || !body.title.trim()) {
      reply.code(400).send({ error: 'title is required' });
      return;
    }
    if (!body.source_id) {
      reply.code(400).send({ error: 'source_id is required' });
      return;
    }
    if (!body.timezone) {
      reply.code(400).send({ error: 'timezone is required' });
      return;
    }
    if (!body.schedule) {
      reply.code(400).send({ error: 'schedule is required' });
      return;
    }

    const source = await temporalService.getSource(body.source_id);
    if (!source) {
      reply.code(400).send({ error: `source_id does not reference an existing calendar source: ${body.source_id}` });
      return;
    }

    try {
      validateEventSchedule(body.schedule);
    } catch (error) {
      reply.code(400).send({ error: (error as Error).message });
      return;
    }

    const now = new Date().toISOString();
    const event: HouseholdEvent = {
      event_id: randomUUID(),
      source_id: body.source_id,
      title: body.title.trim(),
      description: body.description,
      location: body.location,
      status: 'active',
      timezone: body.timezone,
      relevance: body.relevance ?? 'ordinary',
      significance: body.significance ?? 'normal',
      schedule: body.schedule,
      recurrence: body.recurrence,
      created_at: now,
      updated_at: now,
    };

    await temporalService.saveEvent(event);
    reply.code(201);
    return event;
  });

  fastify.patch('/api/calendar/events/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as
      | (Partial<CreateCalendarEventInput> & { status?: HouseholdEvent['status'] })
      | undefined;

    const existing = await temporalService.getEvent(id);
    if (!existing) {
      reply.code(404).send({ error: `Calendar event not found: ${id}` });
      return;
    }

    if (body?.source_id && body.source_id !== existing.source_id) {
      const source = await temporalService.getSource(body.source_id);
      if (!source) {
        reply.code(400).send({ error: `source_id does not reference an existing calendar source: ${body.source_id}` });
        return;
      }
    }

    if (body?.schedule) {
      try {
        validateEventSchedule(body.schedule);
      } catch (error) {
        reply.code(400).send({ error: (error as Error).message });
        return;
      }
    }

    const updated: HouseholdEvent = {
      ...existing,
      ...body,
      title: body?.title?.trim() || existing.title,
      updated_at: new Date().toISOString(),
    };

    await temporalService.saveEvent(updated);
    return updated;
  });

  fastify.delete('/api/calendar/events/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await temporalService.deleteEvent(id);
    reply.code(204).send();
  });

  // window format: "<starts_at>,<ends_at>" (ISO instant strings), matching
  // /api/task-cycles. Represents the already-resolved temporal domain
  // (DefaultTemporalService.listOccurrencesInWindow / resolveEventOccurrences)
  // joined with the event fields needed for presentation, not raw
  // persistence rows — no second recurrence resolver lives here.
  fastify.get('/api/calendar/occurrences', async (request, reply) => {
    const { window } = request.query as { window?: string };
    if (!window) {
      reply.code(400).send({ error: 'window query parameter is required, formatted as "<starts_at>,<ends_at>"' });
      return;
    }

    const [starts_at, ends_at] = window.split(',');
    if (!starts_at || !ends_at) {
      reply.code(400).send({ error: 'window query parameter must be formatted as "<starts_at>,<ends_at>"' });
      return;
    }

    try {
      const occurrences = await temporalService.listOccurrencesInWindow({ starts_at, ends_at });
      const events = new Map<string, HouseholdEvent>();
      for (const occurrence of occurrences) {
        if (!events.has(occurrence.event_id)) {
          const event = await temporalService.getEvent(occurrence.event_id);
          if (event) events.set(occurrence.event_id, event);
        }
      }

      return occurrences
        .map((occurrence) => {
          const event = events.get(occurrence.event_id);
          if (!event) return null;
          return {
            occurrence_id: occurrence.occurrence_id,
            event_id: occurrence.event_id,
            title: event.title,
            description: event.description,
            location: event.location,
            starts_at: occurrence.starts_at,
            ends_at: occurrence.ends_at,
            local_start_date: occurrence.local_start_date,
            local_end_date: occurrence.local_end_date,
            timezone: occurrence.timezone,
            relevance: event.relevance,
            significance: event.significance,
            status: occurrence.status,
          };
        })
        .filter((occurrence): occurrence is NonNullable<typeof occurrence> => occurrence !== null);
    } catch (error) {
      reply.code(400).send({ error: (error as Error).message });
    }
  });

  // ============================================================================
  // Static Asset Serving (Frontend in Production)
  // ============================================================================

  // In production, serve built frontend from dist/ folder
  const frontendPath = path.join(__dirname, '../frontend/dist');
  try {
    await fastify.register(fastifyStatic, {
      root: frontendPath,
      prefix: '/',
    });

    // Fallback to index.html for SPA routing
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        reply.code(404).send({ error: 'Not Found' });
      } else {
        reply.sendFile('index.html');
      }
    });
  } catch (error) {
    // Frontend dist may not exist in development
    console.log('Frontend dist not found; API-only mode');
  }

  return fastify;
};

function toParticipantDto(participant: Participant) {
  return {
    participant_id: participant.participant_id,
    household_id: participant.household_id,
    display_name: participant.display_name,
    representation_ref: participant.representation_ref,
    created_at: participant.created_at,
    updated_at: participant.updated_at,
  };
}

interface CreateCalendarEventInput {
  title: string;
  description?: string;
  location?: string;
  source_id: string;
  timezone: string;
  schedule: EventSchedule;
  recurrence?: HouseholdEvent['recurrence'];
  relevance?: HouseholdEvent['relevance'];
  significance?: HouseholdEvent['significance'];
}

function validateEventSchedule(schedule: EventSchedule): void {
  if (schedule.kind === 'timed') {
    if (!schedule.local_start || !schedule.local_end) {
      throw new Error('timed schedules require local_start and local_end');
    }
    return;
  }

  if (schedule.kind === 'all_day') {
    if (!schedule.local_start_date || !schedule.local_end_date) {
      throw new Error('all_day schedules require local_start_date and local_end_date');
    }
    return;
  }

  throw new Error('schedule.kind must be "timed" or "all_day"');
}

/**
 * Main entry point.
 */
const main = async () => {
  const config = getAppConfig();

  console.log(`Starting Aevumory Backend`);
  console.log(`PORT: ${config.port}`);
  console.log(`DATA_DIR: ${config.dataDir}`);

  // Ensure data directory exists
  try {
    // Create parent directory if needed
    const fs = await import('fs/promises');
    await fs.mkdir(config.dataDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create data directory:', error);
    process.exit(1);
  }

  // Initialize database
  const dbPath = path.join(config.dataDir, 'aevumory.db');
  console.log(`Database: ${dbPath}`);

  const db = initializeDatabase(dbPath);

  try {
    // Run migrations
    const migrationsDir = path.join(__dirname, '../migrations');
    runMigrations(db, migrationsDir);

    // Create server
    const fastify = await createServer(db);

    // Start listening
    await fastify.listen({ port: config.port, host: '0.0.0.0' });

    console.log(`✓ Server listening on http://0.0.0.0:${config.port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    db.close();
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    db.close();
    process.exit(0);
  });
};

// Only actually start listening when this file is run directly (`node
// src/server.ts` / `npm run dev`) — not when test files import `createServer`
// from it. Without this guard, every test file that imports this module
// tries to bind the real port, racing/colliding across parallel test files.
const isMainModule = process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
