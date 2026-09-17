# Functional Foundation Plan

Status: approved direction, pre-implementation. This document is the implementation plan for turning Aevumory from a fixture-driven frontend prototype into a persistent, self-hostable household application, with **Tasks as the first complete vertical slice** and the Ambient Screen / Calendar wired to the same real household state. It follows the existing documented architecture (`ARCHITECTURE.md`, `CORE_BASELINE.md`, `TASK_LIFECYCLE.md`, `PROGRESSION_SPEC.md`, `EVENT_HORIZON.md`, `AMBIENT_SCREEN.md`, `PARTICIPANT_PROFILE_SPEC.md`, `DESIGN_SYSTEM.md`, `HANDOFF.md`) rather than replacing it. Where those documents already make a decision, this plan follows it. Where they are silent, that is called out explicitly below rather than guessed.

## Current state (as discovered)

- **Backend** (`src`) is a pure TypeScript library: ES modules, no HTTP server, no database driver, no persistence beyond in-memory `Map`s. The **temporal (calendar/event) domain is fully implemented and tested**: types, a timezone-aware recurrence resolver, a `TemporalService` merge layer, a `TemporalRepository` interface, and an in-memory implementation. The **task, reward, and progression domains are typed only** — `task-domain.types.ts` defines the full `Task → TaskCycle → ExecutionEvent → RewardTransaction` pipeline shape, `reward.ts` defines `Reward`/`RewardRedemption`, `progression.ts` has pure level-resolution functions — but none of these have a repository, service, or persistence implementation. `temporal.sql` exists but is never executed against a real database (no DB driver is a dependency).
- `task.ts` is an **older, simpler, superseded duplicate** of `Task` (it has ad-hoc descriptive fields like `duration_tier`/`effort_type`/`cognitive_load` and a raw `base_practice_yield: number` that the authoritative `task-domain.types.ts` does not carry on `Task` at all — see the reward-safety discussion below).
- **Frontend** (`src`) is 100% fixture-driven: zero `fetch()` calls anywhere. Each screen (`calendar.ts`, `tasks.ts`, `temporal.ts`/`horizon.ts`, `ambient-display.ts`, `participant-profile.ts`) already exposes an async `Fixture*Query` class shaped like a real API client — a real query implementation can be swapped in behind the same interface with no rendering-layer changes required.
- Docs are authoritative and detailed on domain rules (task lifecycle states, Discipline/Domain model, XP/Credit anchors, Event Horizon eligibility vs. composition, minimal participant model, design-system rules) and explicitly leave deployment topology, exact persistence technology, and real-time transport **open** for this implementation to decide.

## Architecture decisions made for this plan

### Persistence: SQLite, not a database server

The requirement is that Aevumory works as a **standalone application on a single device** (a home server or desktop — see precision note below) with no external services to operate, and *optionally* as a shared source of truth for a household when someone chooses to run it on an always-on machine. That rules out requiring a separate database server process for the base case.

**Decision: SQLite**, accessed only through the existing repository-interface pattern (`TemporalRepository` today; new `HouseholdRepository`, `TaskRepository`, etc. following it), via `better-sqlite3`. The domain/service layer never talks to SQLite directly, so a different physical store could be substituted later without touching domain code — but nothing beyond SQLite is being built now.

- `backend/src/persistence/schema/temporal.sql` was re-checked specifically for this decision: its `TEXT` primary keys, `CHECK` constraints, and partial `UNIQUE INDEX ... WHERE recurrence_instance_key IS NOT NULL` are valid SQLite syntax as written. Its existence is not, by itself, evidence for a server-database engine.
- One backend process is the single source of truth; multiple devices are simply HTTP clients of that one process. Concurrency at household scale (a handful of people occasionally reading/writing) is well within SQLite's single-writer model, especially with WAL mode enabled.
- Backup story: the whole database is one file. Stopping the process (or using SQLite's online backup API) and copying the file is a complete, portable backup.
- Migration/versioning: a `backend/migrations/*.sql` folder with a small runner, no ORM — consistent with the existing hand-written schema style.

**Precision on "single-device deployment"** (per explicit correction): this means Aevumory does not require a separate database server and can run for a single client with nothing else installed. It does **not** mean an arbitrary Android/Fire tablet is expected to *host* the Node/Fastify backend. The supported model is:

```
Home server or desktop (runs the Aevumory backend process + its SQLite file)
        │
        ├── phone / tablet / PC #1  (browser client)
        ├── phone / tablet / PC #2  (browser client)
        └── ambient wall display    (browser client)
```

A single-person household can run the backend directly on their own desktop/laptop and use it from that same machine — that is the "single device" case. Old tablets and phones are expected to be **clients only**.

### Real-time sync: polling, not push

Multiple devices stay consistent via interval polling plus refetch-after-own-mutation. The service/API boundary should not preclude adding Server-Sent Events or WebSockets later if a concrete feature needs push, but nothing push-based is built in this plan.

### Permissions: household admin PIN, corrective actions only

Corrected model (superseding an earlier draft that over-gated ordinary interaction):

- **Not admin-gated** — ordinary household use, including dragging/reassigning an existing task or cycle between a participant and the household bucket via the existing Task Board UI, completing a task, redeeming a reward with your own credits, viewing any screen. This matches today's UX and the documented "no persistent sign-in for ordinary use" communal-device model.
- **Admin-gated** (single household PIN) — task *definition* create/edit/delete (title, schedule policy, which Discipline it maps to, effort/duration classification), reward catalog cost/value create/edit, manual credit adjustments, `RewardAdjustmentTransaction` reversals/corrections, participant create/edit/delete, and household configuration.
- This is a **single shared household PIN**, not a per-person account/role system. That is a deliberate, deliberately minimal mechanism — consistent with `CORE_BASELINE.md`'s "Admin retains authority to revoke, edit, assign, or correct" and the explicit instruction not to over-engineer authentication for a family application.

**First-run PIN story** (concretely specified, since none existed before): on first boot, the bootstrapped Household row has `admin_pin_hash = NULL`. Any attempt to reach an admin-gated action while `admin_pin_hash` is `NULL` routes to a one-time **"Set up household admin PIN"** screen instead of a PIN-entry prompt; submitting a PIN there hashes and stores it (bcrypt/argon2) and immediately authorizes the current session. After that point, admin actions prompt for PIN entry as normal (short-lived signed cookie on success). Losing the PIN is handled by direct operator intervention (clearing `admin_pin_hash` via a small CLI script against the SQLite file) rather than a self-service recovery flow — acceptable for a household-scale mechanism.

### Reward safety: use the documented mechanism, do not invent a new one

The request specifically asked whether the existing docs already define how to stop a household member from manufacturing an artificially high-value self-rewarding task, rather than inventing a new mechanism. They do:

1. **`Task` has no user-settable reward-value field at all.** Re-reading `task-domain.types.ts` directly confirms this: `Task` carries `primary_discipline`, `secondary_disciplines`, `schedule`, `lifecycle`, and `assignment` — there is no `credits`/`xp`/`reward_value` field anywhere on it. `RewardYield`/`RewardTransaction` are only ever produced by the engine **at execution time**, computed from the base yield anchor (`1 Base XP ≈ 1 minute`, `10 minutes = 1.0 Credit`, per `CORE_BASELINE.md`/`GAME_RULES.md`) applied to the task's *descriptive* effort classification. Nobody — admin or household member — ever types in a Credit/XP number for a task. This is the existing, documented safeguard, not something this plan needs to add.
2. **Descriptive metadata is explicitly non-authoritative for difficulty.** `CORE_BASELINE.md`: "Fields like `cognitive_load`, `duration_tier`, `effort_type` describe, NOT dynamic difficulty," and "Admin defines valid task and worthy activities." These fields exist today only on the *superseded* `task.ts`, not on the authoritative `Task` in `task-domain.types.ts` — reconciling that is called out as required work below, not a new invention.
3. **Admin retains revoke/edit/correct authority** over any task, including ones a household member created (`CORE_BASELINE.md`: "Household members may create legitimate tasks; Admin retains authority to revoke, edit, assign, or correct"), and any inappropriate reward is unwound via an immutable, auditable `RewardAdjustmentTransaction` (`TASK_LIFECYCLE.md`), never by silently editing history.

**Gap the docs do not resolve, called out rather than guessed**: the authoritative `Task` type has no field at all for the effort/duration classification the engine needs to compute base yield minutes. Phase 2 below adds this by merging the relevant descriptive fields from the superseded `task.ts` (an enumerated `duration_tier`, not a free number) onto the authoritative `Task`, with the tier → minutes mapping living in `engine.config.ts` (matching the existing `RENEWAL_ENGINE_CONFIG`/`MOTION_ENGINE_CONFIG`-style tunable-constant pattern), not as a per-task editable value. A household member creating an `ad_hoc` task picks from a small fixed set of tiers; the minute-value each tier resolves to is engine configuration, not something any task creator (admin or not) sets directly. This is the smallest extension consistent with the existing documented model, not a new reward economy.

### Fresh household state is genuinely empty

No seed/demo data is ever inserted into a real household's database. Fixture data in `frontend/src/*.ts` remains development/test-only and is never written to a real household. First-run screens (Household Setup, Task Board, Rewards, Calendar) must all render a coherent, non-broken empty state — described per-phase below.

### UI guidance

Existing Aevumory screens, themes (`data-theme` presets), typography, spacing, component patterns, and interaction conventions (card containment, `Complete`-style primary actions, `← Back` secondary navigation, native-control styling, semantic CSS variables in `styles.css`) remain the primary design authority for every new screen in this plan (Household Setup, Rewards). They are not frozen — small, justified extensions are fine — but new screens extend this language rather than introducing a separate dashboard/admin-panel aesthetic. The Skylight Calendar reference informs backend/self-hosting practicality only, never Aevumory's visual language.

---

## Phases

Each phase is independently verifiable. Phase 0 is a hard dependency for everything else; phases are otherwise ordered by what unlocks what.

### Phase 0 — Backend application skeleton & SQLite persistence foundation

**Purpose**: stand up the first real backend process and the first real persistence layer.

**Builds on**: existing `TemporalRepository` interface/pattern as the template; existing `temporal.sql`.

**Backend changes**: Add `fastify` and `better-sqlite3` to `package.json`. New `backend/src/server.ts` (Fastify instance, route registration, serves built frontend static assets in production alongside `/api/*`). New `backend/src/app.config.ts` (env-driven config — `DATA_DIR`, `PORT`). New `backend/migrations/0001_temporal.sql` (existing schema, re-verified SQLite-valid) plus `backend/src/persistence/migrate.ts` runner. New `backend/src/persistence/temporal.repository.sqlite.ts` implementing the existing `TemporalRepository` interface (in-memory kept for tests only). New `backend/src/http/require-admin.ts` hook.

**Persistence changes**: first migration creates temporal tables + a `schema_migrations` tracking table.

**API/Frontend changes**: none yet beyond `/api/health`.

**Testing**: `vitest run` stays green; manual restart round-trip validates persistence before building further.

**Dependencies**: none (first phase). **Usable after**: foundation only, nothing user-facing.

---

### Phase 1 — Household & Participant domain

**Purpose**: a persistent household identity and persistent participants, replacing hardcoded participant fixtures.

**Builds on**: Phase 0's migration runner/repository pattern/`require-admin`; `PARTICIPANT_PROFILE_SPEC.md`'s minimal model (stable id, display name, optional representation — no relationships, no permissions graph, no DOB unless a concrete feature needs it).

**Domain changes**: new `household.types.ts` — `Household { household_id, name, admin_pin_hash, created_at }`, `Participant { participant_id, household_id, display_name, representation_ref?, created_at, updated_at }`.

**Backend changes**: `household.repository.ts`/`participant.repository.ts` (SQLite + in-memory), `household.service.ts` (bootstraps the single Household row if none exists — structural bootstrap, not seed data), `participant.service.ts` (CRUD, admin-gated mutations).

**Persistence changes**: `0002_household.sql` — `households`, `participants`.

**API changes**: `GET /api/household`; `GET/POST/PATCH/DELETE /api/participants` (admin-gated mutations); `POST /api/admin/pin/setup` (only while `admin_pin_hash IS NULL`); `POST /api/admin/session`.

**Frontend changes**: new `api-client.ts` (fetch wrapper + `API_BASE`). New `household-setup.ts` + `.css` (admin screen for participants, reusing existing card/button patterns). Zero-participant empty state: plain "add your first participant" affordance, no placeholder content. Replace hardcoded participants in `tasks.ts`/`main.ts` with `/api/participants`.

**Testing**: repository tests mirroring `temporal.repository.memory.test.ts`; bootstrap-idempotency test.

**Dependencies**: Phase 0. **Usable after**: household exists persistently; admin sets PIN and manages participants.

---

### Phase 2 — Task domain: definitions, scheduling, cycles

**Purpose**: real, persistent task definitions and scheduled occurrences — the Tasks vertical slice core, without reward attribution yet.

**Builds on**: Phase 1; `task-domain.types.ts` as sole authoritative shape; `recurrence.resolver.ts` as the direct pattern.

**Domain changes**: adopt `task-domain.types.ts` as authoritative; add the minimal descriptive-effort fields needed for engine yield computation (enumerated `duration_tier`, `effort_type`, `supports_foothold` — not free numbers) onto the authoritative `Task`. **Delete `task.ts`** once confirmed unreferenced. Add `duration_tier → base minutes` mapping to `engine.config.ts` (`TASK_YIELD_ENGINE_CONFIG`), matching the existing tunable-constant pattern.

**Backend changes**: `task.repository.ts` (Task + TaskCycle CRUD); `task-cycle.resolver.ts` — pure function generating `TaskCycle` rows from `Task.schedule`, mirroring `recurrence.resolver.ts` including anchor immutability; `task.service.ts` — CRUD (definition mutations admin-gated), cycle listing, reassignment (drag to participant/household bucket) as an **ordinary, non-admin** action matching today's UX.

**Persistence changes**: `0003_tasks.sql` — `tasks`, `task_cycles`.

**API changes**: `GET/POST/PATCH/DELETE /api/tasks` (mutations admin-gated); `GET /api/tasks/:id/cycles`; `GET /api/task-cycles?window=...`; `POST /api/task-cycles/:id/assign` (ordinary).

**Frontend changes**: replace `FixtureTaskBoardQuery` in `tasks.ts` with a real implementation; `task-board.ts` rendering/drag-drop unchanged, `store.apply()` mutations now call the API + refetch. Empty state: existing column structure, empty-list state per column, no placeholder tasks.

**Testing**: cycle-resolver tests (one-off/interval/calendar-anchor, anchor immutability across late completion); task repository tests; cycle-window API test.

**Dependencies**: Phase 1. **Usable after**: tasks creatable (admin), scheduled, reassignable across devices — completion doesn't grant rewards yet.

---

### Phase 3 — Execution & reward ledger

**Purpose**: completing a task produces a real, persistent, auditable Experience/Credit transaction — Credits/Experience as transactions, never a mutable balance.

**Builds on**: Phase 2; `TASK_LIFECYCLE.md` (foothold, deductive pruning, lifecycle disposition) and `PROGRESSION_SPEC.md` (XP/Credit anchor, level curve) exactly.

**Backend changes**: `execution.repository.ts`/`ledger.repository.ts` (SQLite + in-memory) — a participant's Credit/XP total is always `SUM(reward_transactions) + SUM(reward_adjustments)`, never a stored mutable field. `task-execution.service.ts` implements Task→Cycle→Execution→RewardTransaction exactly per `TASK_LIFECYCLE.md`: binary completion; `UserTaskState` (`active`/`foothold_established`/`completed`) only when `supports_foothold`; one initiation reward per active lifecycle; `deductively_pruned` outcome with immutable audit entry and admin-reversal producing a compensating `RewardAdjustmentTransaction` that reopens the cycle; idempotent completion via `idempotency_key`. Base yield computed only from the documented anchor applied to `duration_tier`'s configured minutes.

**Scope boundary, called out explicitly**: Discipline modifier engines (Motion clustering, Order maintenance-resonance, Care relief, Renewal recovery windows, Composition/Continuity, exceptional outcomes) are **not implemented in this plan** — consistent with the request's own allowance that rewards needn't be a "fully populated economy" yet. A single `applyModifiers(baseYield, context)` no-op extension point is left for later.

`progression.service.ts` wraps existing pure `resolveDisciplineLevel`/`isMastered` against persisted cumulative XP derived from the ledger.

**Persistence changes**: `0004_execution_and_rewards.sql` — `execution_events`, `reward_transactions`, `reward_adjustments`.

**API changes**: `POST /api/task-cycles/:id/complete` (ordinary); `POST /api/task-cycles/:id/prune` (ordinary); `POST /api/reward-adjustments` (admin-only); `GET /api/participants/:id/ledger`; `GET /api/participants/:id/progression`.

**Frontend changes**: Task Board `Complete` calls the completion endpoint and refetches.

**Testing**: foothold single-award test; pruning+reversal test; idempotent re-completion test; level-resolution test.

**Dependencies**: Phase 2. **Usable after**: completing a task anywhere produces real transactions visible from any device.

---

### Phase 4 — Rewards domain & screen

**Purpose**: a real Rewards domain/screen — create/edit/view/redeem against real Credits — staying intentionally small in content per the request's own scope guidance.

**Builds on**: existing `reward.ts` types; Phase 3's ledger; Phase 1's admin-gating pattern.

**Backend changes**: `reward.repository.ts`/`reward.service.ts` — catalog CRUD (admin-gated); redemption (ordinary) writes `RewardRedemption` + a debiting `RewardTransaction`, never decrements a stored balance.

**Persistence changes**: `0005_rewards.sql` — `rewards`, `reward_redemptions`.

**API changes**: `GET/POST/PATCH /api/rewards` (mutations admin-gated); `POST /api/rewards/:id/redeem` (ordinary, rejected on insufficient balance).

**Frontend changes**: new `rewards.ts` + `rewards-view.ts` + `rewards.css`, following the exact convention established by `calendar.ts`/`calendar-view.ts`/`calendar.css`. Reachable via `#rewards`, linked from participant profile. Empty state: "no rewards yet" + admin-only "add a reward" affordance, no demo rewards.

**Testing**: redemption tests (insufficient-balance rejection, ledger shape, admin gate on catalog mutation).

**Dependencies**: Phase 1 (admin gating); Phase 3 (spendable ledger) needed for redemption. **Usable after**: rewards creatable/editable by admin, redeemable by any participant.

---

### Phase 5 — Calendar persistence + API wiring

**Purpose**: the already-implemented temporal domain becomes real and persistent, replacing `calendar.ts`/`temporal.ts` fixtures.

**Builds on**: Phase 0's `SqliteTemporalRepository`; the already-complete `DefaultTemporalService`/`resolveEventOccurrences` — wiring only, no new domain logic.

**Backend changes**: point `DefaultTemporalService` at `SqliteTemporalRepository`.

**API changes**: `GET/POST/PATCH/DELETE /api/calendar/sources`; `GET/POST/PATCH/DELETE /api/calendar/events`; `GET /api/calendar/occurrences?window=...`.

**Frontend changes**: replace `FixtureCalendarQuery`/`FixtureTemporalQuery` with real implementations of the same interfaces; `calendar-view.ts` unchanged.

**Explicit decision, not silently resolved**: only a `CalendarSourceAdapter` interface exists, no concrete external-provider implementation. Per the request, external providers stay an integration boundary — **not implemented this round**; only the local Aevumory calendar source is wired end-to-end.

**Testing**: API integration tests for event CRUD + recurrence-window queries.

**Dependencies**: Phase 0 only (parallel to 2–4). **Usable after**: Calendar is real, persistent, shared across devices.

---

### Phase 6 — Event Horizon consumes real state

**Purpose**: Ambient/Event Horizon reflects real persisted calendar events, preserving the tasks-excluded boundary.

**Builds on**: Phase 5; `horizon.ts`'s existing computational math (unchanged); `EVENT_HORIZON.md`'s eligibility/composition split.

**Frontend changes**: `main.ts` default route switches to the real API-backed query. New `horizon-eligibility.ts` — pure function applying the currently-absent eligibility filter using `relevance`/`significance` fields already on `HouseholdEvent`/`TemporalOccurrence`. No task data wired into this surface.

**Testing**: eligibility function unit tests.

**Dependencies**: Phase 5. **Usable after**: Ambient screen shows real calendar events with basic eligibility filtering.

---

### Phase 7 — Participant profile real data + polling refresh

**Purpose**: Participant Profile shows real accomplishments/balances; screens stay in sync across devices per the polling decision.

**Builds on**: Phase 3 (ledger/progression), Phase 4 (redemption history).

**Frontend changes**: wire `participant-profile.ts` to real Domain/Discipline progress, Credit balance/history, redemption history — replacing `domainFixtures`/`profileFixtures`. Shared polling helper in `api-client.ts` (interval refetch + refetch-on-`visibilitychange`) applied to Task Board, Calendar, Rewards, Ambient/Horizon.

**Testing**: manual multi-tab verification of cross-device consistency within one poll interval.

**Dependencies**: Phases 3 and 4. **Usable after**: multiple devices see materially the same state; profile reflects real accomplishments.

---

### Phase 8 — Deployment packaging & validation

**Purpose**: make obtain → configure → run → access-from-another-device → restart-without-loss concrete, matching the corrected single-device/home-server model.

**Backend changes**: `server.ts` production mode serves `frontend/dist` + `/api/*` from one process/port.

**New files**: `.env.example` (`DATA_DIR`, `PORT`); *optional* `docker-compose.yml`/`Dockerfile` for an always-on home-server deployment (SQLite file on a mounted volume) — explicitly optional; `npm run build && npm start` on a desktop is the baseline.

**Doc changes**: update `docs/HANDOFF.md` with the obtain/configure/run/first-PIN-setup/restart-safety story.

**Verification** (adapted validation checklist): fresh start with empty household → first-run PIN setup → create 2 participants → create+assign an interval task → complete its cycle and confirm ledger totals equal `SUM(transactions)` → create+redeem a reward and confirm balance correctness → create a calendar event and confirm visibility from a second device and on Ambient/Horizon if eligible → restart the process and confirm all state (household/participants/tasks/executions/rewards/calendar) survives.

**Dependencies**: all prior phases.

---

## Summary of explicit scope boundaries

- **Build now**: SQLite persistence; Fastify API; Household/Participant domain with first-run PIN setup; full Task→TaskCycle→ExecutionEvent→RewardTransaction pipeline with base (non-modified) yield; Rewards domain and screen; persistent local Calendar; Event Horizon consuming real calendar data with basic eligibility filtering; polling-based multi-device consistency; single-process self-host packaging.
- **Architect for, not implemented now**: Discipline modifier engines behind a documented no-op extension point; external calendar provider adapters behind the existing `CalendarSourceAdapter` interface; push-based sync behind the existing service boundary; an alternative non-SQLite persistence adapter behind the existing repository interfaces.
- **Not building**: any notification system; any per-user authentication/roles beyond the single household admin PIN; any seed/demo data written into a real household.