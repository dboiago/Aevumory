# RPG Engine & Household Gamification Rules

## Design Philosophy
* **Accessible Depth:** Simple for casual users (pick a class, complete tasks, get points), but deep for theorycrafters (synergies, passives, archetype bonuses).
* **Non-Punitive Mechanics:** Losing a duel or failing a task multiplier never steals progress—it triggers catch-up mechanics, restoration buffs, or alternative paths.

## Primary Forces of Action (Archetypes)
Instead of standard elementals, classes align with core forces:

1. **Momentum:** Focuses on velocity and chain execution. Completing tasks in short windows builds stacking point multipliers.
2. **Stasis:** Focuses on patience and large yields. Charges up over time, giving massive bonuses to periodic, high-friction chores.
3. **Entropy:** Focuses on friction and disruption. Spent points apply beneficial modifiers to available family tasks.
4. **Siphon:** Focuses on co-op symbiosis. Earns passive bonus XP whenever another household member completes a task.

## Class & Subclass Architecture
Each user selects **1 Base Class** which unlocks a dedicated **Subclass Spec** at Level 5.

              ┌──────────────┐
              │ Base Class:  │
              │   MARTIAL    │
              └──────┬───────┘
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼

┌─────────────────┐         ┌─────────────────┐
│ Subclass:       │         │ Subclass:       │
│ TAI CHI         │         │ WUSHU           │
│ (Recovery &     │         │ (High-Yield     │
│ Streak Buffs)   │         │ Labor Execution)│
└─────────────────┘         └─────────────────┘


## Passive Skill Mechanics
* **Class Passives:** Inherited automatically upon choosing a class or subclass.
* **Keystones (Optional):** Powerful double-edged modifiers that introduce strategic trade-offs (e.g., higher point yield in exchange for faster point decay).

## Asymmetric Duel System (Household Contests)
When two users claim the same real-life reward (e.g., borrowing the car on Saturday night):

1. Both players stake points or XP into the Duel Pool.
2. The server executes a deterministic calculation based on:
   `Base Roll + (Active Class Bonus) + (Streak Multiplier) - (Entropy Modifiers)`
3. **Outcome:** 
   * **Winner:** Claims the real-world reward.
   * **Runner-Up:** Retains their points and receives a **Restoration Buff** ($+25\%$ XP generation for 7 days) to come back stronger for the next contest.