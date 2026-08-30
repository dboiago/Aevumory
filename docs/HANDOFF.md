# Aevumory Project Handoff

## Purpose

This document is the current working handoff for continuing Aevumory development in a new conversation/project. It records the decisions that matter most so the next phase can move toward the actual application rather than reopening already-settled theory.

---

## 1. Product in One Sentence

Aevumory is a persistent, ambient household presence combining a full-screen **Event Horizon** ambient display with a shared household task/reward system designed to make real-world responsibilities easier to see, more engaging, and more rewarding, especially for children.

The two founding experiences are equally important:

1. **Event Horizon:** the ambient, picture-frame-like default screen
2. **Household Task Board:** the interactive chore/responsibility system revealed after the screen is unlocked

Neither is a secondary feature of the other.

---

## 2. Product Philosophy

Aevumory uses game mechanics, not a game world.

It must remain grounded in real life. Mechanics exist to support participation, motivation, discovery, flexibility, and delight rather than to manufacture engagement.

Core principles:

* The normal task interaction is `view → perform → complete`
* Additional workflow should not be invented solely to support a game mechanic
* Mastery should remove artificial boundaries rather than introduce them
* The system should become more sophisticated internally as participants become more experienced while remaining just as simple to use
* Rewards should recognize real effort and responsibility without creating runaway numerical inflation
* No mandatory streak behavior
* No punitive failure states
* No gacha, loot, artificial scarcity, or engagement-maximizing loops
* Pause is universal and neutral
* The household display is shared and does not assume a continuously authenticated active participant
* Task responsibility and physical execution are intentionally distinct
* The participant whose card owns a task receives its ordinary reward, even if another household member physically performs it
* Household members may create legitimate tasks
* Admins retain authority to edit, revoke, assign, or correct tasks and reward values

---

## 3. Current Product Structure

### Event Horizon

The Event Horizon is the default full-screen ambient state and functions like a sophisticated screensaver or picture frame.

The background may use:

* User-uploaded images
* Getty or other photo integrations where practical
* Google Photos or iCloud Photos where practical
* Other household-selected photo sources

Events sit on top of the imagery rather than replacing it with a conventional calendar view.

The event treatment is literal **event horizon** behavior:

* Events sufficiently far in the future begin subtly
* They appear toward the edges/background rather than constantly occupying the center of the image
* They gradually come into focus or become more visually present as their date approaches
* On or near the event date, an event can occupy a more useful location, likely within the lower third or another compositionally safe area
* The treatment should feel natural and useful, not like a gimmick
* Events should not permanently ruin the photograph by creating a central pile of cards/text

The exact spatial/animation model remains open. A scattered field, arc, or other mechanism has not been locked.

The Event Horizon should surface exceptions rather than become a conventional calendar dashboard.

### Calendar

A functional calendar is expected to exist in the application, but it is not the primary focus.

The calendar is intentionally oriented toward meaningful exceptions and future events rather than routine household repetition.

Examples:

* BJJ tournament in two months
* Dentist appointment in four months
* Friend visiting in two weeks

Routine chores should not visually litter the Event Horizon.

The calendar may support richer structures than a basic task list. The product can eventually exploit this because Aevumory has a real calendar model rather than pretending every household activity is a simple task.

The user has an existing open-source Skylight Calendar implementation/reference that may be useful as a baseline when development reaches this area. It is acceptable to reuse useful code or architectural elements where licensing and technical fit permit.

### Household Task Board

Unlocking the ambient screen reveals the interactive household area through tabs, a flyout, or a similar navigation model.

The task board is separate from Event Horizon and calendar presentation.

The board is conceptually similar to a Planner/Trello-style shared board:

```text
[MOM] [DAD] [JIMMY] [SUSIE] [HOUSE]
 T1     T1      T1      T1      T1
 T2     T2      T2      T2      T1
 T3             T3
                        T4
```

Everyone can see the relevant tasks.

There is no need for a special sign-in state merely to establish who is standing at the device.

A task in a participant's card belongs to that participant for reward purposes.

A task may be dragged from one card to another to change responsibility. This is an ordinary household operation, not a game mechanic.

A household bucket may contain communal tasks. The current preferred model is that a communal task can be dragged onto a participant's card; the participant who owns the card then receives the reward when it is completed.

This makes special altruistic-completion mechanics unnecessary for ordinary cross-household task completion.

---

## 4. Rewards and Currency

### Experience

Experience measures permanent personal history and skill development.

Base XP is anchored approximately to qualifying focused real-world effort:

```text
1 Base XP ≈ 1 minute
```

Discipline mechanics may modify final Experience, but the historical anchor must remain recognizable.

Cumulative progression follows:

```text
XP(L) = 100 × L²
```

Level 10 at 10,000 cumulative XP constitutes Mastery.

Mastery is permanent.

Post-Mastery Experience never caps, decays, or gets consumed.

### Credits

Credits are discretionary household reward capacity, not a real-world MSRP representation.

Base Credit derivation:

```text
10 minutes of qualifying Practice = 1.0 Base Credit
```

Fractional Credits are retained to one decimal place by default:

```text
5 minutes  = 0.5 Credits
17 minutes = 1.7 Credits
```

Fractional values are acceptable and may even provide an intuitive real-world connection to money/fractions for children.

The Admin decides what a reward costs based on household judgment and norms. Credits do not represent a universal dollar value.

Reward prices can be repriced without changing accumulated balances.

Credits are created only by authorized Reward Transactions. They are not generated passively by time, account status, task ownership, or reward availability.

### Household Reward Buckets

A household bucket can accept voluntary, irreversible transfers from individual Credit ledgers toward collective goals.

Large goals may optionally display a financial anchor such as:

```text
1 Credit = $0.50 toward this goal
```

The anchor is informational. It does not turn Aevumory into accounting software or change internal Credit mechanics.

The concept exists because fictional currency can otherwise become disconnected from large household goals such as a trip. The actual implementation and usefulness of financial anchors remains a future product/design question.

There are **no taxes** in the reward economy.

---

## 5. Progression and Disciplines

There are four domains and twelve Disciplines:

| Domain | Disciplines |
| --- | --- |
| Kinetic | Force, Motion, Precision |
| Erudite | Inquiry, Reason, Synthesis |
| Form | Making, Composition, Craft |
| Keeping | Care, Order, Renewal |

### Motion

Motion recognizes qualifying Kinetic task completions occurring within an approximately 90-minute rolling activity window as a continuous physical bout.

The window allows reasonable gaps such as travel, meals, changing activities, or transitions.

There is **no task-count cap**.

The limiter applies only to the special Motion bonus.

Initial targets:

```text
+20% Experience
+5% Credits
```

These remain additive and subject to the applicable 24-hour modifier ceilings.

### Reason

Reason is Deductive Pruning.

It recognizes legitimate investigation establishing that an existing task is unnecessary.

A pruning action may reference another task or event or use an optional write-in reason.

Reason yield derives from the burden of the avoided task rather than a universal fixed amount.

The underlying physical task does not award normal completion XP/Credits because it did not occur.

Pruning is auditable.

If an Admin reverses it:

1. The original RewardTransaction remains immutable
2. A compensating transaction removes the inappropriate XP/Credits
3. The pruning resolution is reversed
4. The task cycle becomes available for legitimate completion
5. A later legitimate completion receives its own reward

This is an audit/reversal mechanism, not an approval workflow.

### Inquiry

Inquiry is proactive household awareness.

Task creation is available to everyone. Inquiry does not grant exclusive authority to create, assign, or hide tasks.

The current mastered expression is recognizing and surfacing legitimate future work, particularly work with a meaningful planning horizon such as a week or more.

The Inquiry-related benefit is tied to the created task subsequently being completed. Merely creating arbitrary tasks must not mint the reward.

Inquiry does not depend on private hidden tasks or authenticated personal interaction state.

Inquiry must not duplicate Reason:

* Reason establishes why an existing task is no longer necessary
* Inquiry identifies useful work that was not already represented as an active task

### Synthesis

Synthesis recognizes legitimate secondary Disciplines attributed to a task.

Mastery removes the artificial single-secondary limitation and permits all legitimately attributed secondary Disciplines to receive secondary Experience.

Synthesis does not require task grouping, project graphs, or additional workflow.

### Making / Craft / Renewal

Exceptional Outcomes are grounded in unusually successful real-world execution.

Making governs exceptional probability.

Craft governs exceptional magnitude and primarily affects Credits.

Renewal can temporarily improve exceptional probability after earned recovery.

Exceptional outcomes must remain modest and realistic, not critical-hit-style multipliers.

There is one exceptional roll per eligible task.

Synthesis does not create independent exceptional rolls.

Exceptional feedback should be visible at completion through a restrained variation of the normal yield animation, not fireworks, sounds, confetti, or blocking UI.

### Composition

Composition is Completion Continuity.

It does not group tasks, build projects, or create chains.

At the end of each local calendar day, the system evaluates the participant's Completed Day percentage.

Initial threshold:

```text
75% of qualifying expected obligations resolved
```

Ad-hoc/emergency/transient tasks do not increase the denominator but may contribute to the numerator.

A zero-work day is neutral. Nothing is gained and nothing is lost.

The initial conceptual Continuity progression is every three qualifying active days, producing a bounded Credit modifier:

```text
Level 1 → +1.0%
Level 2 → +2.5%
Level 3 → +4.5%
Level 4 → +6.5%
Level 5 → +8.0%
Level 6 → +10.0%
```

These are provisional tuning values.

Developing decay begins after three consecutive non-qualifying active days and then decreases one level per subsequent non-qualifying active day.

Mastery extends the grace period and slows decay rather than making Continuity immune.

Continuity is not called a streak and must not create pressure to perform arbitrary tasks solely to preserve a number.

### Care

Care currently recognizes a limited same-day response to another participant's immediate need or unexpected household circumstance.

The ordinary task reward remains governed by task responsibility.

Future cross-Discipline interactions may emerge from task movement, but the current Care mechanic should not be expanded unnecessarily.

### Order

Order recognizes sustained maintenance around larger household upkeep.

Maintenance relationships connect upkeep tasks to larger reset tasks for reward interpretation only.

The major task is never suppressed, rewritten, or reduced because maintenance occurred.

The maintenance task receives its ordinary reward, and the major task receives its full ordinary reward when actually completed.

### Force

Force recognizes legitimate recovery following substantial physical effort.

It should reduce artificial pressure rather than manufacture Experience or Credits for work that did not occur.

### Precision

Precision widens permissible execution windows around recurring cadence targets without mutating `cycle_id`, `target_date`, `series_anchor_date`, or calendar anchors.

---

## 6. Daily Practice Resolution

Daily Practice Resolution belongs to the task's original `target_date` for purposes of completed-day recognition.

An event may appear on one date and remain impossible to complete until a later date. The calendar/task model must therefore distinguish the target date from the actual completion moment.

Example:

```text
Soccer tournament
21-08-2026 → 22-08-2026

Appears to the household on 21-08-2026
Cannot be resolved until 22-08-2026
```

The precise resolution rules remain an implementation area, but the important baseline is that the original target date is the schedule identity used for daily responsibility accounting.

End-of-day resolution uses local household time, at the local calendar boundary around 23:59/00:00.

### Pause

Pause means the day effectively does not exist for progression purposes.

Nothing is gained.

Nothing is lost.

Existing progression state remains exactly as it was.

The assumption is that a paused household is not actively using the device for the task/game experience.

---

## 7. Shared-Screen Identity Model

The household does not require an authenticated active participant merely to use the wall display.

This is fundamental to the design of Inquiry and shared responsibility.

The system knows which participant owns a task because the task is placed on that participant's card. It does not necessarily know who physically touched the screen.

That is acceptable.

The person who owns the task receives its ordinary reward.

A different person physically completing the task does not automatically transfer the reward.

---

## 8. The Mark Decision

### Current decision: DROP FROM V1

The procedural **Mark** system is explicitly out of current product scope.

The concept was explored extensively, including:

* User-selected seed objects
* Domain-specific visual vocabularies
* Procedural composition
* Milestone-driven additions
* Constellation-like structures
* Morphology and material evolution
* Domain combinations

The concept remains aesthetically interesting, but no sufficiently low-cost implementation has been found that is both genuinely attractive and practical for a solo developer.

The application itself is more important than a visual progression system, and continued Mark development was delaying core product work.

Do not reopen the Mark as an implementation task unless there is a strong new reason.

### What is retained

People can become attached to a persistent representation of themselves. That underlying insight remains useful.

Future alternatives may include:

* User-selected photographs/images
* A simple persistent avatar/image
* Subtle borders or framing
* Small visual flourishes
* Other lightweight treatments tied to progression

These should be evaluated only after the core application exists.

No current Discipline, reward, or progression mechanic may depend on the Mark.

---

## 9. Current Scope Priority

The project should now move toward the actual application.

Recommended priority:

1. Establish the application shell and device interaction model
2. Build the Event Horizon ambient screen
3. Build the shared household task board
4. Establish task creation, assignment, movement, and completion
5. Implement the reward/ledger foundation
6. Implement calendar/event data structures needed by Event Horizon
7. Implement progression mechanics incrementally
8. Add integrations such as photo sources and smart-home devices where they materially improve the core experience
9. Return to secondary visual identity ideas only if the finished product demonstrates a real need for them

The Mark is not on the critical path.

---

## 10. Development Philosophy for the Next Phase

Avoid spending another extended design cycle inventing mechanics without testing them in the actual application.

When a mechanic is conceptually interesting but requires:

* new task structures
* new user states
* extensive visual asset creation
* complex procedural generation
* additional interaction workflows
* artificial numerical escalation

prefer to simplify or defer it unless the real-world benefit is obvious.

The product's strongest ideas are already sufficient:

```text
Ambient household presence
        +
Event Horizon
        +
Shared chore/responsibility board
        +
Grounded rewards
        +
Meaningful progression
```

The next phase should make those ideas real.
