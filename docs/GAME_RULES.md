# Aevumory Core System Specification & Game Rules

## Overview & Philosophy
Aevumory is a grounded interaction and discipline system designed for shared household/individual checklists. It avoids punitive mechanics, superficial gamification (e.g., visual cosmetics, grinding, penalties, or negative friction tags), and heavy UI branching. Every mechanic is purely additive, modeling authentic human behavior, cognitive energy, and recovery cycles.

---

## The 4 Domains & 12 Disciplines

### Summary Architecture Matrix

| Domain | Discipline | Core Verb | Core Impulse (*Praxis*) | Fundamental Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Erudite** (Mind) | **Inquiry** | Discover | *"What is there?"* | **Discovery:** Surfaces hidden tasks, household information, contextual suggestions, or system secrets directly onto your HUD view. Discovery *is* the reward. |
| | **Reason** | Solve | *"How do I approach this?"* | **Efficiency / Foothold:** Pierces task paralysis on tasks supporting point-of-entry (`supports_foothold: true`). Ticking a Foothold awards initiation credit and daily continuity protection while rolling over without penalty. |
| | **Synthesis** | Connect | *"How does this connect?"* | **Cross-Domain Yield:** Ticking cross-domain tasks generates a targeted practice yield boost for the secondary discipline/domain involved. |
| **Kinetic** (Body) | **Motion** | Carry | *"I'm already moving..."* | **Momentum:** Ticking Kinetic practice establishes a daily Momentum state. Subsequent qualifying physical practice on the same day benefits from that active state until the midnight reset. |
| | **Force** | Recover | *"I need physical recovery."* | **Physical Recovery:** Substantial physical exertion grants a protected **Recovery Interval** (banked physical rest day) that preserves Continuity without breaking cadence, modeling real training cycles. |
| | **Precision** | Persist | *"I keep showing up over time."* | **Continuity Anchor:** Rewards showing up over time. Ticking Precision practice on established cadence strengthens your personal Continuity modifier. |
| **Form** (Creation) | **Making** | Create | *"I create."* | **Creation ($P$):** Increases the backend probability of an exceptional outcome (`exceptional_outcome_probability`) when completing build or fabrication tasks. |
| | **Composition**| Flow | *"I flow."* | **Flow Carryover:** Completing a creative practice task applies an immediate yield bonus to whatever task you tick next. |
| | **Craft** | Refine | *"I refine."* | **Refinement ($M$):** Scales the magnitude multiplier applied *when* an exceptional outcome occurs ($P \times M$), rewarding deep mastery without runaway passive multiplier bloat. |
| **Keeping** (Space) | **Care** | Accommodate| *"Care removes timing friction."*| **Grace:** Care practices maintain full personal Continuity credit whenever performed—removing time-of-day friction and restrictions. |
| | **Order** | Resolve | *"I resolve."* | **Clear Slate:** Clearing your complete active daily list OR reaching a 4-task completion threshold awards a "Clear Slate" bonus yield, scaling cleanly across short or long lists. |
| | **Renewal** | Restore | *"I restore."* | **Recovery Window:** Completing a qualifying major reset/overhaul grants a time-limited Recovery Window that reduces eligible personal reward costs, validating psychological completion before expecting further output. |

---

## 12-Verb Architecture Summary
* **Inquiry** discovers
* **Reason** solves
* **Synthesis** connects
* **Motion** carries
* **Force** recovers
* **Precision** persists
* **Making** creates
* **Composition** flows
* **Craft** refines
* **Care** accommodates
* **Order** resolves
* **Renewal** restores

---

## Core System Principles

1. **Zero Penalties & No Negative States:**
   Interruption or uncompleted tasks simply sit there or fade quietly. The system never generates negative friction tags, red flags, or "overdue" warnings.
2. **Short-List Friendly:**
   Mechanics like Order's *Clear Slate* operate on realistic daily checklists (3–5 items) or threshold limits (4 items) rather than assuming a massive task backlog.
3. **Purely Additive:**
   Every mechanic is an incentive or an operational tweak to how your yield or recovery behaves, keeping participation completely opt-in.
4. **Decoupled Architecture:**
   Tasks store descriptive characteristics (`duration_tier`, `effort_type`, `cognitive_load`, `supports_foothold`, `has_strict_window`), while temporal and system engines handle schedule constraints and yield calculations.
