# Aevumory Engine & Practice Specifications

## 0. Non-Negotiable Boundaries

Aevumory is not an RPG, nor is it a game world. It incorporates game mechanics to support real-world participation, motivation, discovery, and delight.

The system rejects:

* Character classes, fictional roles, combat statistics, health bars, or PvP systems
* Mandatory daily streaks or punitive progression decay
* Loot tables, gacha, artificial scarcity, or monetized progression loops
* Engagement mechanics designed primarily to maximize time in the app
* Additional task-management workflows created solely to support a Discipline mechanic

The normal interaction remains:

```text
View → Perform → Complete
````

Discipline mechanics should resolve around that interaction automatically wherever possible.

---

## 1. System Framework

| Layer           | Function                                            |
| :-------------- | :-------------------------------------------------- |
| **Core**        | Real-world action through Tasks and Practice        |
| **Identity**    | Long-horizon development through The Mark           |
| **Progression** | Discipline Experience, Levels, and Mastery          |
| **Economy**     | Spendable Credits and personal Rewards              |
| **Balancing**   | Restoration and recovery mechanics                  |
| **Social**      | Shared household responsibility and optional Claims |
| **Events**      | External reality surfaced when relevant             |
| **Encounters**  | Optional Aevumory-generated temporary opportunities |

---

## 2. Domains & Disciplines

| Domain      | Disciplines                  | Core Impulse                                      |
| :---------- | :--------------------------- | :------------------------------------------------ |
| **Kinetic** | Force · Motion · Precision   | Physical effort, momentum, and persistent cadence |
| **Erudite** | Inquiry · Reason · Synthesis | Discovery, reasoning, and integration             |
| **Form**    | Making · Composition · Craft | Creation, flow, and refinement                    |
| **Keeping** | Care · Order · Renewal       | Response, maintenance, and recovery               |

### Core Discipline Verbs

* **Inquiry** discovers
* **Reason** resolves
* **Synthesis** connects
* **Motion** carries
* **Force** recovers
* **Precision** persists
* **Making** creates
* **Composition** composes
* **Craft** refines
* **Care** relieves
* **Order** maintains
* **Renewal** restores

---

## 3. Mastery Principles

* Mastery is permanent
* Mastery removes artificial boundaries rather than merely increasing numbers
* Mastery should broaden what a Discipline can recognize, permit, or interpret
* Mastery should not require additional user workflow unless the underlying real-world activity itself requires it
* Mastery effects may modify Experience, Credits, recovery, timing, recognition, or exceptional outcomes according to the Discipline's native expression
* A mastered Discipline must remain useful after Mastery; mastering it should not make continued practice obsolete

---

## 4. Mastery Matrix

### Erudite

#### Inquiry — Contextual Discovery

**Status:** Deferred

Inquiry should eventually allow Aevumory to surface something genuinely useful that was not previously obvious.

The original private/individual hidden-task concept is intentionally rejected for the current shared-screen model.

Inquiry mastery should not be artificially restricted to a Domain.

A future implementation must not require personal screen identity merely to make Inquiry useful.

#### Reason — Deductive Pruning

**Mastery capability:** Recognizes legitimate investigation that establishes a task is unnecessary.

Possible resolution:

* Link to another task or event that made the task unnecessary
* Select a reason such as `condition_no_longer_exists`, `physical_environment_changed`, or `requirement_fulfilled_externally`
* Add an optional short note

Reason XP derives from the underlying task's burden rather than being a fixed universal amount.

Pruning produces Reason Experience for the investigation, but no Experience/Credits for work that was not performed.

Administrative reversal is represented by a compensating transaction rather than mutation of the original reward transaction.

#### Synthesis — Omnipresent Yield

Mastery removes the single-secondary limit.

Any legitimately attributed `secondary_disciplines` may receive secondary Experience without diluting primary Experience.

Synthesis does not invent secondary attribution; it recognizes only what is already present in task definition.

---

### Kinetic

#### Motion — Cluster Unification

Mastery recognizes qualifying Kinetic tasks completed within a rolling activity window, initially around 90 minutes, as a continuous physical bout.

The underlying tasks remain independent.

No limit exists on how many physical tasks may be performed or recognized.

The special Motion bonus is capped independently from physical activity itself.

Initial target:

* `+20%` Experience
* `+5%` Credits

Both use additive modifiers against their respective base economies.

#### Force — Exertion Offset

Mastery recognizes substantial physical exertion as a legitimate reason to reduce ordinary daily expectations and protect recovery.

Force does not fabricate Practice for work not performed.

The outcome is recovery flexibility, not artificial Experience.

#### Precision — Cadence Elasticity

Mastery expands acceptable execution windows around recurring tasks without mutating target dates or recurrence anchors.

Precision changes the valid execution window, not the underlying schedule.

---

### Form

#### Making — Exceptional Practice

Mastery enables exceptional-outcome probability for qualifying Form tasks.

Making governs the probability that a completed qualifying Form task produces an exceptional result.

#### Craft — Material Refinement

Craft governs the magnitude of exceptional outcomes after the Making probability check succeeds.

Craft does not inflate ordinary task Experience.

#### Composition — Deferred

Composition remains intentionally unresolved.

No task-chain, project graph, node tree, or additional workflow should be introduced solely to make Composition Mastery function.

A future Composition mechanic must emerge from ordinary task completion rather than requiring users to construct and maintain a second organizational system.

---

### Keeping

#### Care — Relief

Mastery recognizes responsive household intervention when:

* a task is created ad hoc after the day begins
* another participant performs it
* it is completed the same day
* the Care Relief cooldown is available

The normal task reward remains governed by responsibility.

Relief is an additional Care recognition, not a transfer of ordinary task reward.

#### Order — Maintenance Resonance

Mastery recognizes sustained maintenance as a valuable household practice.

A maintenance relationship can connect smaller upkeep tasks to a larger reset task.

Maintenance generates its own ordinary Practice/Credit rewards plus Order-specific recognition.

The major task remains on its normal schedule and receives its full ordinary reward when eventually completed.

Order does not suppress or rewrite the major task's recurrence merely because maintenance has been consistent.

#### Renewal — Fresh Start

Mastery converts earned recovery into a temporary improvement in exceptional-outcome probability on the next eligible Practice action.

Rest does not directly award Experience.

---

## 5. Shared Household Model

The primary display is a communal board.

A typical layout may expose:

```text
MOM | DAD | JIMMY | SUSIE | HOUSE
```

Tasks are visible to household members according to board scope.

The household does not require a continuously authenticated active user merely to view or interact with the board.

Tasks assigned to an individual reward that individual when completed.

Tasks in the household pool may be:

* completed without personal attribution, or
* moved onto an individual's card before completion so that responsibility and reward become personal

Moving a task between cards is an ordinary responsibility change, not a special game mechanic.

---

## 6. Reward Attribution

The participant assigned responsibility for a task receives the ordinary Experience and Credits when the task is completed.

A different household member may physically perform the work. This does not automatically transfer the task's ordinary reward.

This is intentional: household responsibility and physical execution are related but not identical concepts.

Conditional mastery effects such as Care Relief are evaluated separately.

Historical reward transactions are immutable.

Corrections use compensating transactions.

---

## 7. Core Interaction Rule

The default experience remains:

```text
See task
  ↓
Do task
  ↓
Check complete
```

The participant should not have to understand or operate the underlying progression engine.

Mechanics such as Momentum, Synthesis, Making, Craft, Renewal, and Order should resolve automatically around ordinary completion.

Intentional exceptions include:

* **Foothold**
* **Deductive Pruning**

Any future mechanic requiring substantial additional interaction must justify that interaction as a real-world activity the participant already needs to manage.
