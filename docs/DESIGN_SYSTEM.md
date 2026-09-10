# Design System & Theming Engine

## Core Philosophy

The UI is a passive, context-driven household display. It must feel atmospheric, elegant, and legible from 10 feet away.

The design system separates **visual identity** from **content architecture**. Components should consume semantic design tokens rather than hardcoding colors, font families, or visual dimensions.

## Color Tokens & Theme Architecture

Themes are driven by the `data-theme` attribute on the `<html>` element.

Components must use the existing semantic CSS variables defined by `frontend/src/styles.css`. Do not introduce page-specific colors, hard-coded color values, or component-local visual systems. Do not modify theme definitions to solve an individual component's styling problem. If a required semantic distinction does not have an existing token, inspect the existing design system before introducing anything new.

```css
/* Theme definitions live in frontend/src/styles.css. */
```

## Page Layout

Functional pages should follow the established page and header alignment patterns rather than inventing page-specific geometry.

* Page headers may use the wider content width established by existing functional surfaces
* Constrained cards and content groups may use a narrower width within that page frame
* Back navigation aligns with the page header rather than being constrained to the width of a content card
* Use existing typography, spacing, border, radius, and surface treatments wherever the design system already provides them

## Cards & Containment

Cards are structural units, not merely decoration. Meaningfully grouped information, controls, and actions should remain contained within a card when the established UI pattern calls for that grouping.

The standard card treatment uses the existing `--bg-surface`, `--border-subtle`, `--radius-card`, and established spacing/padding values.

Do not remove meaningful card containment simply to make a surface look cleaner. Conversely, do not put every isolated piece of text into a card when no meaningful grouping exists.

Avoid horizontal divider lines between every row in a card unless the separation is materially useful. Whitespace and grouping are preferred for simple selections and metadata.

## Card Actions

Contextual actions belong inside the card they act on and are normally placed at the bottom-right.

This applies to actions such as `Add`, `Done`, `Complete`, `Manage`, and authentication actions associated with the card's contents.

Primary action treatment should follow the established Task `Complete` pattern rather than introducing floating action buttons or generic large-button treatments. Use the existing action tokens:

* `--action-primary-bg`
* `--action-primary-hover-bg`
* `--action-primary-border`
* `--accent-primary`

Hover and focus states should follow the same semantic pattern already established by functional surfaces.

## Back Navigation

Subpages use `← Back` rather than naming the previous page.

Back navigation follows the existing small uppercase secondary-navigation treatment, including its established spacing, typography, hover, and focus behaviour. Where the interaction model supports it, subpages should also support the established edge-swipe-back gesture.

## Typography Hierarchy

Use the existing semantic text hierarchy rather than flattening all text to one colour or weight.

* Primary headings and important names use `--text-primary`
* Secondary and supporting information uses `--text-soft`
* Metadata and quieter explanatory information uses `--text-muted`

Not every surface needs all three levels, but useful hierarchy should be preserved where content has different semantic importance. Supporting text and functional metadata must remain comfortably legible rather than being made unnecessarily small.

## Selection Controls

Selection controls should use familiar controls when they communicate the interaction clearly. Do not replace a checkbox or equivalent control with a decorative icon solely for novelty.

Native browser controls must not introduce a visually incompatible default appearance. Where a control needs custom treatment, it should remain theme-aware and use existing semantic variables, with the existing accent treatment for selected/focused states.

## Themes & Visual Restraint

Every functional surface must work across all existing themes. Do not solve theme-specific issues by adding one-off colors or changing theme definitions for a single page.

Aevumory should avoid turning its visual language into an RPG interface. Progression can influence subtle presentation over time, but visual treatment must not introduce character-sheet conventions, game HUDs, combat metaphors, health bars, loot presentation, or other fictional-game framing.

Distinctiveness should come from hierarchy, typography, spacing, restraint, terminology, semantic colour, and the relationship between ambient and functional surfaces. Familiar UI patterns are preferred when they improve usability. Novelty for novelty's sake is not a design goal.

## Ambient Display Source Management

Ambient Display is a presentation surface with configuration controls, not a photo-management system.

Image source management follows these rules:

* Provider/source types remain distinct cards
* Multiple connected accounts or sources within the same provider are rows within that provider card
* Provider-level `Add` actions belong inside the provider card at bottom-right
* Selecting `Add` from a provider card implies that provider and should not require a redundant provider-choice screen
* Connecting a source does not implicitly enable Ambient use unless the connection was initiated explicitly as part of adding that source to Ambient
* Source selection may include galleries, folders, collections, or individual images as supported by the provider
* Aevumory consumes the resulting eligible image set and does not manage, edit, rank, filter, delete, or otherwise modify photographs
* Eligible images are pooled, deduplicated, shuffled, and displayed without ranking or preference weighting
* Ambient image selection must not use AI, face detection, semantic ranking, or engagement optimization
* Image rotation changes the photograph only. Event Horizon, signature, alerts, and time continue independently
* Images must preserve their aspect ratio. `Fill`, `Fit`, and `Smart` framing must not distort photographs
* When fitting an image leaves unused space, use the same photograph as a blurred scaled background rather than static sidebars
* Orientation preference is a preference, not a hidden override. A zero-match configuration remains valid

Source management must also respect the communal-device model. Ownership and authorization remain associated with the source, while the Ambient renderer does not need to know who owns an image.

Any interaction that can expose private household-member information requires that member's authentication. Overview surfaces may show ownership and aggregate counts, but private gallery, album, folder, or individual-image contents must remain behind the source owner's PIN or equivalent authentication.

Do not expose private thumbnails merely to make source management more visually interesting.

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

## Deferred / Non-Goals

The design system does not prescribe visual treatment for features that have not yet been designed. Do not infer new conventions from an unfinished surface simply because a similar pattern could be imagined.

In particular, future calendar, navigation, device-management, and other functional surfaces should consume these established conventions rather than creating their own visual language, while their content structure and interaction model remain open until designed.
