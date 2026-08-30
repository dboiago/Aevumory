# Aevumory Core System Baseline & Anti-Gamification Rules

## 1. Foundational Philosophy & Ground Truth

* **Real-World Reality:** Aevumory is a practical tracking and structural system for real life. Software cannot alter physical reality, reduce the intrinsic difficulty of a real-world task, or act as a proxy for human discipline.
* **Non-Punitive Architecture:** The system never uses shame, streak-loss punishment, punitive decay, red-alert treatment, or failure states for ordinary participation. Do not introduce user-facing concepts such as "overdue", "failed", or "late" unless explicitly required by the product design.
* **Obligation Reduction over Grind Escalation:** Rewards and progression should create grace, flexibility, legitimate recovery, and increased optionality. They must not systematically increase household obligations or turn participation into a treadmill.
* **Game Mechanics, Not a Game World:** Aevumory intentionally uses game mechanics for motivation, discovery, and delight. It does not simulate a fictional RPG world, require fictional roles, or turn real-world activity into character roleplay.
* **Optionality:** Ignoring optional game layers must never degrade the underlying household system or penalize the participant.
* **Universal Pause:** Life disruptions, emergencies, vacations, illness, and other legitimate interruptions are handled by a universal Pause state available to everyone. Pause is not a mastery, reward, or progression unlock and carries no penalty for use.
* **Default Interaction Simplicity:** The normal task interaction is `view → perform → complete`. Discipline mechanics should resolve automatically around this interaction and must not introduce additional user workflow unless explicitly required by the mechanic. Foothold and Deductive Pruning are intentional exceptions.
* **Mastery Removes Boundaries:** Mastery should expand the contexts in which a Discipline can meaningfully operate. It should remove artificial restrictions or enable broader application of the underlying capability rather than merely increasing numerical rewards.
* **No Mechanics-First Workflow:** Do not introduce entities, chains, sub-projects, approval flows, or additional task states solely to support a Discipline mechanic. Additional structure is justified only when it corresponds to an existing real-world structure the participant already needs to manage.

## 2. Task Model Rules

* **Binary Real-World Execution:** The underlying real-world task is binary: completed or not completed. A Foothold is a recognized interaction/practice event, not partial task completion.
* **Zero Sub-Steps or Node Trees:** Tasks do not contain artificial sub-steps, friction nodes, multi-stage completion bars, or generic micro-progress states.
* **Administrative Task Authority:** The admin defines what constitutes a valid task and which activities are worthy of Practice tracking. The engine should not invent its own semantic definition of whether a task is "meaningful".
* **Descriptive Metadata Only:** Fields such as `cognitive_load`, `duration_tier`, and `effort_type` describe task characteristics. They are not dynamic difficulty statistics and must not be treated as combat-style attributes.
* **No Artificial Task Decomposition:** If a real-world activity has legitimate discrete units, those may exist as separate tasks. The system should not manufacture subtask trees solely to create additional progression events.
* **Shared Household Surface:** The primary household display is a shared board. Tasks are ordinarily visible to household members according to board scope; the system does not require the wall display to know which participant is physically interacting with it.
* **Responsibility Is Visible:** Individual responsibility is represented by task placement on a participant's board/card. Household tasks may exist in a shared pool and may be assigned by moving them onto a participant's card.
* **Reward Ownership:** The participant assigned responsibility for a task receives its ordinary Experience and Credits when the task is completed, regardless of which household member physically performs it. This is an intentional household model, not a claim that the assigned participant personally performed the work.
* **Task Reassignment:** Moving a task from one participant's card to another changes responsibility for the applicable cycle. Reassignment is an ordinary household action, not a separate game mode.
* **Household Task Creation:** Household members may create legitimate tasks. Administration may retain the authority to revoke, edit, assign, or correct tasks and their reward values where appropriate.

## 3. Practice & Progression Invariants

* **Base Yield Anchor:** `1 Base XP ≈ 1 minute` of qualifying focused real-world effort before Discipline modifiers, flow effects, Synthesis, or exceptional outcomes.
* **Progression Curve:** Cumulative XP for Level `L` follows `100 × L²`.
  * Level 1 = 0 XP
  * Level 10 = 10,000 XP and constitutes Mastery
* **Post-Mastery Experience:** Experience beyond Level 10 never caps, decays, or drains. It contributes to long-term progression history and satisfies the immutable Experience prerequisite for Hybrid eligibility.
* **Experience and Credits:** Experience and Credits are independent progression/economic layers, although both may be awarded from the same completed task.
* **Level Resolution:** Discipline level is derived from cumulative Experience and is not stored as mutable progression state.
* **Mastery:** Mastery is permanent once achieved. It never requires maintenance payment, recurring activity, or expenditure of accumulated Experience.
* **Modifier Classes:** Experience modifiers, exceptional-outcome probability modifiers, exceptional-outcome magnitude modifiers, and Credit modifiers are distinct. They must not be collapsed into a single generic multiplier.
* **Modifier Caps:** Where bonus ceilings exist, they apply to the relevant modifier class rather than indiscriminately to every economic effect.

## 4. Visual Identity

* **Current Scope:** No Mark system is part of the current implementation scope.
* **Reason for Deferral:** The previous Mark concept required a potentially large visual/procedural design and rendering system without a sufficiently compelling low-cost implementation. That complexity is not justified while the core household experience is still being built.
* **Future Direction:** Aevumory may eventually provide a persistent personal visual identity that users can become attached to. The form is deliberately unresolved and may use user-selected photographs/images, designed symbols, borders, flourishes, or another lightweight representation rather than a procedural progression Mark.
* **No Progression Dependency:** No current Discipline, Mastery, Experience, Credit, or household mechanic may depend on The Mark existing.
* **Revisit Later:** The concept of long-term visual identity remains a valid future design area. Any future implementation must justify its complexity against the actual product and should not create an independent visual-engineering project merely to encode progression.

## 5. Current Mastery Direction

* **Motion:** Recognizes sustained/clustered Kinetic activity without limiting the amount of physical activity performed. The special bonus applies to recognized activity windows rather than to a fixed task count.
* **Force:** Recognizes legitimate physical recovery after substantial exertion.
* **Precision:** Expands acceptable timing variance around recurring practice without mutating recurrence anchors.
* **Reason:** Recognizes investigation that establishes an existing task is unnecessary, with auditable causal evidence and compensating reversal when an authorized correction rejects the result.
* **Inquiry:** Represents proactive household awareness rather than hidden personal discoveries. Task creation is available to everyone. Inquiry Mastery rewards the recognition and surfacing of legitimate future work, particularly work given a meaningful planning horizon such as a week or more, rather than granting exclusive authority to create, assign, or hide tasks.
* **Synthesis:** Removes artificial limits on the number of legitimate secondary Disciplines recognized by a task.
* **Making:** Enables exceptional-outcome probability for qualifying Practice where sufficient experience makes an exceptional result plausible.
* **Craft:** Controls exceptional-outcome magnitude when exceptional practice occurs, primarily affecting Credits and remaining grounded in realistic real-world value.
* **Composition:** Interprets Daily Practice Resolution through Continuity. Qualifying completed days build a bounded, percentage-based Credit modifier that recognizes sustained responsibility without creating a conventional streak or requiring additional work.
* **Care:** Recognizes limited same-day response to another person's immediate need or unexpected household circumstance.
* **Order:** Rewards sustained maintenance associated with larger household upkeep without altering the real-world schedule of the larger task.
* **Renewal:** Uses earned recovery to improve exceptional-outcome probability on the next eligible Practice action.

## 6. Key System Protections

* **Pause:** Pause is universally available and never gated by Discipline, level, or Mastery. A paused day is treated as if it does not exist for progression and daily-resolution purposes: nothing is gained, nothing is lost, and existing state remains unchanged.
* **Historical Absence:** Internal scheduling records may retain historical absence, but it is never a user-facing failure state or streak breaker.
* **Superseded:** A cycle may be superseded when another valid real-world condition makes the underlying work unnecessary. Supersession does not fabricate completion or award task Experience/Credits.
* **Corrective Transactions:** Historical reward transactions are immutable. If an administrative correction reverses an awarded result, the system records a compensating transaction rather than mutating history.

## 7. Reward Economy

### Currency & Minting Mechanics

- **Base Credit Derivation:** 10 minutes of qualifying Practice = 1.0 Base Credit. Fractional effort is retained to one decimal place by default (e.g., 5 min = 0.5 Credits; 17 min = 1.7 Credits) to preserve direct physical effort anchoring across short activities
- **Minting Invariant:** Credits are created only by authorized Reward Transactions. They may arise from qualifying Practice actions, Footholds, exceptional outcomes, or explicitly authorized administrative adjustments. Credits are never generated passively by time, account status, task ownership, or reward availability
- **Separation of Concerns:** Experience measures permanent personal history and skill development. Base XP is anchored approximately to qualifying focused effort, then Discipline mechanics may modify the resulting Experience. Base Credits are independently derived from qualifying Practice effort and the configured Credit economy

### Valuation & Household Pricing

- **Localized Pricing Authority:** Reward prices are subjective household judgments set by the Admin, calibrated to real-world family norms rather than external MSRP or commercial dollar values
- **Repricing & Liquidity:** Credits maintain stable nominal values in personal ledgers. If an Admin reprices a reward, redemptions occur at the spot price active at the moment of exchange

### Household Buckets & Financial Anchors

- **Shared Goal Sinks:** Household Buckets accept voluntary, irreversible Credit transfers from individual ledgers to fund collective goals
- **Optional Financial Anchors:** Large goals may optionally display an Admin-configured financial overlay (e.g., 1 Credit = $0.50 toward a savings goal). This overlay is strictly informational and does not turn the underlying system into accounting software or alter internal Credit mechanics
