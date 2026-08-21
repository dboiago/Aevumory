# Task Lifecycle & State Machine Specification

## 1. Task Lifecycle Architecture

Aevumory separates task definition, recurrence occurrence, execution, and economic attribution.

```text
Task Definition
      ↓
TaskCycle
      ↓
ExecutionEvent
      ↓
RewardTransaction
      ↓
The Mark
````

Execution state and runtime availability are separate concerns.

### Execution State

```text
active
   ↓
foothold_established
   ↓
completed
```

```ts
type UserTaskState =
  | 'active'
  | 'foothold_established'
  | 'completed';
```

No generic progress states, partial-completion percentages, or project workflow states are permitted.

### Lifecycle Disposition

```ts
type LifecycleDisposition =
  | 'active'
  | 'archived'
  | 'expired_quietly';
```

Lifecycle disposition never implies participant failure.

---

## 2. Foothold

1. A task must explicitly support Foothold through `supports_foothold === true`
2. Establishing a Foothold creates the `foothold_established` state
3. A task instance may receive exactly one initiation reward during its active lifecycle
4. Additional days of work while the Foothold remains active do not repeatedly generate initiation rewards
5. A Foothold never represents partial task completion
6. A Foothold task rolls forward without overdue, failure, decay, or negative friction states

---

## 3. Scheduling & Recurrence

`SchedulePolicy` defines the authoritative recurrence model.

### Cadence Types

```ts
type CadenceType =
  | 'one_off'
  | 'interval'
  | 'calendar_anchor';
```

### Interval

For interval schedules:

```text
target_n =
  series_anchor_date + (n × interval_days)
```

Completion never changes the series anchor.

Precision may widen the execution window around a target but never changes `cycle_id` or `target_date`.

### Calendar Anchor

Calendar-based recurrence resolves against the configured week/month anchor.

Precision may permit reasonable variance around that anchor, but the underlying calendar anchor remains unchanged.

### Delay Policy

```ts
type DelayPolicy =
  | 'none'
  | 'bounded'
  | 'flexible';
```

* `none`: progression mechanics must not intentionally defer the task
* `bounded`: the task may move only within an administrator-defined safe range
* `flexible`: the task may be deferred without a fixed delay bound

Delay policy is scheduling metadata, not a performance or failure metric.

---

## 4. Precision: Cadence Elasticity

Precision Mastery may expand a cycle's acceptable execution window.

Example:

```text
Target: Monday
Base window: Monday
Precision window: Sunday–Tuesday
```

The resulting `TaskCycle` records:

```ts
window_source: 'precision_elastic'
```

The original:

```ts
cycle_id
target_date
```

remain unchanged.

Precision never creates schedule drift.

---

## 5. Order: Maintenance Resonance

Order does not suppress, delay, or rewrite major task schedules.

A maintenance relationship exists only to recognize that ongoing smaller maintenance work contributes real value toward keeping a larger reset task manageable.

Example:

```text
"Tidy Basement"
        ↓
maintenance relationship
        ↓
"Clean Basement"
```

The maintenance task produces its ordinary Practice/Credit yield plus any qualified Order Mastery recognition.

When the larger task eventually occurs, it receives its full ordinary reward.

The engine does not attempt to inspect the physical environment and does not decide that the larger task is unnecessary based solely on maintenance history.

---

## 6. Reason: Deductive Pruning

Deductive Pruning is an alternative execution outcome, not a task deletion operation.

Valid examples:

* The condition no longer exists
* The requirement was satisfied externally
* The task is redundant because another completed action resolved it
* Investigation established that the work is unnecessary

### Execution Outcome

```ts
type ExecutionOutcomeType =
  | 'completed'
  | 'deductively_pruned';
```

Foothold and supersession remain separate engine states and are not represented by this type.

### Pruning

A participant may resolve a task through:

1. A causal link to another task/event
2. A reason code
3. An optional short note

The pruning action records an immutable audit entry.

If the pruning is later rejected by an admin, the historical reward is not edited. A compensating transaction reverses the original reward and the task cycle is reopened for ordinary completion.

A rejected pruning action must never allow the participant to retain its original reward and then earn the task reward again.

---

## 7. Motion: Cluster Unification

Motion Mastery recognizes a continuous bout of physical activity.

Qualifying activity is based on Kinetic task attribution, not task magnitude.

### Rolling Window

Qualifying Kinetic tasks completed within a configurable rolling activity window, initially expected to be around 90 minutes, may be recognized as one Momentum Block.

The window exists to tolerate ordinary transitions, meals, travel, and real-world interruption. It is not intended to require continuous stopwatch-level activity.

There is no hard cap on the number of physical tasks that may participate in a cluster.

### Recognition Limit

Any limiter applies only to the special Motion bonus, not to physical activity itself.

A participant may perform unlimited Kinetic activity. The engine may cap the amount of additional Motion recognition within the defined daily window.

### Planned Modifier

Initial design target:

* `+20%` Experience for qualifying Motion recognition
* `+5%` Credits for qualifying Motion recognition

These modifiers participate in their respective additive caps and remain tunable engine configuration.

---

## 8. Care: Relief

Care Mastery recognizes legitimate responsive household intervention.

A Relief award requires:

1. `source_type === 'ad_hoc'`
2. Task creation occurred after the active day boundary began
3. Completion occurs on the same calendar day
4. The performer is acting on a task belonging to another participant
5. The Care Relief cooldown is available

The ordinary task reward remains governed by responsibility/assignment.

Relief is an additional conditional Care recognition and does not create a separate task state.

---

## 9. Inquiry

Inquiry Mastery is currently unresolved.

The original hidden-personal-task concept depended on knowing which participant was interacting with a private display. The current household display is intentionally shared and does not require an authenticated active user.

Do not introduce personal hidden-task infrastructure solely to preserve this concept.

Inquiry should remain available for later redesign around genuinely useful household-context discovery.

---

## 10. Renewal

A qualifying Renewal task creates a Recovery Window according to the reward economy.

Renewal Mastery adds a temporary Fresh Start effect after earned recovery.

Fresh Start modifies the probability of an exceptional outcome on the next eligible Practice action.

Recovery itself does not generate Experience merely because the participant rested.

---

## 11. Universal Pause

Pause is universally available.

While paused:

* Continuity protections remain intact
* Tasks do not accumulate punitive states
* No Discipline level is required
* No catch-up work is generated on resume
* No Progression or Reward is generated merely by pausing

Pause is not a reward and cannot be earned or unlocked.
