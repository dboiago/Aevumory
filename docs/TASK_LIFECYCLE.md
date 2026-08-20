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

1. **Point of Entry:**
   For intimidating or mentally dense tasks (`cognitive_load: 'high'`), establishing a Foothold gives a safe, bite-sized entry point without requiring full project completion.
2. **Initiation Credit:**
   Establishing a Foothold awards a fixed initiation Practice yield immediately upon the first transition (`active` -> `foothold_established`).
3. **Single-Initiation Anti-Exploit Rule:**
   A task instance can yield **exactly one** Foothold initiation reward per active lifecycle. Subsequent days spent engaging an active task in the `foothold_established` state continue to count toward daily Continuity requirements, but **cannot** repeatedly generate initiation practice yield.
4. **Zero-Penalty Rollover:**
   An active task (whether in `active` or `foothold_established` state) rolls over to subsequent days cleanly without penalty:
   * No red flags or overdue badges.
   * No broken continuity loss.
   * No accumulated negative friction tags.

---

## 3. Temporal Decoupling & Care (Grace) Integration

* **Descriptive Flag (`has_strict_window`):**
  Tasks maintain a boolean `has_strict_window` flag. The `Task` schema itself contains no calendar/time logic.
* **Schedule Engine Evaluation:**
  An external Temporal / Schedule Engine determines if the current execution timestamp falls inside a task's defined routine window.
* **Care / Grace Override:**
  When a participant's Care practice activates **Grace**, the Practice Engine bypasses the Temporal Engine's window check whenever `has_strict_window === true`. Performing the care task at 8:00 AM or 8:00 PM is treated as equally valid.

---

## 4. Recovery Windows & Rest Intervals

* **Force (Physical Recovery Interval):**
  Completing a heavy physical task (`effort_type: 'physical'` + `duration_tier: 'heavy'`) awards a banked physical rest day, preserving Continuity if a kinetic practice day is skipped.
* **Renewal (Mental Recovery Window):**
  Completing a qualifying Renewal task triggers an active `Recovery Window` for a configured duration (`recovery_window_hours`), applying a cost reduction (`reward_cost_reduction`) to personal leisure reward redemptions.
