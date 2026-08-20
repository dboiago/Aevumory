# Task Lifecycle & State Machine Specification

## 1. Task Lifecycle State Machine

A task transitions through discrete states rather than tracking numeric progress percentages or slider bars.

```
       ┌──────────┐
       │  Active  │
       └────┬─────┘
            │
            ├─────────────────────────────────┐
            │ (User establishes Foothold)     │ (User completes directly)
            ▼                                 ▼
┌───────────────────────┐            ┌─────────────────┐
│ Foothold Established  ├───────────►│    Completed    │
└───────────────────────┘            └─────────────────┘
```

### State Definitions

* **Active (`active`):** The default initial state of a task on the HUD checklist view.
* **Foothold Established (`foothold_established`):** The state entered when a participant logs a Foothold on a task supporting point-of-entry (`supports_foothold === true`).
* **Completed (`completed`):** The final resolved state of the task instance.

---

## 2. Reason Foothold Rules & Anti-Exploit Guardrails

1. **Point of Entry:** For intimidating or mentally dense tasks (`cognitive_load: 'high'`), establishing a Foothold gives a safe, bite-sized entry point without requiring full project completion.
2. **Initiation Credit:** Establishing a Foothold awards a fixed initiation Practice yield immediately upon the first transition (`active` -> `foothold_established`).
3. **Single-Initiation Anti-Exploit Rule:** A task instance can yield exactly one Foothold initiation reward per active lifecycle. Subsequent days spent engaging an active task in the `foothold_established` state continue to count toward daily Continuity requirements, but cannot repeatedly generate initiation Practice yield.
4. **Zero-Penalty Rollover:** An active task, whether `active` or `foothold_established`, rolls over to subsequent days cleanly without penalty. There are no red flags, overdue badges, broken continuity, or accumulated negative friction tags.

---

## 3. Temporal Scheduling, Delay Policy & Care (Grace)

* **Descriptive Timing Flag (`has_strict_window`):** Tasks may declare that they normally have a meaningful execution window. The Task schema itself contains no calendar/time calculation.
* **Delay Policy:** Each task may declare `delay_policy: 'none' | 'bounded' | 'flexible'`.
  * `none`: The task should remain within its intended schedule. Progression mechanics must not grant additional delay beyond the task's real-world constraints
  * `bounded`: The task may move outside its nominal schedule only within an administrator-defined safe bound
  * `flexible`: The task may be deferred without a fixed delay bound
* **Safety Boundary:** `delay_policy` is descriptive scheduling metadata. It does not create overdue, failed, late, or punitive states.
* **Schedule Engine Evaluation:** An external Temporal / Schedule Engine determines whether the current execution timestamp falls inside a task's defined routine window and applies the task's delay policy where relevant.
* **Care / Grace:** When a participant's Care practice activates Grace, the Practice Engine can bypass ordinary timing restrictions where the task is otherwise safe to perform. Grace does not redefine a `none` delay policy as safely delayable and does not manufacture lateness metrics.

---

## 4. Recovery Windows & Rest Intervals

* **Force (Physical Recovery Interval):** Completing a heavy physical task (`effort_type: 'physical'` + `duration_tier: 'heavy'`) awards a banked physical rest day, preserving Continuity if a kinetic practice day is skipped.
* **Renewal (Mental Recovery Window):** Completing a qualifying Renewal task triggers an active `Recovery Window` for a configured duration (`recovery_window_hours`), applying a cost reduction (`reward_cost_reduction`) to personal leisure reward redemptions.
* **Renewal Mastery / Fresh Start:** Renewal Mastery may improve the probability of an exceptional outcome on the next eligible task after an earned Recovery Window. It does not award XP merely for resting.

---

## 5. Universal Pause

**Pause** is a system-level state available to every participant regardless of Discipline, level, or Mastery.

Pause is intended for vacations, emergencies, illness, major schedule disruptions, or simply periods when household practice should stop. While active:

* Continuity protections remain in effect
* Tasks do not accumulate punitive state or negative modifiers
* No Discipline prerequisite is required
* Leaving Pause resumes ordinary task operation without a catch-up requirement

Pause is not a reward and cannot be unlocked, purchased, or earned.
