# Agent Execution Guidelines

## Context Ingestion Order
Before making changes, you MUST read:
1. `/CONCEPT.md` (Design philosophy & non-negotiables)
2. `/docs/ARCHITECTURE.md` (Tech stack & system boundaries)
3. `/docs/DESIGN_SYSTEM.md` (Tokens & visual constraints)

## Strict Rules
- **No Hardcoded Values:** Never hardcode colors, fonts, margins, or pixel values in UI components. Use CSS variables defined in `DESIGN_SYSTEM.md`.
- **Passive First:** The display is a living room HUD. Never add intrusive popups, bright flashing elements, or cluttered dashboard widgets.
- **Single Source of Truth:** Game logic, XP calculations, and event positions live on the backend (SQLite/TrueNAS). The frontend is strictly a rendering client fed by WebSockets.
- **Isolated Changes:** Implement feature requests in small, testable increments. Do not rewrite existing folder structures unless explicitly instructed.