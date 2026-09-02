# Design System & Theming Engine

## Core Philosophy

The UI is a passive, context-driven household display. It must feel atmospheric, elegant, and legible from 10 feet away.

The design system separates **visual identity** from **content architecture**. Components should consume semantic design tokens rather than hardcoding colors, font families, or visual dimensions.

## Color Tokens & Theme Architecture

Themes are driven by the `data-theme` attribute on the `<html>` element.

```css
/* Theme: Overgrown Dark (Architectural / Botanical / Archaic) */
[data-theme="overgrown-dark"] {
  --bg-primary: #0A0D0B;
  --bg-surface: #141A16;
  --bg-surface-hover: #1C241F;
  --border-subtle: #27332B;
  --border-active: #3E5245;
  --text-main: #E2ECE6;
  --text-muted: #7E9487;
  --accent-primary: #C29A53;
  --accent-alert: #B84A39;
  --accent-success: #4E8B65;
  --font-heading: 'Cinzel', 'Trajan Pro', serif, system-ui;
  --font-body: 'Inter', sans-serif, system-ui;
  --font-mono: 'Fira Code', monospace;
  --radius-card: 8px;
  --radius-badge: 999px;
}

/* Alternative Theme Example: Solar Flare */
[data-theme="solar-flare"] {
  --bg-primary: #120D0A;
  --bg-surface: #241914;
  --bg-surface-hover: #33231C;
  --border-subtle: #402D23;
  --border-active: #664838;
  --text-main: #F5ECE8;
  --text-muted: #A88F80;
  --accent-primary: #E67E22;
  --accent-alert: #D35400;
  --accent-success: #27AE60;
  --font-heading: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif, system-ui;
  --font-mono: 'Fira Code', monospace;
}
```

## Ambient Display Composition

The ambient display is a presentation surface, not a dashboard of every household subsystem.

The visual stack is conceptually ordered as:

```text
Layer 0: Ambient media / background imagery
Layer 1: Persistent household context and qualifying ambient content
Layer 2: Transient contextual overlays when explicitly warranted
Layer 3: Interactive controls and application UI
```

The Event Horizon belongs to the ambient-content layer, but it is not defined as a fixed orbital arc or a mandatory geometric layout. Its composition is governed by the Event Horizon specification and may evolve independently of the underlying event model.

Tasks are not ambient-display content by default. Task information remains on task-oriented surfaces unless an explicit contextual relationship makes its appearance on an ambient surface useful.

Transient integrations such as camera views, vacuum state, weather conditions, or other household-device information are contextual overlays rather than permanent display layers. Their appearance must be justified by the current household context.

## Responsive / Distance Legibility

The primary display is intended to be readable from approximately 10 feet away. Important information therefore favors:

* strong hierarchy
* restrained information density
* large primary typography
* high contrast between semantic layers
* persistent information that can be understood without interaction
* motion that communicates change without demanding attention

The display should remain useful while passively observed. Interaction is available when needed but is not the prerequisite for understanding the household state.

## Visual Restraint

Aevumory should avoid turning its visual language into an RPG interface. Progression can influence subtle presentation over time, but visual treatment must not introduce character-sheet conventions, game HUDs, combat metaphors, health bars, loot presentation, or other fictional-game framing.

The previous Mark system is deferred. Any future identity treatment such as a border, flourish, framing treatment, or related visual distinction should remain optional and must not become a dependency of the current design system.
