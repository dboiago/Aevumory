# Progression & Engine Specification

## 1. Execution Pipeline

When a task transitions state, the Practice Engine evaluates the following 8-stage pipeline in strict invariant order:

1. **Action Trigger & Event Validation:** State transitions from `active` -> `foothold_established` -> `completed`[cite: 1, 4].
2. **Context Resolution:** Evaluates active Motion Momentum, Composition Flow Carryover, Care Grace, and Order Clear Slate thresholds[cite: 3].
3. **Base Yield Generation:** Calculates uncoupled base quantities.
   * `1 Base XP ≈ 1 minute of focused practice` (before modifiers).
   * `Base Credit` is generated via a provisional credit formula.
4. **Experience Calculation Sequence:**
   * $\text{Base XP} \longrightarrow \text{Additive Yield Modifiers} \longrightarrow \text{Exceptional Roll } (P) \longrightarrow \text{Craft Magnitude } (M) \longrightarrow \text{Synthesis Split}$[cite: 2]
5. **Credit Deposit:** Final integer credits are deposited directly into wallet balance (uncoupled from XP multipliers)[cite: 2].
6. **State Effects Execution:** Physical recovery day banking (Force), Recovery Window extensions (Renewal), Motion momentum updates, Composition Flow flags, and Order Clear Slate bonus evaluations[cite: 3].
7. **Level & Mastery Resolution:** Adds XP to primary/secondary disciplines. Checks threshold using `resolveDisciplineLevel(cumulativeXP)`. Level 10 (10,000 XP) sets state to `mastered`.
8. **Mark Mutation:** Records an immutable ledger entry.

## 2. Progression Math

Progression follows a soft accelerating polynomial curve:
$$\text{Cumulative XP Required}(L) = 100 \times L^2$$

* **Level 1:** 0 XP (Initiate)
* **Level 2:** 400 XP
* **Level 3:** 900 XP
* **Level 4:** 1,600 XP
* **Level 5:** 2,500 XP
* **Level 6:** 3,600 XP
* **Level 7:** 4,900 XP
* **Level 8:** 6,400 XP
* **Level 9:** 8,100 XP
* **Level 10:** 10,000 XP (Mastery Threshold)

### Post-Mastery
Experience past 10,000 XP continues accumulating indefinitely without decay or maintenance drain. It feeds directly into **The Mark's material evolution** and fulfills hybrid unlocking prerequisites.

## 3. Discipline Mechanics Overview

* **Force:** Reduces exertion metrics; expands banked physical rest capacity (up to 3 days)[cite: 3].
* **Care:** Eliminates schedule window friction[cite: 1, 4]. Progression expands Grace from single tasks to dependent routines and domain Continuity.
* **Renewal:** Extends Recovery Windows when `primary_discipline === 'renewal'` and `is_major_reset === true`[cite: 1, 4].
* **Synthesis:** Grants secondary yield split across any valid discipline combination (same-domain or cross-domain)[cite: 2, 4].
* **Making & Craft:** Exceptional probability roll ($P$) multiplied by Craft magnitude ($M$)[cite: 2].
