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

## 3. Practice & Progression Invariants

* **Base Yield Anchor:** `1 Base XP ≈ 1 minute` of qualifying focused real-world effort before Discipline modifiers, flow effects, Synthesis, or exceptional outcomes.
* **Progression Curve:** Cumulative XP for Level `L` follows `100 × L²`.
  * Level 1 = 0 XP
  * Level 10 = 10,000 XP and constitutes Mastery
* **Post-Mastery Experience:** Experience beyond Level 10 never caps, decays, or drains. It contributes to the permanent historical weight of **The Mark** and satisfies the immutable Experience prerequisite for Hybrid eligibility.
* **Experience and Credits:** Experience and Credits are independent progression/economic layers, although both may be awarded from the same completed task.
* **Level Resolution:** Discipline level is derived from cumulative Experience and is not stored as mutable progression state.
* **Mastery:** Mastery is permanent once achieved. It never requires maintenance payment, recurring activity, or expenditure of accumulated Experience.
* **Modifier Classes:** Experience modifiers, exceptional-outcome probability modifiers, exceptional-outcome magnitude modifiers, and Credit modifiers are distinct. They must not be collapsed into a single generic multiplier.
* **Modifier Caps:** Where bonus ceilings exist, they apply to the relevant modifier class rather than indiscriminately to every economic effect.

## 4. Identity & The Mark

* **The Mark:** The Mark is a long-horizon visual record of personal development and history. It is not a stat sheet, level badge, or literal representation of numerical values.
* **Morphology:** Early practice may introduce structural complexity; mature practice favors cohesion, compression, and visual economy.
* **Material:** Material evolution represents accumulated history and dedication over long horizons rather than individual task rewards.
* **Personal Identity:** The Mark is an evolving personal emblem, not a fictional character class or role.

## 5. Current Mastery Direction

* **Motion:** Recognizes sustained/clustered physical activity without limiting the amount of physical activity performed.
* **Force:** Recognizes legitimate physical recovery after substantial exertion.
* **Precision:** Expands acceptable timing variance around recurring practice without mutating recurrence anchors.
* **Reason:** Recognizes investigation that establishes a task is unnecessary.
* **Inquiry:** Current Contextual Discovery mastery direction is intentionally unresolved pending a richer household-context model.
* **Synthesis:** Removes artificial limits on the number of legitimate secondary Disciplines recognized by a task.
* **Making:** Enables exceptional-outcome probability for qualifying Form practice.
* **Craft:** Controls exceptional-outcome magnitude when exceptional practice occurs.
* **Composition:** Intentionally deferred. No additional workflow should be introduced solely to support it.
* **Care:** Recognizes limited same-day response to another person's immediate need or unexpected household circumstance.
* **Order:** Rewards sustained maintenance associated with larger household upkeep without altering the real-world schedule of the larger task.
* **Renewal:** Uses earned recovery to improve exceptional-outcome probability on the next eligible Practice action.

## 6. Key System Protections

* **Pause:** Pause is universally available and never gated by Discipline, level, or Mastery.
* **Historical Absence:** Internal scheduling records may retain historical absence, but it is never a user-facing failure state or streak breaker.
* **Superseded:** A cycle may be superseded when another valid real-world condition makes the underlying work unnecessary. Supersession does not fabricate completion or award task Experience/Credits.
* **Corrective Transactions:** Historical reward transactions are immutable. If an administrative correction reverses an awarded result, the system records a compensating transaction rather than mutating history.
