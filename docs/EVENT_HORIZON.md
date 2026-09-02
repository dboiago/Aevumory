# Event Horizon

## 1. Purpose

The Event Horizon is Aevumory's ambient presentation of meaningful household events as they approach relevance.

It is not a calendar replacement, a task board, or a generalized activity feed.

The Horizon exists to let the household perceive what is coming without requiring someone to open a calendar and inspect it.

## 2. Core Boundary

Calendar and event information belongs to the household temporal model, not to the Horizon itself.

```text
Household Temporal Model
          │
          ├──────────────► Calendar Surface
          │
          └──────────────► Horizon Eligibility
                                  │
                                  ▼
                           Ambient Composition
```

This means the Calendar surface and the Horizon can evolve independently while using the same underlying event information.

The Horizon must not become the authoritative store for event data.

## 3. Ambient Role

The primary household display is passive and observational.

The Horizon should coexist with:

* background imagery or other ambient media
* persistent date and time
* weather or other persistent household context where useful
* qualifying upcoming events

The display should remain useful when there are no qualifying events.

An event appearing on the Horizon is a presentation decision. It does not change the event's underlying state.

## 4. Event Eligibility

Not every event belongs on the Horizon.

Eligibility should consider at least:

* temporal proximity
* household relevance
* event significance
* whether the event is actionable or worth anticipating
* whether it has already been surfaced sufficiently
* available ambient-display space

The initial Horizon scope is upcoming household events, generally within a limited forward horizon rather than an unrestricted calendar projection.

The Horizon should favor meaningful events over routine temporal noise.

Routine task schedules are not Horizon content merely because they have dates or recurrence.

## 5. Tasks Are Not Horizon Events

Tasks and events remain separate concepts.

```text
Household Tasks ───────────────X────────────► Horizon
                                      │
                                      └── explicit exceptional relationship only
```

A task should normally remain on task-oriented surfaces.

There may be legitimate cases where a task has a meaningful relationship with an event. For example, an event could create a genuine preparation requirement whose timing is relevant to the household. Such a relationship must be explicit and justified by the household context.

The Horizon must not become a second task list or a place where routine chores accumulate simply because they are scheduled.

## 6. Eligibility vs Composition

Two different decisions are involved:

### Eligibility

Should this event be represented on the ambient display at all?

### Composition

Given the eligible content, how should the display present it at this moment?

These concerns must remain separate.

An eligible event should not carry authoritative presentation properties such as a fixed screen coordinate, opacity, orbit position, or animation state.

```text
Event
  │
  ▼
Eligibility
  │
  ▼
Eligible Event Set
  │
  ▼
Composition
  │
  ├── placement
  ├── scale / emphasis
  ├── timing
  ├── transition
  └── ambient treatment
```

Composition may change as the display state changes without mutating the underlying event.

## 7. Approach to Time

The Horizon communicates temporal proximity rather than attempting to reproduce a full calendar grid.

An event may become increasingly legible as it approaches relevance. The visual expression of that progression is intentionally separate from the event's data model.

The previous orbital-arc implementation is not authoritative and should not be used as an architectural constraint.

The Horizon may eventually use spatial, typographic, atmospheric, or other visual metaphors for approaching events. The current specification intentionally does not prescribe one.

## 8. Composition Principles

The ambient display should favor:

* calm over density
* anticipation over notification noise
* hierarchy over uniform treatment
* legibility over decorative complexity
* persistence where useful, without requiring interaction
* subtle change over constant motion

The Horizon should not demand attention merely because data exists.

An event can be important without being visually loud.

## 9. Persistent Context

Date, time, weather, and other ambient context may remain visible independently of Horizon event eligibility.

These elements are not themselves required to be represented as Horizon events.

Persistent context should provide orientation without competing with meaningful event content.

## 10. External Event Sources

External calendar providers are sources of temporal data, not the Horizon's domain model.

```text
External Source
      │
      ▼
Source Adapter
      │
      ▼
Household Event
      │
      ▼
Horizon Eligibility
```

Provider-specific identifiers, synchronization state, recurrence formats, and other source details belong at the integration boundary.

The Horizon should consume normalized household event concepts.

## 11. Display State

The Horizon may maintain transient presentation state such as:

* which eligible events are currently emphasized
* transition timing
* current composition
* whether an event has recently been surfaced
* available display occupancy

Such state is presentation state unless there is a deliberate reason for it to become durable household state.

The event itself should not be modified merely because it was displayed.

## 12. Failure and Absence

The Horizon must degrade gracefully.

If an external calendar source is unavailable, previously synchronized information may remain available according to the persistence strategy, but the display should not invent current events.

If no qualifying events exist, the ambient display continues normally without an empty calendar-like panel.

If too many events are eligible, composition must reduce or prioritize them rather than turning the ambient display into a dense calendar.

## 13. Deferred Decisions

The following remain intentionally open:

* exact eligibility scoring or rules
* exact forward time window
* event prioritization and de-duplication policy
* exact visual representation of temporal proximity
* animation and transition timing
* occupancy and composition algorithms
* event acknowledgment or suppression behavior
* external calendar providers and synchronization strategy

These should be resolved through implementation and visual design work rather than prematurely encoded as domain assumptions.
