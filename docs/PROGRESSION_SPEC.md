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
```

| Level | XP | State |
| ----: | --: | ---------- |
| 1 | 0 | Developing |
| 2 | 400 | Developing |
| 3 | 900 | Developing |
| 4 | 1,600 | Developing |
| 5 | 2,500 | Developing |
| 6 | 3,600 | Developing |
| 7 | 4,900 | Developing |
| 8 | 6,400 | Developing |
| 9 | 8,100 | Developing |
| 10 | 10,000 | Mastered |

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
* Other ordinary additive Experience or Credit effects

### Exceptional Probability Modifiers

These modify `P`, the probability of an exceptional outcome.

Examples:

* Making
* Renewal Fresh Start

### Exceptional Magnitude Modifiers

These modify the yield of an exceptional outcome after the probability check succeeds.

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

The window represents continuity of physical activity, not uninterrupted exertion. Reasonable gaps such as meals, travel, changing activities, or transitions do not automatically terminate recognition.

The system does not cap the number of physical tasks performed.

The recognition limiter applies only to the special Motion bonus. Additional qualifying work remains fully rewarded according to the underlying tasks.

Initial target:

```text
Motion Experience Bonus: +20%
Motion Credit Bonus: +5%
```

The Motion bonus is subject to the applicable 24-hour Experience and Credit modifier ceilings.

The cluster does not alter the underlying task records or merge them into a new user-facing task.

---

## 7. Exceptional Outcomes

Exceptional Outcomes represent unusually successful real-world execution.

They are progression mechanics rather than critical-hit mechanics. The purpose is to recognize that repeated practice, skill, recovery, and experience can occasionally produce an outcome meaningfully better than the ordinary baseline.

Exceptional outcomes must remain grounded in the underlying task. They do not create arbitrary large multipliers or introduce additional work for the participant.

### Eligibility

Form-class tasks are a natural initial source of Exceptional Outcomes because their results can have meaningful variation in quality, technique, or execution.

Exceptional eligibility is not permanently restricted to Form.

As progression and mastery develop, other task types may become eligible where the participant has demonstrated sufficient experience, repetition, or discipline to make an exceptional result plausible.

The exact progression path for expanding eligibility remains subject to further definition.

The eligibility system must not require a new user workflow. Existing task completion remains the interaction:

```text
View → Perform → Complete
```

### Exceptional Probability

Making determines the participant's ability to produce an exceptional outcome.

Renewal Fresh Start may temporarily increase exceptional probability for the next eligible Practice action after earned recovery.

Probability modifiers are additive and subject to a hard ceiling.

Initial target values remain configurable and should be tuned against realistic real-world frequency rather than game-like reward frequency.

### Exceptional Magnitude

Craft determines the magnitude of an exceptional result after the probability check succeeds.

Magnitude must remain grounded in realistic differences in outcome quality or household value.

The system should favor a modest bounded increase rather than large multipliers.

Initial magnitude values remain configuration rather than fixed product-law until real-world tuning is complete.

### Yield Distribution

Exceptional outcomes primarily affect Credits.

Credits represent discretionary household reward capacity and can therefore tolerate a more noticeable exceptional-result bonus without distorting the participant's historical Experience record.

Experience may receive a smaller bounded variance because real-world learning and focus are not perfectly uniform from one session to another.

Exceptional outcomes must not substantially distort the `Base XP ≈ 1 minute` historical anchor.

### Synthesis Interaction

A task receives one exceptional-outcome resolution.

Synthesis does not create independent exceptional rolls for secondary Disciplines.

The exceptional result is resolved against the task's total primary yield before secondary Experience attribution is performed.

### Modifier Interaction

Exceptional modifiers do not multiply one another into a stacking cascade.

Where multiple applicable modifiers affect the same exceptional result, their effects are resolved according to explicit additive rules and applicable caps.

Exceptional magnitude does not automatically count as an ordinary Experience or Credit modifier for the global daily modifier ceilings.

### Reward Transaction

An Exceptional Outcome is recorded as part of the completion's RewardTransaction.

It does not create:

* A second task
* A separate completion workflow
* A new user-managed object
* A second Practice action

The transaction records the exceptional result and the resulting yield for historical reconstruction.

### User Feedback

Exceptional Outcomes must be visible at the moment they occur.

Standard completion may display the normal earned XP and Credit values using the ordinary completion animation.

An exceptional completion uses the same interaction with a restrained visual distinction, such as:

* Slightly larger floating yield values
* A subtle growth or shimmer effect
* A brief accent treatment
* A distinct but non-intrusive settle animation

There should be no arcade-style sounds, fireworks, confetti, blocking dialogs, or separate confirmation workflow.

The result should feel noticeably different without turning ordinary household work into a game spectacle.

---

## 8. Making

Making mastery increases the participant's ability to produce Exceptional Outcomes.

Making primarily governs exceptional probability rather than exceptional magnitude.

Making does not independently increase the value of ordinary task completion.

The exact probability curve remains configurable and must remain subject to the Exceptional Outcome probability ceiling.

---

## 9. Craft

Craft mastery increases the magnitude of an Exceptional Outcome after the exceptional probability check succeeds.

Craft primarily affects Credits.

Any Experience increase associated with exceptional magnitude must remain smaller and bounded so that exceptional execution does not undermine the historical effort anchor.

Magnitude must remain within a grounded real-world range.

Large critical-hit-style multipliers are explicitly excluded.

---

## 10. Renewal

Renewal mastery represents the effect of earned recovery on subsequent performance.

Fresh Start does not award XP or Credits merely because a Recovery Window was used.

Instead, consuming an earned Renewal charge may increase the probability of an Exceptional Outcome on the next eligible Practice action.

The charge is consumed according to the Renewal execution rule regardless of whether the exceptional roll succeeds.

---

## 11. Synthesis

Developing Synthesis can recognize a limited number of legitimate secondary Disciplines.

Synthesis Mastery removes the artificial single-secondary limitation and allows all legitimately attributed `secondary_disciplines` to receive secondary Experience.

Secondary attribution must be explicit in task definition.

Synthesis does not require task grouping, project chains, additional completion steps, or user-managed composition structures.

---

## 12. Reason: Deductive Pruning

A valid Deductive Pruning action represents real investigative work that establishes that the task is unnecessary.

Reason Experience is derived from the burden of the task being avoided, not from a universal fixed reward.

A larger avoided task may therefore provide greater Reason yield than a trivial avoided task because successfully establishing that three hours of work are unnecessary creates substantially more opportunity for other activity.

The underlying task does not generate normal physical completion XP or Credits because the physical work did not occur.

Possible causal evidence:

* Another task completed the requirement
* An external event satisfied the requirement
* The physical condition no longer exists
* Investigation established the task is redundant

A pruning action may reference another task or provide an optional short write-in explanation.

Pruning must remain frictionless and optional within the normal completion interaction.

### Audit and Reversal

Pruning actions are recorded in the backend audit ledger with sufficient provenance to reconstruct:

* The pruned task
* The participant who performed the pruning
* The reason or linked task
* The resulting RewardTransaction
* Any subsequent administrative reversal

If an authorized admin rejects a pruning result:

1. The original RewardTransaction remains immutable
2. A compensating transaction removes the inappropriate XP and Credits
3. The pruning resolution is reversed
4. The task cycle becomes eligible for legitimate completion again
5. A later legitimate completion produces a new RewardTransaction

The participant does not retain the original reward after reversal.

This prevents a participant from receiving Reason rewards for pruning and then receiving the original task reward for subsequently performing the same work.

Administrative reversal is an audit correction, not a pending approval workflow.

---

## 13. Force

Force mastery recognizes legitimate recovery following substantial physical effort.

The engine may protect Continuity or reduce ordinary daily practice expectations after qualifying exertion.

Force does not create XP or Credits for tasks the participant did not perform.

Force should reduce artificial pressure following substantial physical activity rather than manufacture additional rewards.

---

## 14. Precision

Precision mastery widens permissible execution windows around recurring cadence targets.

Precision never mutates:

* `cycle_id`
* `target_date`
* `series_anchor_date`
* Calendar anchors

Only the resolved execution window changes.

Precision absorbs reasonable variance without creating schedule creep.

---

## 15. Care

Care Relief is a conditional mastery award recognizing an unexpected same-day response to another participant's immediate need or household circumstance.

Initial qualification:

1. `source_type === 'ad_hoc'`
2. Task created after the active-day boundary
3. Task completed on the same calendar day
4. Action responds to another participant's immediate need or unexpected household circumstance
5. Care Relief cooldown is available

Care Relief remains separate from ordinary task reward.

The underlying task is rewarded according to its assignment/responsibility model.

Future Care interactions may emerge from shared task movement and other cross-Discipline behavior, but these do not alter the current Relief mechanic.

---

## 16. Order

Order Mastery recognizes the sustained value of routine maintenance.

Maintenance relationships connect upkeep tasks with larger reset tasks for reward interpretation only.

Consistent maintenance does not:

* Suppress major-task cycles
* Rewrite recurrence
* Alter delay policy
* Fabricate completion
* Reduce the future major-task reward

The maintenance task continues to receive its normal reward.

When a related major task eventually occurs, it receives its full ordinary reward when actually completed.

The benefit of sustained upkeep is therefore expressed through:

* Ongoing maintenance rewards
* Order progression
* A better-maintained physical state
* Potentially faster or easier execution of the related major task in real life

The engine does not assume that it can directly evaluate the physical condition of the maintained object.

---

## 17. Inquiry: Household Stewardship

Inquiry is no longer modeled as a private discovery queue.

The shared household display does not assume an authenticated active participant, so Inquiry cannot depend on hidden personal tasks, private encounters, or participant-specific interaction state.

Inquiry instead represents the ability to notice and surface useful work before it becomes an immediate problem.

### Developing Inquiry

Task creation is a normal household capability. A participant may add legitimate tasks when they notice something that should be tracked.

Tasks may be placed into the household pool or assigned to an appropriate participant using the same visible board model used for ordinary responsibility.

Administration may retain the ability to revoke, edit, assign, or correct a task and its reward value.

### Inquiry Mastery

Inquiry Mastery grants greater engine-trusted stewardship over newly surfaced work.

A mastered participant may be permitted to:

* Surface legitimate future tasks without treating them as immediate ad-hoc problems
* Give a task an intentionally long planning horizon when the need is real but not urgent
* Place newly discovered work into the household pool
* Assign or suggest responsibility where the shared board makes that responsibility explicit

The capability is about recognizing and organizing latent household work, not about generating arbitrary additional chores.

Inquiry must not duplicate Reason's Deductive Pruning. Reason establishes why an existing task is no longer necessary. Inquiry identifies something that was not already represented as an active task.

Inquiry must also remain distinct from Care and Keeping. An unexpected immediate need belongs to those existing mechanisms; Inquiry concerns useful future awareness and household planning.

No private interaction state, hidden queue, special encounter screen, or additional workflow is required solely for Inquiry.

The exact authorization boundaries for mastered task stewardship remain implementation-tunable. The underlying principle is that demonstrated Inquiry credibility should expand the participant's ability to surface useful household information rather than merely increase a numerical reward.

---

## 18. Composition: Completion Continuity

Composition is not implemented as task grouping, project chaining, or synthesis of unrelated tasks.

The useful part of the original Composition concept is the recognition that a person can complete the day as a whole, even when the day's workload varies significantly.

Composition therefore explores a household-level continuity mechanic based on **completed-day proportion**, not raw task count.

### Completed Day

A day may qualify as completed when the participant completes a sufficient proportion of the tasks assigned to them for that day.

The threshold is intentionally percentage-based rather than count-based. For example, a qualifying threshold could treat all of these equivalently:

* 3 of 4 assigned tasks
* 1 of 1 assigned task
* 8 of 10 assigned tasks

The exact threshold remains configuration rather than product-law.

A day with no assigned tasks does not create additional progress merely because the calendar advanced. The continuity concept recognizes completed responsibility, not passive calendar streaking.

### Continuity Benefit

A sustained run of completed days may gradually improve the participant's **reward floor**, meaning the minimum ordinary reward expression for future completed work can rise slightly while continuity is maintained.

The intended effect is recognition rather than multiplication: someone who consistently handles their responsibilities receives a small persistent-feeling benefit because the system recognizes that reliability.

The benefit should be percentage-based rather than a flat amount so that it remains proportionate across small and large tasks. A percentage approach also avoids making many trivial tasks disproportionately valuable compared with fewer substantial tasks.

Exact percentages and the maximum floor increase remain deliberately unresolved for tuning.

### Decay and Mastery

Continuity is not treated as a conventional streak and carries no punitive failure state.

A developing participant may lose some or all accumulated continuity after a sufficiently long interruption, subject to the eventual configured decay window.

Mastery may preserve continuity for a longer recovery window after interruption rather than requiring an immediate restart. The current design direction is a longer mastery grace period, not immunity from decay.

The continuity mechanic must never create a requirement to perform arbitrary tasks solely to protect a number.

### Interaction Model

Composition does not require:

* Task chains
* Project graphs
* Grouped task objects
* Additional completion steps
* Manual composition setup
* A separate user-facing "streak" workflow

The participant continues using the normal:

```text
View → Perform → Complete
```

The engine derives the completed-day state from existing task and cycle data.

Composition therefore adds interpretation to existing household activity rather than adding work for the participant.

---

## 19. Mastery Design Principle

Mastery should remove artificial boundaries rather than introduce new ones.

A mastered Discipline represents demonstrated capability that can increasingly apply across real-world contexts.

Mastery mechanics should therefore:

* Use information the system already has whenever possible
* Avoid requiring additional user input
* Avoid creating parallel task-management systems
* Avoid hiding useful household information behind identity state
* Avoid inventing work merely to exercise a mastery mechanic
* Preserve the ordinary task interaction
* Increase the sophistication of engine interpretation without increasing the complexity of everyday use

The system should become more sophisticated internally as the participant becomes more experienced while remaining just as simple to use.
