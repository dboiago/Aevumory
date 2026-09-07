# Participant & Profile Design Specification

## 1. Purpose

Aevumory supports one Home per installation, with one or more Participants. A Participant is a persistent household identity that other Aevumory systems can reference.

The Participant model should remain intentionally small. Aevumory should preserve architectural flexibility without exposing configuration that has no concrete use yet.

The governing rule is:

> Preserve expansion paths in the architecture. Do not expose configuration until something genuinely benefits from it.

## 2. Home and Household Bucket

Aevumory is not intended to support multiple households per installation.

The **Household** shown on the Task Board is not a Participant and is not a general household identity. It is a task bucket used only by the Tasks surface for work that belongs to the household collectively.

Household does not therefore:

- have a participant profile
- appear as a Calendar participant
- own domain progression
- own rewards
- have an avatar or Mark
- appear as an entity on the ambient display

The Task Board may present the Household bucket alongside participant columns because they share the same task interaction model. That is a presentation decision, not a domain identity relationship.

## 3. Participant Core

The minimum Participant identity is deliberately small:

```text
Participant
├── stable id
├── display name
└── optional representation
```

### Display name

The display name does not need to be a legal name or globally unique name. It is whatever the household uses to identify the participant.

### Representation

A participant may have an optional visual representation. An initial fallback is always sufficient. A selected image or abstract avatar may be added without changing the participant's core identity.

The representation is personal identity. It is distinct from the participant's progression state and persistent accomplishment expression.

The representation must not become a prerequisite for participation or progression.

## 4. Optional Participant Context

Optional information should be added only when it enables a concrete Aevumory feature.

A birthday/date of birth is an example of optional context. It is never required to create or use a Participant. If provided, it may support non-gating features such as birthday recognition or future age-aware functionality.

Age is derived when a feature actually needs it. Aevumory should not collect age or date-of-birth information merely because it could be useful someday.

### Relationships

Household relationship modelling is intentionally deferred.

Potential relationships such as parent, child, partner, spouse, grandparent, friend, tenant, or owner should not be added to the Participant model until a real product feature demonstrates that they provide enough value to justify the additional data, semantics, and user configuration.

If a future feature needs targeting or grouping, explicit participant selection or household-defined groups should be considered before introducing a general relationship graph.

Relationships must not be used as implicit permissions. A relationship describes household context; it does not automatically determine what a participant may do.

## 5. Permissions and Household Rules

Age, relationship, or other participant context should not silently dictate application functionality.

If Aevumory eventually provides restrictions such as:

```text
Restrict children from adding rewards to the store
```

that restriction should be an explicitly configured household rule. The system provides the administrator with ways to target participants or groups; it does not impose the rule merely because someone is classified as a child.

Permissions and descriptive household context are therefore separate concepts.

A full permissions model is not currently required.

## 6. Profile Boundary

The Participant Profile is an aggregation and management surface for participant-specific state. It is not the owner of the underlying systems represented there.

Conceptually:

```text
Participant Profile
├── Identity / representation
├── Current state
├── Progress
├── Rewards / history
└── Connections
```

The profile may show or manage:

- current reward balance
- reward purchase/redemption history
- Domain levels and progress
- earned perks
- future progression state
- participant-specific integrations and their connection status

The underlying systems remain authoritative:

```text
Task Board       → task interaction
Calendar         → temporal interaction
Rewards          → reward creation/redemption
Progression      → Domain and Discipline resolution
Integrations     → authentication and provider state
```

The profile may link into or summarize those systems without duplicating their interaction model.

For example, a participant's task count may be visible on the profile, but the profile should not become a second Task Board.

## 7. Profile Presentation

The profile should not be treated as a conventional application profile screen by default.

Its information architecture should remain clear and functional, but the visual surface may be a composed, game-adjacent personal sheet. A classic character-sheet sensibility is a useful reference for information density and composition, but Aevumory must not become an RPG or fictional character system.

The identity should have meaningful visual weight without turning the page into a large generic social-profile header.

The upper composition should distinguish three separate concepts:

```text
Participant representation
        +
Participant expression field
        +
Domain structures
```

The participant's representation is a compact identity marker, such as an initial or chosen image. On the profile it may be mounted on or overlap the boundary of the larger expression field.

The large expression field is not a conventional oversized avatar container. It is reserved territory for richer persistent accomplishment expression, theme-specific environmental treatment, future Mark-derived geometry, or other visual interpretation. The field should remain structurally stable even as its contents evolve.

This separation allows a participant to change their personal representation without changing or losing their accomplishment expression.

The participant name should be integrated with the expression field boundary rather than implemented as a conventional profile heading. A likely composition is:

```text
            [ representation ]
                   │
      ┌────────────┼────────────┐
      │                         │
      │    participant          │
      │    expression field     │
      │                         │
      └────────── name ─────────┘
```

The exact vessel geometry remains intentionally open.

Domain information is intended to occupy the upper-right composition adjacent to the participant expression field. The four Domains should not default to conventional cards, dashboard widgets, or four identical progress bars.

Each Domain is a composed semantic structure containing:

```text
Domain rank
    ↓
Domain visual vessel / optional icon
    ↓
Domain identity
    ↓
Associated Discipline annotations
```

The Domain itself should remain the primary semantic unit. Rank notation is supporting information rather than the defining visual focus.

A Domain may use a shared geometric vessel, frame, shield-like form, rounded form, or other stable visual structure. The exact shape is intentionally undecided. Domain-specific differentiation should primarily come from iconography, if adopted, the Domain name, associated Disciplines, and theme interpretation.

The Domain rank may use restrained Roman numeral notation. It may sit above, below, or otherwise attach to the Domain vessel. Roman numerals should remain supporting notation and must not dominate the composition in the manner of RPG combat statistics.

Each Discipline may appear as a smaller adjacent structure or annotation:

```text
        II
   [ domain vessel ]
      KINETIC

   [ I ] Force
   [ V ] Motion
   [ I ] Precision
```

Discipline rank and name remain subordinate to the Domain.

Progress bars are not currently required. They should be introduced only if the progression system later has a concrete state that benefits from showing precise movement toward a threshold.

## 8. Persistent Progress Expression

The former Mark concept is reframed as a future **theme-specific visual expression of actual accomplishments** rather than a fixed procedural Mark that must be displayed everywhere.

Participant representation and persistent expression are separate layers:

```text
Participant representation
    → initial / image / chosen identity

Participant expression
    → accomplishment-driven visual state
    → interpreted by the active theme
```

The underlying progression system should record durable accomplishment information. A visual expression consumes that information and interprets it according to the active visual theme.

The critical distinction is:

```text
Generic progress
    → how far along is someone?

Persistent expression
    → what has this participant actually accomplished?
```

The visual should therefore be determined by the participant's accomplishments rather than by a generic overall percentage or level alone.

## 9. Theme Mapping

The underlying accomplishment state must remain independent of the active theme.

Conceptually:

```text
Participant accomplishments
        ↓
Theme-specific visual interpretation
```

A stable accomplishment identifier or equivalent semantic state may map differently in each theme. For example, the same accomplishment might reveal a point in a constellation under Nebula, contribute to organic growth under Overgrown, or contribute to a garden under Vernal.

These examples establish the architectural direction only. The actual visual metaphors, rendering rules, geometry, and Maritime expression remain intentionally undecided.

Changing themes must not change the participant's underlying progression or erase accumulated expression. It only changes how the same accomplishments are represented.

The visual may become increasingly personal because two participants can have different accomplishment histories even when their aggregate progression is similar.

## 10. Expression and Optionality

Persistent visual expression is an optional presentation layer.

A participant must remain fully functional if no progression expression, Mark, generated artwork, or other playful visual system exists.

The expression may eventually influence the profile environment around the identity, including framing, edges, corners, background geometry, or other thematic elements. It should not make core information harder to understand or turn progression into fictional RPG statistics.

The Task Board should continue to use compact participant identity representations. The profile expression field is the primary surface where richer personal visual expression can have sufficient space without compromising operational interactions.

## 11. Connections

Participant-specific integrations may be managed from the Profile.

The profile may show connection state and provide actions such as connect, manage, or disconnect. Credentials and provider secrets remain within the integration/authentication layer and are not exposed as profile information.

Examples may include calendar or photo services when those integrations are implemented.

## 12. Emergency Information

Emergency contacts are not Participant Profile data.

Aevumory may eventually provide a general **Emergency** utility accessible from the primary navigation or fly-out menu. That surface can contain configured emergency contacts, household resources, phone numbers, optional email/message destinations, and other useful emergency information.

The emergency utility may reference participants or household contacts where useful, but it is a household utility rather than a profile section.

Potential device capabilities such as calling or messaging should be treated as optional presentation/platform capabilities rather than assumptions of the domain model.

## 13. Design Rule

Participant design should follow the same optionality principle as the rest of Aevumory:

```text
Does the system need this information to function?
    Yes → required

    No
    ↓
Does providing it enable a concrete feature available now?
    Yes → optional

    No
    ↓
Do not expose it yet
```

Architectural extensibility is valuable. Configuration friction without present value is not.
