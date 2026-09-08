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

The primary household display is a passive, observational surface intended to behave like a digital photo frame with meaningful events composed into it.

The Ambient screen should remain visually dominated by its selected imagery or other ambient media.

The Horizon should coexist with:

* background imagery or other ambient media
* an optional persistent household signature containing user-configurable date, time, weather, or similar context
* qualifying upcoming events
* explicitly configured serious alerts

The display should remain useful and visually complete when there are no qualifying events and when the optional signature is disabled.

An event appearing on the Horizon is a presentation decision. It does not change the event's underlying state.

## 4. Ambient Screen Boundary

The Ambient screen is not a household dashboard.

Ordinary household information should not accumulate on the Ambient surface merely because it is available. In particular, the Ambient screen should not normally display:

* task summaries
* household activity feeds
* persistent device states
* unread counts
* ordinary notifications
* routine household status

The intended resting experience is fundamentally a digital photo frame with the Event Horizon layered into it.

The only intentional interruption outside the normal Horizon and optional signature is a serious alert that the household has explicitly configured Aevumory to surface.

## 5. Signature

The Ambient screen may contain a single-line signature providing optional persistent orientation.

The current preferred presentation is:

```text
Monday · 7:42 PM · 21°
```

The signature is treated as one compositional element with equal typographic weighting rather than a hierarchy of separate date, time, and weather widgets.

Users may configure which components are shown and how time is formatted. The composition must therefore support variable content without relying on a fixed number of segments or a fixed width.

The signature should not acquire conventional UI decoration merely to remain legible over difficult imagery.

Legibility treatment should instead alter the immediate visual environment around the typography as subtly as necessary while preserving the impression of a signature on the image.

## 6. Transient Household State and Alerts

The signature position may temporarily represent a meaningful current household state when there is a specific reason to interrupt the normal signature.

For example:

```text
Someone's at the door
```

Such a state may be actionable by touching the information itself. Explicit labels such as `Tap to view` are not required on the Ambient surface.

Ordinary notifications should not use this mechanism indiscriminately.

Serious alerts are a distinct category. Examples may include a configured security, safety, environmental, or household-system alert that warrants immediate awareness.

Serious alerts may use the same signature position while receiving a more visible visual treatment appropriate to their importance.

A serious alert should not automatically disappear merely because a normal Ambient transition has occurred. Where appropriate, it should persist until acknowledged or until the underlying alert condition is resolved.

Alert behavior, severity levels, acknowledgment semantics, and exact visual treatment remain implementation and design decisions.

## 7. Ambient Interaction

The Ambient screen has no persistent navigation control.

The current interaction model is directional vertical gesture navigation:

```text
Ambient
   │
   │ swipe up
   ▼
Functional Interface
   │
   │ swipe down
   ▼
Ambient
```

Swiping up reveals the functional household interface.

Swiping down returns to the Ambient screen.

The transition should feel like the Ambient surface is being moved away to reveal the functional interface beneath it rather than like a conventional route change.

The Ambient imagery, event typography, signature, and underlying functional surface may move and fade at slightly different rates to create a restrained layered transition.

No visible handle, menu icon, or other persistent navigation affordance is currently required.

## 8. Event Eligibility

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

## 9. Tasks Are Not Horizon Events

Tasks and events remain separate concepts.

```text
Household Tasks ───────────────X────────────► Horizon
                                      │
                                      └── explicit exceptional relationship only
```

A task should normally remain on task-oriented surfaces.

There may be legitimate cases where a task has a meaningful relationship with an event. For example, an event could create a genuine preparation requirement whose timing is relevant to the household. Such a relationship must be explicit and justified by the household context.

The Horizon must not become a second task list or a place where routine chores accumulate simply because they are scheduled.

## 10. Eligibility vs Composition

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

## 11. Approach to Time

The Horizon communicates temporal proximity rather than attempting to reproduce a full calendar grid.

An event may become increasingly legible as it approaches relevance. The visual expression of that progression is intentionally separate from the event's data model.

The previous orbital-arc implementation is not authoritative and should not be used as an architectural constraint.

The Horizon may eventually use spatial, typographic, atmospheric, or other visual metaphors for approaching events. The current specification intentionally does not prescribe one.

## 12. Composition Principles

The ambient display should favor:

* calm over density
* anticipation over notification noise
* hierarchy over uniform treatment
* legibility over decorative complexity
* subtle change over constant motion
* preservation of the selected image as a meaningful visual object

The Horizon should not demand attention merely because data exists.

An event can be important without being visually loud.

The Ambient screen should not acquire additional persistent information merely to make the application appear more informative.

## 13. Persistent Context

Date, time, weather, and similar ambient context may remain visible independently of Horizon event eligibility, but all such elements are optional user-configurable signature components.

These elements are not themselves required to be represented as Horizon events.

Persistent context should provide orientation without competing with meaningful event content.

## 14. External Event Sources

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

## 15. Display State

The Horizon may maintain transient presentation state such as:

* which eligible events are currently emphasized
* transition timing
* current composition
* whether an event has recently been surfaced
* available display occupancy
* active transient household state
* active alert presentation state

Such state is presentation state unless there is a deliberate reason for it to become durable household state.

The event itself should not be modified merely because it was displayed.

## 16. Failure and Absence

The Horizon must degrade gracefully.

If an external calendar source is unavailable, previously synchronized information may remain available according to the persistence strategy, but the display should not invent current events.

If no qualifying events exist, the ambient display continues normally without an empty calendar-like panel.

If too many events are eligible, composition must reduce or prioritize them rather than turning the ambient display into a dense calendar.

If the optional signature is disabled, the image and Horizon composition must remain complete without reserving an obvious empty signature area.

## 17. Deferred Decisions

The following remain intentionally open:

* exact eligibility scoring or rules
* exact forward time window
* event prioritization and de-duplication policy
* exact visual representation of temporal proximity
* animation and transition timing
* occupancy and composition algorithms
* exact legibility treatment for difficult imagery
* signature settings and available context sources
* transient household-state eligibility and duration
* alert severity levels, acknowledgment behavior, and visual treatment
* inactivity behavior for returning functional screens to Ambient
* external calendar providers and synchronization strategy

These should be resolved through implementation and visual design work rather than prematurely encoded as domain assumptions.
