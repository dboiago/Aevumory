# Progression & Engine Specification

## 1. Execution Pipeline

When a task transitions state, the Practice Engine evaluates the following 8-stage pipeline in strict invariant order:

1. **Action Trigger & Event Validation:** State transitions from `active` -> `foothold_established` -> `completed`.
2. **Context Resolution:** Evaluates active Motion Momentum, Composition Flow Carryover, Care Grace, and Order state where applicable.
3. **Base Yield Generation:** Calculates uncoupled base quantities.
   * `1 Base XP ≈ 1 minute of focused practice` before modifiers
   * `Base Credit` is generated via a provisional credit formula
4. **Experience Calculation Sequence:**
   * `Base XP -> Additive Yield Modifiers -> Exceptional Roll (P) -> Craft Magnitude (M) -> Synthesis Split`
5. **Credit Deposit:** Final integer Credits are deposited directly into wallet balance and are not modified by Discipline XP multipliers.
6. **State Effects Execution:** Physical recovery intervals, Renewal Recovery Windows, Motion momentum, Composition flow, Care/Grace, and Order effects are evaluated according to their task and profile conditions.
7. **Level & Mastery Resolution:** Adds XP to primary/secondary Disciplines. Level is derived from cumulative XP. Level 10 at 10,000 XP sets the Discipline to `mastered`.
8. **Mark Mutation:** Records an immutable ledger entry including practice outcome, Credits, XP, and relevant state transitions.

## 2. Progression Math

Progression follows the polynomial curve:

`Cumulative XP Required(L) = 100 × L²`

| Level | Cumulative XP | State |
| :--- | ---: | :--- |
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

### Post-Mastery

Experience past 10,000 XP continues accumulating indefinitely without decay, maintenance drain, or consumption. It feeds **The Mark's** long-term historical weight and fulfills the Experience prerequisite for Hybrid eligibility.

## 3. Discipline Behavior and Mastery Directions

| Discipline | Current Core Behavior | Mastery Direction |
| :--- | :--- | :--- |
| **Inquiry** | Discovery surfaces hidden tasks, household information, contextual suggestions, or system secrets | Deductive discovery remains the focus. A qualifying realization that a planned activity is invalid or redundant may be recognized rather than forcing unnecessary work |
| **Reason** | Foothold recognizes the activation barrier of intimidating tasks without changing their binary completion state | Improve accommodation of task initiation and rollover without pretending to alter real-world cognitive difficulty |
| **Synthesis** | Secondary yield recognizes cross-discipline alignment, including same-domain combinations | **Omnipresent Yield:** remove the ordinary single-secondary cap so all valid backend-tagged secondary Disciplines can receive their yield without diluting primary XP |
| **Motion** | Daily Momentum rewards accumulated qualifying physical practice | **Cluster Unification:** recognize a cluster as an aggregated Momentum Block with an appropriately upscaled yield expression |
| **Force** | Substantial physical effort can bank a protected physical Recovery Interval | **Exertion Offset:** increase recognition of the legitimate recovery demand following substantial physical exertion |
| **Precision** | Long-term cadence and repeated showing up reinforce Continuity | **Cadence Elasticity:** widen safe execution windows around recurring routines without introducing lateness scoring |
| **Making** | Eligible Form work can trigger exceptional outcomes using probability `P` | Increase the chance of exceptional outcomes on eligible creation work |
| **Composition** | Creative work can create immediate Flow Carryover into the next task | **Under review:** the previous broad "well-rounded day" / Confluence direction is not currently adopted |
| **Craft** | Exceptional outcomes use magnitude multiplier `M` | Increase the ceiling of exceptional outcomes rather than passively multiplying ordinary tasks |
| **Care** | Grace removes unnecessary timing friction from eligible care practice | **Relief:** recognize a limited same-day response to another person's immediate need or an unexpected household circumstance, with a real-world cooldown and credit only for work actually performed |
| **Order** | Clear Slate recognizes resolution of the active daily list or configured threshold | **Maintenance Resonance:** reward sustained routine maintenance when it safely keeps a larger reset deferred. `delay_policy: 'none'` prevents unsafe deferral |
| **Renewal** | Major reset tasks can activate a Recovery Window that reduces eligible personal reward costs | **Fresh Start:** improve the probability of an exceptional outcome on the next eligible task after earned recovery, without awarding XP merely for resting |

## 4. Scheduling and Delay Policy

Tasks expose a descriptive `delay_policy`:

```ts
type DelayPolicy = 'none' | 'bounded' | 'flexible';
```

* `none`: the task should not be intentionally delayed by progression mechanics
* `bounded`: delay is permitted within an administrator-defined safe bound
* `flexible`: the task may be deferred without a fixed delay bound

Delay policy is a scheduling safety constraint, not a performance score. It must never produce overdue, failed, late, or punitive task states.

## 5. Universal Pause

Pause is a system-level continuity protection available to every participant regardless of Discipline, level, or Mastery. It covers vacations, emergencies, illness, and ordinary periods where household practice should stop.

Pause does not create catch-up obligations, consume progression, or require an earned resource. Resuming from Pause returns the household to ordinary operation.
