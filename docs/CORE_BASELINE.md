# Aevumory Core System Baseline & Anti-Gamification Rules

## 1. Foundational Philosophy & Ground Truth

* **Real-World Reality:** Aevumory is a practical tracking and structural system for real life. Software cannot alter physical reality, reduce the intrinsic difficulty of a real-world task, or act as a proxy for human discipline.
* **Non-Punitive Architecture:** The system never uses shame, streak-loss punishment, punitive decay, red-alert treatment, or failure states for ordinary participation. Do not introduce user-facing concepts such as "overdue", "failed", or "late" unless explicitly required by the product design.
* **Obligation Reduction over Grind Escalation:** Rewards and progression should create grace, flexibility, legitimate recovery, and increased optionality. They must not systematically increase household obligations or turn participation into a treadmill.
* **Default Interaction Simplicity:** The normal interaction with a task is see → do → check complete. Discipline mechanics must not require additional user workflow unless the mechanic cannot function without it
* **Game Mechanics, Not a Game World:** Aevumory intentionally uses game mechanics for motivation, discovery, and delight. It does not simulate a fictional RPG world, require fictional roles, or turn real-world activity into character roleplay.
* **Optionality:** Ignoring optional game layers must never degrade the underlying household system or penalize the participant.
* **Universal Pause:** Life disruptions, emergencies, vacations, and other legitimate interruptions are handled by a universal Pause state available to everyone. Pause is not a mastery, reward, or progression unlock and carries no penalty for use.

## 2. Task Model Rules

* **Binary Real-World Execution:** The underlying real-world task is binary: completed or not completed. A Foothold is a recognized interaction/practice event, not partial task completion.
* **Zero Sub-Steps or Node Trees:** Tasks do not contain artificial sub-steps, friction nodes, multi-stage completion bars, or generic micro-progress states.
* **Administrative Task Authority:** The admin defines what constitutes a valid task and which activities are worthy of Practice tracking. The engine should not invent its own semantic definition of whether a task is "meaningful".
* **Descriptive Metadata Only:** Fields such as `cognitive_load`, `duration_tier`, and `effort_type` describe task characteristics. They are not dynamic difficulty statistics and must not be treated as combat-style attributes.
* **No Artificial Task Decomposition:** If a real-world activity has legitimate discrete units, those may exist as separate tasks. The system should not manufacture subtask trees solely to create additional progression events.
* **Delay Policy:** Tasks declare how safely they may move beyond their nominal schedule using `delay_policy: 'none' | 'bounded' | 'flexible'`.
  * `none`: The task should not be intentionally delayed by progression mechanics
  * `bounded`: Delay is permitted within an administrator-defined safe bound
  * `flexible`: The task may be deferred without a fixed delay bound
* **Delay Is Not Failure:** A task outside its nominal timing is never converted into an overdue or failed state. `delay_policy` describes scheduling safety, not participant performance.

## 3. Practice & Progression Invariants

* **Base Yield Anchor:** `1 Base XP ≈ 1 minute` of qualifying focused real-world effort before Discipline modifiers, flow effects, Synthesis, or exceptional outcomes.
* **Progression Curve:** Cumulative XP for Level `L` follows `100 × L²`.
  * Level 1 = 0 XP
  * Level 10 = 10,000 XP and constitutes Mastery
* **Post-Mastery Experience:** Experience beyond Level 10 never caps, decays, or drains. It contributes to the permanent historical weight of **The Mark** and satisfies the immutable Experience prerequisite for Hybrid eligibility.
* **Experience and Credits:** Experience and Credits are independent economic/progression layers with separate downstream effects, although both may be awarded by the same real-world Practice action.
* **Level Resolution:** Discipline level is derived from cumulative Experience and is not stored as mutable progression state.
* **Mastery:** Mastery is permanent once achieved. It never requires maintenance payment, recurring activity, or expenditure of accumulated Experience.

## 4. Identity & The Mark

* **The Mark:** The Mark is a long-horizon visual record of personal development and history. It is not a stat sheet, level badge, or literal representation of numerical values.
* **Morphology:** Early practice may introduce structural complexity; mature practice favors cohesion, compression, and visual economy.
* **Material:** Material evolution represents accumulated history and dedication over long horizons rather than individual task rewards.
* **Personal Identity:** The Mark is an evolving personal emblem, not a fictional character class or role.

## 5. Key Behavioral Flags

* **Care (Grace):** Evaluates schedule flexibility through `has_strict_window`. Care removes timing friction rather than measuring degrees of lateness. Care Mastery currently explores **Relief**, recognizing a limited same-day response to another person's immediate need or an unexpected household circumstance.
* **Reason (Foothold):** Allows a qualifying task to expose an initiation state through `supports_foothold`, recognizing activation friction without changing the binary real-world completion model.
* **Renewal (Recovery):** A qualifying `is_major_reset` task can trigger a time-limited Recovery Window. Renewal Mastery currently explores a **Fresh Start** effect that improves the chance of an exceptional outcome on the next eligible task rather than granting XP without corresponding practice.
* **Universal Pause:** Pause protects continuity from legitimate disruption for all participants and is never gated by Discipline level or Mastery.
