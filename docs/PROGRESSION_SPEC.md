# Progression & Engine Specification

## 1. Experience Anchor

`1 Base XP ≈ 1 minute` of qualifying focused real-world effort before Discipline modifiers, Flow, Synthesis, or exceptional outcomes.

The anchor applies to Base XP only. Final earned XP may exceed raw elapsed effort because of deliberate Discipline mechanics.

Experience and Credits remain separate economies even when both are awarded from the same task.

---

## 2. Progression Curve

Cumulative XP follows:

```text
XP(L) = 100 × L²
````

| Level |     XP | State      |
| ----: | -----: | ---------- |
|     1 |      0 | Developing |
|     2 |    400 | Developing |
|     3 |    900 | Developing |
|     4 |  1,600 | Developing |
|     5 |  2,500 | Developing |
|     6 |  3,600 | Developing |
|     7 |  4,900 | Developing |
|     8 |  6,400 | Developing |
|     9 |  8,100 | Developing |
|    10 | 10,000 | Mastered   |

Level is derived from cumulative Experience and is never stored as mutable progression state.

Mastery is permanent.

Experience continues accumulating indefinitely after Level 10.

---

## 3. Post-Mastery Experience

Post-Mastery Experience:

* Never caps
* Never decays
* Is never consumed for maintenance
* Contributes to The Mark's long-horizon historical weight
* Satisfies the Experience prerequisite for Hybrid eligibility

Post-Mastery Experience does not create an obligation to continue practicing.

---

## 4. Modifier Architecture

Modifiers are evaluated by type rather than flattened into one global multiplier.

### Base Yield Modifiers

These operate before exceptional-outcome resolution.

Examples:

* Motion Cluster
* Composition Flow
* Clear Slate or other ordinary additive Experience effects

### Exceptional Probability Modifiers

These modify `P`, the probability of an exceptional outcome.

Examples:

* Making
* Renewal Fresh Start

### Exceptional Magnitude Modifiers

These modify `M`, the magnitude of an exceptional outcome after the probability check succeeds.

Example:

* Craft

### Secondary Yield Allocation

Synthesis determines additional Discipline Experience after the primary result is resolved.

### Credit Modifiers

Credit modifiers remain independent from Experience modifiers.

---

## 5. Modifier Caps

Initial target ceilings:

* **Experience bonus modifiers:** maximum `+50%` of Base XP within the applicable 24-hour recognition window
* **Credit bonus modifiers:** initial target maximum `+15%` of Base Credits within the applicable 24-hour recognition window

The ceilings apply to their respective modifier classes.

Exceptional probability and exceptional magnitude are not treated as ordinary additive yield bonuses and are not automatically folded into the same cap.

All numerical values remain tunable configuration rather than fixed product-law until implementation tuning begins.

---

## 6. Motion Cluster Recognition

Motion Mastery recognizes qualifying Kinetic task completions occurring within an approximately 90-minute rolling activity window as a continuous bout.

The system does not cap the number of physical tasks performed.

The recognition limiter applies only to the special Motion bonus.

Initial target:

```text
Motion Experience Bonus: +20%
Motion Credit Bonus: +5%
```

The cluster does not alter the underlying task records or merge them into a new user-facing task.

---

## 7. Making / Craft / Renewal Outcome Model

Exceptional outcome flow:

```text
Base XP
    ↓
Additive Experience Modifiers
    ↓
Exceptional Probability P
    ↓
Exceptional Magnitude M
    ↓
Synthesis Split
```

### Making

Making determines whether an exceptional outcome may occur.

### Craft

Craft determines the magnitude multiplier when an exceptional outcome occurs.

### Renewal

Fresh Start temporarily increases exceptional probability `P` for the next eligible Practice action after earned recovery.

Renewal does not award XP simply because a Recovery Window was used.

---

## 8. Synthesis

Developing Synthesis can recognize a limited number of legitimate secondary Disciplines.

Synthesis Mastery removes the artificial single-secondary limitation and allows all legitimately attributed `secondary_disciplines` to receive secondary Experience.

Secondary attribution must be explicit in task definition.

---

## 9. Reason: Deductive Pruning

A valid Deductive Pruning action represents real investigative work that establishes that the task is unnecessary.

Reason Experience is derived from the burden of the task being avoided, not from a universal fixed reward.

The underlying task does not generate normal completion XP or Credits because the physical work did not occur.

Possible causal evidence:

* Another task completed the requirement
* An external event satisfied the requirement
* The physical condition no longer exists
* Investigation established the task is redundant

Pruning is auditable.

If an admin rejects a pruning result:

1. The original RewardTransaction remains immutable
2. A compensating transaction reverses the inappropriate reward
3. The task cycle is reopened
4. A later legitimate completion may produce a new reward transaction

This prevents duplicate reward farming.

---

## 10. Force

Force mastery recognizes legitimate recovery following substantial physical effort.

The engine may protect Continuity or reduce ordinary daily practice expectations after qualifying exertion.

Force does not create XP or Credits for tasks the participant did not perform.

---

## 11. Precision

Precision mastery widens permissible execution windows around recurring cadence targets.

Precision never mutates:

* `cycle_id`
* `target_date`
* `series_anchor_date`
* calendar anchors

Only the resolved execution window changes.

---

## 12. Care

Care Relief is a conditional mastery award, not a replacement for ordinary task reward.

Initial qualification:

1. `source_type === 'ad_hoc'`
2. task created after active-day boundary
3. completed same calendar day
4. performer is acting on another participant's responsibility
5. Care Relief cooldown is available

The underlying task remains rewarded according to assignment/responsibility.

---

## 13. Order

Order Mastery recognizes the sustained value of routine maintenance.

Maintenance relationships connect upkeep tasks with larger reset tasks for reward interpretation only.

Consistent maintenance does not:

* suppress major-task cycles
* rewrite recurrence
* alter delay policy
* fabricate completion
* reduce the future major-task reward

The major task receives its full ordinary reward when actually completed.

---

## 14. Inquiry

Inquiry Mastery is intentionally unresolved.

The previous design relied on personal hidden tasks and private interaction state. The current shared household display does not assume an authenticated active participant.

A future Inquiry capability must emerge from useful household-context discovery without introducing personal hidden-task infrastructure solely for the purpose of the mechanic.

---

## 15. Composition

Composition Mastery is intentionally deferred.

No additional task-chain, project graph, grouping workflow, or user-managed composition structure should be introduced solely to implement the current theory.

A future implementation must preserve the default `view → perform → complete` interaction model.
