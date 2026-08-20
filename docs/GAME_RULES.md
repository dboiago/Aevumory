# Aevumory Core System Specification & Game Rules

## Overview & Philosophy
Aevumory is a grounded interaction and discipline system designed for shared household/individual checklists. It uses game mechanics to recognize real-world practice, motivation, discovery, and recovery without pretending that software changes physical reality or human effort. Mechanics should reward legitimate action, reduce obligation pressure, and remain non-punitive.

---

## The 4 Domains & 12 Disciplines

### Summary Architecture Matrix

| Domain | Discipline | Core Verb | Core Impulse (*Praxis*) | Fundamental Mechanism | Mastery Direction |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Erudite** (Mind) | **Inquiry** | Discover | *"What is there?"* | **Discovery:** Surfaces hidden tasks, household information, contextual suggestions, or system secrets directly onto the HUD. Discovery is the reward | **Under design:** current exploration is deductive discovery, including recognizing when work is invalid or redundant rather than performing unnecessary work |
| | **Reason** | Solve | *"How do I approach this?"* | **Foothold:** Qualifying tasks can expose an initiation state through `supports_foothold`, recognizing activation friction without changing binary task completion | **Foothold remains the core identity:** mastery should improve the system's accommodation of difficult task initiation, not claim to make the real-world task easier |
| | **Synthesis** | Connect | *"How does this connect?"* | **Cross-Discipline Yield:** Tasks may recognize more than one Discipline, including connections within the same Domain or across Domains | **Omnipresent Yield:** mastery may remove the ordinary single-secondary-yield cap so all valid backend-tagged secondary Disciplines can receive their associated yield without diluting primary XP |
| **Kinetic** (Body) | **Motion** | Carry | *"I'm already moving..."* | **Momentum:** Kinetic practice establishes a daily Momentum state. Subsequent qualifying physical practice benefits from the active state until reset | **Cluster Unification:** a cluster of qualifying short/medium physical tasks can be recognized as an aggregated Momentum Block and treated as an appropriately upscaled unit rather than as isolated tasks |
| | **Force** | Recover | *"I need physical recovery."* | **Physical Recovery:** Substantial physical exertion grants a protected, banked Recovery Interval that preserves Continuity without penalty | **Exertion Offset:** mastery recognizes the real recovery demand of substantial physical work and can protect a broader practice day from unnecessary pressure |
| | **Precision** | Persist | *"I keep showing up over time."* | **Continuity:** Rewards repeated practice over established cadence and protects long-term continuity | **Cadence Elasticity:** mastery can widen safe execution windows around recurring routines without redefining the underlying cadence or introducing lateness scoring |
| **Form** (Creation) | **Making** | Create | *"I create."* | **Creation (`P`):** Increases the probability of an exceptional outcome on eligible build/fabrication work | **Exceptional Outcomes:** mastery continues to deepen the probability side of the `P × M` model |
| | **Composition** | Flow | *"I flow."* | **Flow Carryover:** Creative practice can apply an immediate yield bonus to the next task | **Under review:** the earlier "well-rounded day" / Confluence direction is not currently preferred. Composition should remain grounded in combining distinct elements into a unified result |
| | **Craft** | Refine | *"I refine."* | **Refinement (`M`):** Scales the magnitude of exceptional outcomes when they occur | **Exceptional Magnitude:** mastery continues to raise the ceiling of exceptional results rather than passively multiplying ordinary tasks |
| **Keeping** (Space) | **Care** | Relieve | *"I respond to what needs care."* | **Grace:** Care removes unnecessary timing friction and protects continuity when execution falls outside a rigid routine window | **Relief:** recognizes responding to another person's immediate need or an unexpected household circumstance. A Relief action must be started and completed on the same day, is limited by a real-world cooldown, and awards the practitioner for the work actually performed. It does not grant full credit to another person for work they did not perform |
| | **Order** | Resolve | *"I maintain what I've resolved."* | **Clear Slate:** Recognizes completion of the active daily list or a configured task threshold | **Maintenance Resonance:** consistent day-to-day maintenance can receive increasing reward recognition when it keeps a larger reset task safely deferred. Tasks with `delay_policy: 'none'` are never treated as safely deferrable |
| | **Renewal** | Restore | *"I restore."* | **Recovery Window:** Completing a qualifying major reset/overhaul grants a time-limited Recovery Window that reduces eligible personal reward costs | **Fresh Start:** an earned recovery period can improve the probability of an exceptional outcome on the next eligible task. It does not create XP merely because rest was taken |

---

## 12-Verb Architecture Summary

* **Inquiry** discovers
* **Reason** solves
* **Synthesis** connects
* **Motion** carries
* **Force** recovers
* **Precision** persists
* **Making** creates
* **Composition** combines
* **Craft** refines
* **Care** relieves
* **Order** maintains
* **Renewal** restores

---

## Core System Principles

1. **Zero Penalties & No Negative States:** Interruption or uncompleted tasks simply remain available or fade quietly. The system never generates negative friction tags, red flags, or "overdue" warnings for ordinary participation.
2. **Universal Pause:** Vacations, emergencies, and major disruptions are handled by a system-level Pause state available to everyone. Pause is never locked behind progression.
3. **Short-List Friendly:** Daily mechanics must work whether an administrator creates two tasks or twelve. Completion thresholds must not assume a fixed list size.
4. **Purely Additive:** Discipline mechanics should create incentives, flexibility, recovery, or recognition without increasing household obligations.
5. **Real-World Boundaries:** A mechanic cannot make a real task physically or mentally easier. It can change how the system recognizes initiation, effort, recovery, scheduling, or reward eligibility.
6. **Binary Task Reality:** Tasks remain complete/not complete. Footholds are interaction states, not artificial partial-completion trees.
7. **Decoupled Architecture:** Tasks store descriptive characteristics such as `duration_tier`, `effort_type`, `cognitive_load`, `supports_foothold`, `has_strict_window`, and `delay_policy`, while temporal and system engines handle scheduling and behavioral interpretation.
8. **No Artificial Delay:** Order and other mechanics may recognize safe maintenance-driven deferral only when task metadata permits it. A task with `delay_policy: 'none'` must not be pushed out for reward optimization.
