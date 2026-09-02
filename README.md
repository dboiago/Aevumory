# Aevumory

A persistent household presence built around the things that actually need doing.

Aevumory combines household task management, progression, rewards, temporal context, and an ambient display into a single household system. Its game mechanics exist to support real-world participation, not to turn the household into a game world.

## Philosophy

Aevumory is not an RPG and does not simulate one.

The core interaction remains simple:

```text
View → Perform → Complete
```

Progression, rewards, and playful presentation are optional layers over that core. Ignoring them must never degrade household functionality or penalize a participant.

Aevumory deliberately avoids character classes, fictional roles, combat statistics, health bars, PvP balancing, mandatory streaks, punitive decay, progression resets, loot systems, gacha mechanics, artificial scarcity, and engagement mechanics designed primarily to keep people interacting with the application.

## Household System

The system is organized around several related but distinct concerns:

- **Tasks** represent real household work, with responsibility, recurrence, execution, and reward attribution
- **Progression** recognizes real-world participation through Domains and Disciplines
- **Rewards** provide a tangible household economy backed by immutable transactions
- **Temporal context** represents household events and calendar information independently of any particular screen
- **Ambient display** presents useful household context passively, with the Event Horizon acting as one consumer of temporal data
- **Integrations** connect external calendars, devices, weather, photos, and other services without making those providers fundamental to the household domain

Tasks and calendar events are intentionally separate concepts. A task does not become an ambient event merely because it has a schedule, and an event does not become a task because it appears near household work.

## Domains & Disciplines

Aevumory currently organizes progression into four Domains:

| Domain | Disciplines |
|---|---|
| **Kinetic** | Force · Motion · Precision |
| **Erudite** | Inquiry · Reason · Synthesis |
| **Form** | Making · Composition · Craft |
| **Keeping** | Care · Order · Renewal |

These systems recognize useful patterns in real household participation. They do not create fictional roles or alternate identities for participants.

## Ambient Display

The household display is designed to be atmospheric, calm, and legible from a distance rather than functioning as a conventional dashboard.

The Event Horizon is not a full calendar screen. It is an ambient presentation system that consumes qualifying temporal information:

```text
Event / Calendar Data
        ↓
Horizon Eligibility
        ↓
Ambient Composition
        ↓
Ambient Display
```

The underlying temporal model is shared with other application surfaces, including the Calendar. Calendar data therefore does not belong exclusively to the Calendar screen.

Routine task information is not displayed on the Event Horizon by default. Explicit relationships may justify exceptional presentation when there is a meaningful household context.

## Documentation

The `docs/` directory contains the current product and engineering specifications.

- [`CORE_BASELINE.md`](docs/CORE_BASELINE.md) — foundational product and system boundaries
- [`GAME_RULES.md`](docs/GAME_RULES.md) — Domains, Disciplines, and progression rules
- [`PROGRESSION_SPEC.md`](docs/PROGRESSION_SPEC.md) — progression, modifiers, and mastery specifications
- [`TASK_LIFECYCLE.md`](docs/TASK_LIFECYCLE.md) — task scheduling, execution, and lifecycle behavior
- [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) — domain, application, persistence, and integration boundaries
- [`DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — visual identity and ambient presentation principles
- [`EVENT_HORIZON.md`](docs/EVENT_HORIZON.md) — Event Horizon behavior and presentation boundaries

## Project Status

Aevumory is under active development.

The product model and core game system are substantially defined. Some longer-term progression and presentation decisions remain intentionally open, and implementation should not treat deferred concepts as established requirements.

## License

Aevumory is released under the [PolyForm Noncommercial License 1.0.0](LICENSE).
