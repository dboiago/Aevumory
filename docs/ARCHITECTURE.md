# Technical Architecture & System Boundaries

## 1. Architectural Intent

Aevumory is a household system with a passive ambient display. The application architecture should reflect the household concepts the system owns rather than a particular deployment device, frontend framework, or smart-home provider.

The architecture therefore separates:

1. **Household domain models** owned by Aevumory
2. **Application surfaces** that present or manipulate those models
3. **Integration adapters** that translate external services into Aevumory concepts
4. **Persistence and application infrastructure** used to store and resolve state

Deployment topology is intentionally not part of the domain architecture. A wall display may eventually run as a dedicated client, browser application, native application, or another suitable presentation target without changing these boundaries.

## 2. Domain Model

Aevumory owns the concepts that have meaning to the household regardless of which external service supplies data.

```text
AEVUMORY HOUSEHOLD
│
├── Participants
├── Tasks
│   ├── Task Definitions
│   ├── Task Cycles
│   ├── Execution Events
│   └── Responsibility / Attribution
├── Events & Temporal Context
│   ├── Household Events
│   ├── Calendar Sources
│   └── Event Occurrences
├── Progression
│   ├── Disciplines
│   ├── Experience
│   └── Mastery
├── Economy
│   ├── Credits
│   ├── Rewards
│   └── Reward Transactions
└── Household Context
    └── Normalized external state where required by the product
```

External providers are not domain entities merely because Aevumory integrates with them. Google Calendar, a camera vendor, a vacuum vendor, or a photo service is an implementation detail of an integration source.

## 3. Application Surfaces

Application surfaces consume domain models according to their purpose. Data should not become trapped inside the screen that first presents it.

```text
                    Household Domain
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
       Task Board       Calendar       Ambient Display
                           │                │
                           │                ▼
                           │          Horizon Eligibility
                           │                │
                           └────────┐       ▼
                                    │   Ambient Composition
                                    │
                                    ▼
                              Calendar Views
```

The Calendar surface is one consumer of the household temporal model. It is not the owner of calendar data.

The Event Horizon is another consumer of temporal data. It applies its own eligibility and composition rules before anything reaches the ambient display.

The Task Board owns task-oriented presentation and interaction. Tasks are not automatically treated as temporal ambient events merely because they have dates or schedules.

## 4. Household Temporal Model

Temporal information should be represented as household-owned concepts before being presented by any particular screen.

At minimum, the temporal layer needs to distinguish:

* the source of an event
* the event identity and lineage
* the occurrence or occurrence window
* start and end information where applicable
* recurrence where applicable
* household relevance
* source synchronization state

A source adapter translates an external provider's representation into these concepts.

```text
External Calendar / Source
          │
          ▼
    Source Adapter
          │
          ▼
 Household Event Model
       │         │
       ▼         ▼
   Calendar   Horizon
    Surface   Eligibility
                 │
                 ▼
            Ambient Display
```

The temporal model should be usable even if the first implementation has only local events. External calendar integration should extend the model rather than define it.

## 5. Event Horizon Boundary

The Event Horizon is an ambient presentation system, not a second calendar and not a generalized household activity feed.

Its pipeline is:

```text
Event / Calendar Data
        │
        ▼
Horizon Eligibility
        │
        ▼
Ambient Composition
   ├── background imagery
   ├── persistent context
   └── qualifying events
```

Eligibility determines whether an event is meaningful enough to appear on an ambient surface. Composition determines how eligible content is arranged and presented.

These are separate concerns. An event can be eligible without prescribing a particular visual position, animation, or layout.

The previous orbital-arc model is not an architectural requirement.

Tasks are excluded from Horizon content by default. An explicit relationship between a task and a meaningful household event may justify an exceptional presentation, but the task system does not feed the Horizon simply because a task has a date, recurrence, or deadline.

The Horizon should remain primarily ambient and observational. Persistent date/time/weather context and background imagery may exist independently of whether any event is currently eligible.

## 6. Task Boundary

Tasks remain a distinct household domain.

```text
Task Definition
      ↓
TaskCycle
      ↓
ExecutionEvent
      ↓
RewardTransaction
```

Task lifecycle, recurrence, responsibility, execution, and reward attribution are specified in `TASK_LIFECYCLE.md` and the progression/economy documents.

A task may have relationships to events or other household concepts, but those relationships should be explicit. The architecture must not collapse tasks, calendar events, and ambient notifications into a single generic activity stream.

## 7. Progression & Economy Boundary

Progression and rewards remain application-owned systems.

```text
Real-world completion
        │
        ▼
 Execution Event
        │
        ├──────────────► Practice / Progression
        │
        └──────────────► Reward Transaction
```

The progression engine operates on attributed real-world activity. Presentation layers should not need to understand or reproduce the rules governing Discipline recognition.

The previous Mark system is deferred. Future visual identity treatments may be introduced without making them a dependency of task execution, progression, or reward attribution.

## 8. Integration Boundary

External services enter Aevumory through adapters.

```text
Calendar Provider ─────┐
Photo Provider ────────┤
Camera / Device ───────┤
Vacuum / Home Device ──┤
Weather Provider ──────┤
                        ▼
                 Integration Layer
                        │
                        ▼
                 Aevumory Models
```

Adapters are responsible for provider-specific concerns such as authentication, polling, webhooks, provider identifiers, rate limits, and source-specific schemas.

The rest of the application should consume normalized Aevumory concepts wherever practical.

An integration should not force the domain model to adopt the vocabulary or assumptions of a particular vendor.

## 9. Persistence & Application Infrastructure

The implementation should maintain a clear separation between domain logic and infrastructure.

Conceptually:

```text
Presentation
     │
Application Services
     │
Domain Models / Rules
     │
Repositories / Adapters
     │
Persistence + External Providers
```

The initial implementation may use local fixtures, a local database, a service API, or another appropriate infrastructure arrangement. None of those choices should be mistaken for a permanent product boundary.

Real-time delivery is an implementation option, not a domain requirement. A display can refresh from current state, subscribe to changes, or combine both approaches as the implementation requires.

## 10. Display Communication

The display should receive application-level state rather than provider-specific events or internal game-state packets.

Avoid coupling the display protocol to concepts such as:

* `ORBITAL_UPDATE`
* `RPG_STATE`
* provider-specific device payloads
* fixed orbital coordinates

If a transport protocol is introduced, its messages should describe meaningful application state or presentation updates and remain independent of the visual implementation where practical.

## 11. Internationalization Boundary

Aevumory is **internationalization-ready, not internationalized** for V1.

The domain and persistence layers must remain locale-neutral. They should store semantic values rather than user-facing formatted strings. Temporal data, for example, should continue to use absolute instants, IANA timezones, local dates, and recurrence rules rather than localized display text.

English is the canonical product language for V1. Additional languages and locale conventions may be introduced later without changing domain semantics.

User-facing formatting belongs to the presentation layer. This includes date formats, time formats, number formats, and other locale-sensitive conventions. A 24-hour clock is therefore a presentation preference rather than a temporal-domain rule.

The architecture should support Unicode text, but V1 does not require translation infrastructure, locale-specific semantic models, or accommodation of every writing system. Product concepts should not be distorted to support a future language if doing so would compromise their meaning. English remains a supported baseline.

## 12. Architectural Principles

### Domain Ownership

Aevumory owns household concepts. External services provide data and capabilities through adapters.

### Surface Independence

A domain model must not be owned by the first screen that displays it. Calendar data can feed the Calendar surface, Event Horizon, and future temporal surfaces without duplication of authority.

### Explicit Relationships

Cross-domain relationships should be deliberate. A task appearing near an event does not make it an event, and an event appearing on the Horizon does not become a task.

### Optional Integrations

Core household functionality should remain coherent when external providers are unavailable or disconnected.

### Optionality of Playful Systems

Progression and visual identity layers may enrich household participation but must not degrade core household operation when ignored.

### Presentation Is Not State

Ambient composition, animation, opacity, position, and other visual treatments are presentation decisions. They should not become authoritative domain state unless there is a genuine product reason to persist them.

### Locale Neutrality

Domain semantics must not depend on a particular language, locale, date format, time format, or number format. Localization belongs at the presentation boundary.

## 13. Deferred Decisions

The following remain intentionally open:

* exact frontend/runtime technology
* deployment topology for the permanent household display
* exact real-time transport strategy
* external calendar providers and synchronization mechanisms
* smart-home provider integrations
* final Event Horizon visual composition
* future personal visual identity treatment
* additional product languages and locale conventions
