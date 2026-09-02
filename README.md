# Aevumory

A persistent household system designed to make the state of a home visible, useful, and quietly present.

Aevumory brings together the things a household needs to keep track of, the things happening around it, and the things people actually do to maintain it. The system can present that information through conventional application surfaces or through an ambient household display that does not require constant interaction.

Tasks, progression, and rewards are part of that system. They give household work structure and make participation more satisfying without turning the household itself into a game.

## The Household Model

Aevumory treats the household as a persistent system rather than a collection of unrelated screens.

Several concerns contribute to that shared state:

- **Tasks** represent real household work, including responsibility, recurrence, execution, and completion
- **Temporal context** represents events, schedules, and other information about what is happening or approaching
- **Progression** recognizes patterns in real-world participation through Domains and Disciplines
- **Rewards** provide a tangible household economy backed by immutable transactions
- **Ambient presence** presents useful household context without requiring the household to actively open the application
- **Integrations** connect external calendars, devices, weather, photos, and other services without making those providers fundamental to the household domain

The application surfaces are consumers of this underlying system. Calendar data, for example, belongs to the household temporal model rather than exclusively to the Calendar screen.

## Ambient Presence

The ambient display is a central expression of the Aevumory concept. It is designed to be atmospheric, calm, and legible from a distance rather than functioning as a conventional dashboard.

The display can provide persistent household context while allowing more specific information to become visible when it is relevant. Background imagery, time, date, weather, events, and other contextual information can participate in that composition without requiring the user to interact with it.

### Event Horizon

The Event Horizon is the ambient presentation layer for qualifying temporal information. It is not a replacement for the Calendar and does not own the underlying event data.

The conceptual pipeline is:

```text
Event / Calendar Data
        ↓
Horizon Eligibility
        ↓
Ambient Composition
        ↓
Ambient Display
```

Separating eligibility from composition allows the household temporal model to remain useful to multiple surfaces without coupling the underlying data to a particular visual treatment.

Routine task information is not displayed on the Event Horizon by default. An explicit relationship between a task and an event may justify exceptional presentation when there is meaningful household context.

## Tasks & Participation

Tasks are where Aevumory's participation mechanics become most tangible. The goal is not to make household maintenance into a fictional game world, but to make real work more visible, satisfying, and rewarding.

The core interaction is deliberately simple:

```text
View → Perform → Complete
```

Responsibility, physical execution, scheduling, progression, and reward attribution are distinct concerns. This allows the system to recognize participation without requiring the household to conform to a game-like structure.

The task system deliberately avoids mechanics such as mandatory streaks, punitive decay, progression resets upon failure, artificial scarcity, loot systems, gacha mechanics, or engagement loops designed primarily to keep people interacting with the application.

Ignoring the playful layers must never degrade the core household function or penalize a participant.

## Progression & Rewards

Progression exists to recognize useful patterns in household participation. It is an optional layer over the underlying household system, not the definition of the household or its members.

Aevumory currently organizes progression into four Domains:

| Domain | Disciplines |
|---|---|
| **Kinetic** | Force · Motion · Precision |
| **Erudite** | Inquiry · Reason · Synthesis |
| **Form** | Making · Composition · Craft |
| **Keeping** | Care · Order · Renewal |

These systems provide ways to recognize different forms of useful participation. They do not create character classes, fictional roles, alternate identities, combat statistics, or an RPG-style world around the household.

Rewards form a separate household economy. Reward transactions are treated as durable records rather than mutable balances, allowing corrections to be represented without rewriting history.

## Application Surfaces

Aevumory is intentionally not organized around a single monolithic screen. Different surfaces expose different aspects of the same household state.

- **Task Board** — active household work and participation
- **Calendar** — detailed interaction with household temporal information
- **Ambient Display** — passive household presence and contextual information
- **Event Horizon** — eligibility and composition of qualifying temporal information for ambient presentation

The underlying domain remains independent of these surfaces so that information can be reused without forcing unrelated concepts together.

## Integrations

External services and devices are integration boundaries rather than household domain entities.

Potential integrations include:

- Calendar providers
- Photo services
- Cameras and doorbells
- Robotic vacuums and other household devices
- Weather services
- Central household audio

The household model should remain meaningful if any individual provider is replaced or unavailable.

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

The product model and core system are substantially defined. Some longer-term progression, integration, and presentation decisions remain intentionally open. Deferred concepts should not be treated as established requirements.

## License

Aevumory is released under the [PolyForm Noncommercial License 1.0.0](LICENSE).
