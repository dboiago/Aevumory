# Design System & Theming Engine

## Core Philosophy
The UI is a passive, context-driven household display. It must feel atmospheric, elegant, and legible from 10 feet away. **No hardcoded colors, font families, or pixel dimensions allowed in component styles.** All visual traits must reference CSS variables defined at the `:root` level.

## Color Tokens & Theme Architecture
Themes are driven by the `data-theme` attribute on the `<html>` element.

```css
/* Theme: Overgrown Dark (Architectural / Botanical / Archaic) */
[data-theme="overgrown-dark"] {
  /* Architectural Base Layers */
  --bg-primary: #0A0D0B;        /* Deep Slate / Dark Stone Base */
  --bg-surface: #141A16;        /* Translucent Charcoal-Moss Container */
  --bg-surface-hover: #1C241F;  /* Subtle Surface State */
  
  /* Structural Borders */
  --border-subtle: #27332B;     /* Weathered Stone Border */
  --border-active: #3E5245;     /* Structural Highlight */
  
  /* Atmospheric Typography */
  --text-main: #E2ECE6;         /* Etched Off-White */
  --text-muted: #7E9487;        /* Sage Fog / Secondary Info */
  
  /* Archaic Metallic Accents */
  --accent-primary: #C29A53;    /* Weathered Brass / Living Room Accent */
  --accent-alert: #B84A39;      /* Oxidation Crimson / Exception Warning */
  --accent-success: #4E8B65;    /* Deep Botanical Green */
  
  /* Typography Tokens */
  --font-heading: 'Cinzel', 'Trajan Pro', serif, system-ui;
  --font-body: 'Inter', sans-serif, system-ui;
  --font-mono: 'Fira Code', monospace;
  
  /* Geometry & Curves */
  --radius-card: 8px;           /* Sharper, architectural corners */
  --radius-badge: 999px;
  --orbit-curve-radius: 48vw;
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
  --font-body: 'Inter', sans-serif;
  --font-mono: 'Fira Code', monospace;
}
```

Component Layout & Z-Index Rules
  * Layer 0 (z-index: 0): Ambient Google Photos Canvas / Media Slideshow.
  * Layer 1 (z-index: 10): The Event Horizon Orbital Arc & Passive Dashboard.
  * Layer 2 (z-index: 100): Transient Alerts (Vacuum Map, Camera PIP, Weather Overrides).
  * Layer 3 (z-index: 1000): Radial Action Fly-Out & Secret Command Terminal.