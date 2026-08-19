# Design System & Theming Engine

## Core Philosophy
The UI is a passive, context-driven household display. It must feel atmospheric, elegant, and legible from 10 feet away. **No hardcoded colors, font families, or pixel dimensions allowed in component styles.** All visual traits must reference CSS variables defined at the `:root` level.

## Color Tokens & Theme Architecture
Themes are driven by the `data-theme` attribute on the `<html>` element.

```css
/* Base Palette: Overgrown Dark (Default) */
[data-theme="overgrown"] {
  /* Surface Layers */
  --bg-primary: #0B0F0D;        /* Deep Slate / Base Canvas */
  --bg-surface: #1A241F;        /* Translucent Dark Moss Container */
  --bg-surface-hover: #23302A;  /* Interactive Surface State */
  
  /* Borders & Dividers */
  --border-subtle: #2D3F36;     /* Muted Stone Border */
  --border-active: #486355;     /* Focused/Active Element Border */
  
  /* Typography & Icons */
  --text-main: #E2ECE6;         /* High-contrast Crisp Off-White */
  --text-muted: #8AA899;        /* Sage Fog / Secondary Information */
  
  /* Accents & States */
  --accent-primary: #D4A359;    /* Weathered Brass / Living Room Accent */
  --accent-alert: #C95A49;      /* Muted Crimson / Exception Warning */
  --accent-success: #5AA377;    /* Verdant Green / Task Completed */
  
  /* Typography Tokens */
  --font-heading: 'Cinzel', serif, system-ui;
  --font-body: 'Inter', sans-serif, system-ui;
  --font-mono: 'Fira Code', monospace;
  
  /* Geometry & Curves */
  --radius-card: 12px;
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

Component Layout & Z-Index Rules
    Layer 0 (z-index: 0): Ambient Google Photos Canvas / Media Slideshow.
    Layer 1 (z-index: 10): The Event Horizon Orbital Arc & Passive Dashboard.
    Layer 2 (z-index: 100): Transient Alerts (Vacuum Map, Camera PIP, Weather Overrides).
    Layer 3 (z-index: 1000): Radial Action Fly-Out & Secret Command Terminal.