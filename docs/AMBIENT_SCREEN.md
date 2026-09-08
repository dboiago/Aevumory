# Ambient Screen

## 1. Purpose

The Ambient screen is Aevumory's resting household display.

It is a passive, atmospheric surface intended to feel closer to a digital photo frame than to a household dashboard.

The screen should remain visually calm, useful at a distance, and complete without requiring interaction.

The Ambient screen is the whole resting experience. The Event Horizon, ambient imagery, signature, and transient household state are compositional layers within it.

```text
Ambient Screen
├── Ambient imagery
├── Event Horizon
├── Signature
└── Transient state / alerts
```

## 2. Core Boundary

The Ambient screen is not a dashboard, calendar replacement, task board, activity feed, or notification center.

It should not accumulate ordinary household information merely because that information is available.

In particular, the Ambient screen should not normally display:

* task summaries
* household activity feeds
* persistent device states
* unread counts
* ordinary notifications
* routine household status

The Event Horizon has its own eligibility and composition rules. Ambient imagery and image rotation are independent of Horizon state.

## 3. Ambient Imagery

Ambient imagery is the primary visual surface of the resting display.

The selected image should remain recognizable as a meaningful photograph rather than becoming a decorative background behind conventional application UI.

Image changes must not reset, recompute, or otherwise alter Event Horizon state, signature state, alerts, or household time.

When an image changes, the photograph changes underneath the existing Ambient composition.

## 4. Image Sources

Aevumory should support an aggregate image pool rather than requiring a single image source.

Potential sources include:

* local device storage
* synced personal galleries
* household-shared galleries
* configured built-in ambient imagery

Multiple sources may contribute to the same Ambient image pool.

A source is an input to the pool, not a separate presentation mode. Source-specific integration details belong at the integration boundary.

Users must explicitly control which galleries, folders, collections, or individual images are available to the Ambient screen. A household display must not silently expose a user's private imagery merely because it is accessible to the device or application.

Built-in imagery may provide a usable initial experience when no personal imagery has been configured. It should be treated as an explicit image source rather than as an invisible fallback that changes the meaning of the user's configured pool.

Source availability, authorization, synchronization, caching, and provider-specific behavior remain implementation concerns.

## 5. Communal Device, Profiles, and Source Ownership

Aevumory may operate as a communal household device. The communal device has no signed-in or active user. It is intentionally available as a shared household surface.

Aevumory profiles identify household participants and may be associated with connections or other personal integrations. A profile is not an external provider account and an external provider account must not implicitly create an Aevumory profile.

A single Aevumory profile may own or authorize multiple external connections, including multiple accounts from the same provider.

A source connection should retain an association with the Aevumory profile that authorized or owns that connection. This association exists for authorization, configuration, and disconnection rather than for image-selection behavior.

For example:

```text
Household
├── Alice
│    ├── Google Photos account A
│    ├── Google Photos account B
│    └── iCloud account
├── Bob
│    └── Google Photos account
└── Ambient
     ├── selected images from Alice's source
     └── selected images from Bob's source
```

The Ambient renderer does not need to distinguish ownership when selecting images. The source-management layer does.

Ownership of a source and permission to use selected content are separate concepts. A profile may authorize a specific subset of a connection's content for use by another household or communal Ambient display without transferring ownership of the underlying source.

The interface should make ownership clear enough that the source owner can understand which connection is theirs and manage or remove it without ambiguity.

## 6. Connection Security and PIN Protection

The communal device does not require authentication for ordinary Ambient use or for viewing non-sensitive source summaries.

Authentication is required when an interaction can expose private source information or alter protected source configuration.

A PIN, when configured for a source connection, protects that connection's private contents and management actions.

Protected actions include, as applicable:

* viewing private source contents
* viewing individual private images or thumbnails
* changing the source's Ambient selection
* changing protected source configuration
* disconnecting the source
* removing the source

The PIN belongs to the protected connection or its authorization boundary rather than to the device's current user. The communal device has no current user.

A source may therefore be owned by one profile while selected content from that source is permitted to appear on another household's Ambient display. The receiving device does not become signed in as the source owner and does not need the owner's profile to consume the explicitly approved content.

If diagnostic information for an unavailable source can be shown without exposing private information, it may be available without authentication. Sensitive provider information should remain behind the source's authorization boundary.

The exact PIN lifecycle, session duration, recovery behavior, and remote authorization mechanism remain open.

## 7. Connection vs Ambient Inclusion

Connecting or synchronizing an image source should not normally make it available to Ambient automatically.

These are distinct concepts:

```text
Connect source
      │
      ▼
Source available to Aevumory
      │
      │ explicit Ambient inclusion
      ▼
Eligible Ambient image pool
```

There is one intentional contextual exception: when a user explicitly initiates a source connection from an Ambient-image configuration action such as `Add Google Photos`, the action may both connect the source and include it for Ambient.

This avoids requiring the user to repeat the same intent in a separate settings location.

The rule is therefore:

> Connecting a source never implicitly enables Ambient use, except when connection is initiated explicitly as part of adding that source to Ambient.

## 8. Selecting Images Within a Source

A source may expose its own hierarchy of collections, galleries, albums, folders, or individual images.

Aevumory should allow the user to select the level of specificity appropriate to the source, including specific collections or individual images where the provider or storage system makes that practical.

For example:

```text
Google Photos
  ├── All photos
  ├── Albums
  │    ├── Family
  │    ├── Travel
  │    └── Cottage
  └── Specific selection
```

The selected collections and images become part of the aggregate Ambient pool.

Aevumory should not need to copy ownership of those photographs merely to use them. Whether an eligible image is represented by a local path, provider asset identifier, URL, cached file, or another reference is an implementation detail of the relevant source adapter.

## 9. Image Selection

Image selection should operate on the currently eligible image pool.

The initial selection preferences are:

```text
Image selection
    All photos
    Prefer display orientation
```

`Prefer display orientation` derives orientation from the current display geometry rather than from a fixed device category.

The preference should be deterministic and quiet. It should not override a user's deliberate choice merely because few or no images match.

The interface may provide informational feedback such as:

```text
4 images match this setting
```

or:

```text
0 images match this setting
```

A zero-match configuration is valid. It should not trigger a warning, forced fallback, minimum-image requirement, or recommendation to change the setting.

Exact matching-count semantics depend on the configured source pool and remain subject to implementation.

## 10. Image Rotation and Selection

Image rotation is an Ambient-screen behavior and is independent of Event Horizon events.

The image may rotate on a configurable timed interval. A reasonable initial range is approximately 30 seconds to 3 minutes per image, with the exact default determined through use and testing.

Selection should be intentionally simple. Aevumory should treat the eligible images as a bucket and select photographs at random rather than attempting to determine which image is better, more interesting, more relevant, or more likely to engage the household.

To avoid unnecessary repetition, selection should preferably use a shuffled-cycle approach: images are shuffled, displayed without repetition until the current pool is exhausted, and then reshuffled for another cycle.

The selection system should not rank, weight, prioritize, favorite, or otherwise score photographs.

Changing the photograph must not alter:

* Event Horizon timing or eligibility
* event presentation state
* signature content
* active alerts
* transient household state
* household clock or other temporal state

The rotation timer applies to the photograph only.

## 11. Image Transition

Image changes should use a soft crossfade / cross dissolve rather than a conventional UI transition.

The initial target transition duration is approximately 1.5 to 2.5 seconds.

The transition should not cause other Ambient elements to fade or reset merely because the photograph changed.

Avoid transitions that imply navigation or page movement, including pushes, wipes, page curls, pixelation, or similar effects.

A subtle Ken Burns-style pan or zoom may be applied during an image's display interval.

The movement should be nearly imperceptible and should read as the photograph being quietly alive rather than as animation demanding attention.

## 12. Framing

Photographs must never be distorted to fit the display.

The supported framing modes are:

```text
Fill
Fit
Smart
```

### Fill

The photograph fills the display completely and may be cropped as necessary.

Center cropping is the initial default when cropping is required.

### Fit

The complete photograph remains visible.

When the photograph does not fill the display, the remaining area should be filled using a blurred, scaled-up version of the same photograph rather than static black or gray bars.

### Smart

Smart is a deterministic geometry-based choice between Fill and Fit.

It should consider the relationship between the photograph's aspect ratio and the display's aspect ratio, particularly how much of the photograph Fill would require cropping.

Smart should not use AI, semantic image understanding, face detection, focal-point inference, or other computer vision at this stage.

More sophisticated content-aware framing is deferred unless real-world testing demonstrates that geometry alone is insufficient.

## 13. Motion and Framing Safety

Ken Burns movement must remain inside a safe framing envelope for the selected framing mode.

It must not introduce unexpected cropping of important image areas simply because motion is enabled.

The exact pan distance, zoom range, easing, and motion duration remain implementation and visual-tuning decisions.

## 14. Signature

The Ambient screen may contain a single-line persistent signature providing optional orientation.

The current preferred composition is:

```text
Monday · 7:42 PM · 21°
```

The signature is one compositional element rather than a collection of separate widgets.

Users may configure which components are shown and how time is formatted. Separators should collapse naturally when components are hidden.

The signature should remain visually restrained and should not acquire conventional UI decoration merely to remain legible over difficult imagery.

Legibility treatment should alter the immediate visual environment around the typography as subtly as necessary while preserving the impression of a signature on the image.

## 15. Display Longevity

Persistent Ambient elements should minimize unnecessary static, high-contrast pixel occupation.

The signature may use low visual intensity and, where appropriate, imperceptible positional variation as a display-longevity measure.

Such variation should be subtle enough that the signature remains visually stationary during ordinary use. It should never become a floating or animated UI element merely for the sake of movement.

This is a mitigation, not a guarantee against image retention or burn-in. Platform display sleep, dimming, panel compensation, and the characteristics of the underlying display remain important.

The Ambient design should consciously avoid creating unnecessary persistent high-contrast elements rather than attempting to solve display longevity entirely in application code.

## 16. Transient State and Alerts

A meaningful current household state may temporarily occupy the signature position when there is a specific reason to interrupt the normal signature.

For example:

```text
Someone's at the door
```

The state itself may be directly actionable. Explicit instruction such as `Tap to view` is not required.

Ordinary notifications should not use this mechanism indiscriminately.

Serious alerts are a distinct category and may receive a more visible treatment appropriate to their importance. Where appropriate, they may persist until acknowledged or until the underlying condition resolves.

Alert behavior and severity remain subject to the Ambient alert specification and implementation.

## 17. Ambient Interaction

The Ambient screen has no persistent navigation control.

The current interaction model is directional vertical gesture navigation:

```text
Ambient
   │
   │ swipe up
   ▼
Functional Interface
   │
   │ swipe down
   ▼
Ambient
```

Swiping up reveals the functional household interface.

Swiping down returns to Ambient.

The transition should feel like the Ambient surface is moving away to reveal the functional interface beneath it rather than like a conventional route change.

The exact layered motion and timing remain implementation and visual-tuning decisions.

## 18. Resting and Awake Behavior

The Ambient screen is intended for sustained household display use rather than conventional application-session use.

Future display behavior may include configurable awake hours, for example an active period during the day and automatic display-off outside that period.

This should be treated separately from ordinary application navigation and inactivity behavior.

Platform-specific display sleep, dimming, and presence optimization may be used where available, but Ambient must not depend on cameras, proximity sensors, or other presence hardware being available.

Exact awake-hour, inactivity, dimming, and presence behavior remains open.

## 19. Failure and Absence

The Ambient screen must degrade gracefully.

If no personal images are available, configured built-in imagery may provide the initial usable experience when that source is enabled.

If a configured source becomes unavailable, the remaining eligible pool should continue to function without turning the Ambient screen into an error surface.

A configured source should not silently change the user's selection intent merely because it is temporarily unavailable.

If there are no eligible images at all, the screen should still remain coherent. Exact empty-pool presentation is deferred.

Unavailable sources may expose diagnostic information from source management when such information exists. Diagnostics should remain concise and may provide a copy action to assist with error reporting. Private provider information remains protected by the source's authorization boundary.

## 20. Explicit Non-Goals

The Ambient image system is intentionally not a photo-management system.

It should not provide:

* image deletion
* image editing
* filters or effects
* favorites or ratings
* ranking or recommendation
* source priority
* source percentages or weighting
* AI image selection
* semantic or content-based image selection
* engagement optimization

Aevumory consumes photographs. It does not manage photographs.

## 21. Deferred Decisions

The following remain intentionally open:

* exact image-source integrations
* provider authorization and synchronization behavior
* local caching strategy
* built-in image collection and licensing
* exact rotation default
* exact shuffled-cycle implementation
* exact Ken Burns motion parameters
* exact Smart framing threshold
* exact safe framing envelope
* signature component settings
* signature positional-variation interval and implementation
* signature timeout behavior
* awake-hour settings and display behavior
* inactivity and dimming behavior
* presence-aware optimization where platform hardware supports it
* empty image-pool presentation
* exact PIN lifecycle and recovery behavior
* remote source authorization and sharing mechanism
