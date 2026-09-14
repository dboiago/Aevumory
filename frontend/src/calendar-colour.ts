export function generateCalendarColourOptions(theme: CalendarColourTheme, count = 8): CalendarColourSelection[] {
  const anchor = resolveThemeAnchor(theme);
  
  // Extract explicit chromatic hues from theme tokens (e.g., accents, borders)
  const vocabulary = theme.reserved
    .map(parseHex)
    .map(rgbToOklch)
    .filter((colour) => colour.c > 0.025);
  const vocabularyHues = vocabulary.map((colour) => colour.h);

  // Tight, analogous offsets keep generated choices within the theme's color family
  const analogousOffsets = [0, 18, -18, 36, -36, 52, -52, 70, -70];
  const candidates: HueCandidate[] = [];

  for (const offset of analogousOffsets) {
    const hue = normaliseHue(anchor.h + offset);
    candidates.push({
      hue,
      score: scoreHue(hue, anchor.h, vocabularyHues),
    });
  }

  // Include subtle shifts directly off theme accent tokens
  for (const vocabHue of vocabularyHues) {
    for (const offset of [0, 15, -15]) {
      const hue = normaliseHue(vocabHue + offset);
      candidates.push({
        hue,
        score: scoreHue(hue, anchor.h, vocabularyHues) + 0.2,
      });
    }
  }

  const ranked = candidates
    .sort((first, second) => second.score - first.score)
    .map((candidate) => candidate.hue);

  const selectedHues: number[] = [];
  for (const hue of shuffled(ranked)) {
    if (selectedHues.some((selected) => circularDistance(selected, hue) < 14)) continue;
    selectedHues.push(hue);
    if (selectedHues.length === count) break;
  }

  for (const hue of ranked) {
    if (selectedHues.length === count) break;
    if (selectedHues.some((selected) => circularDistance(selected, hue) < 10)) continue;
    selectedHues.push(hue);
  }

  return selectedHues.slice(0, count).map((hue) => ({
    hueOffset: normaliseHue(hue - anchor.h),
    chromaBias: randomBias(),
    lightnessBias: randomBias(),
  }));
}

export function renderCalendarColour(selection: CalendarColourSelection, theme: CalendarColourTheme): CalendarColourRender {
  const surface = parseHex(theme.surface);
  const text = parseHex(theme.text);
  const anchor = resolveThemeAnchor(theme);
  const base = rgbToOklch(surface);
  const hue = normaliseHue(anchor.h + selection.hueOffset);
  const isDarkTheme = base.l < 0.5;

  // Light mode: soft, desaturated surface tints (C = 0.020 - 0.032)
  // Dark mode: controlled mid-dark fills (C = 0.035 - 0.048)
  const chroma = isDarkTheme
    ? clamp(0.038 + selection.chromaBias * 0.006, 0.030, 0.046)
    : clamp(0.024 + selection.chromaBias * 0.005, 0.018, 0.032);

  // Target lightness delta from base surface
  // Light mode sits slightly darker than background surface for definition (L = 0.88 - 0.92)
  // Dark mode steps clearly above base surface to prevent black collapse (L = 0.24 - 0.28)
  let targetLightness = isDarkTheme
    ? clamp(base.l + 0.09 + selection.lightnessBias * 0.02, 0.24, 0.29)
    : clamp(base.l - 0.02 + selection.lightnessBias * 0.015, 0.88, 0.92);

  let backgroundRgb = oklchToRgb({ l: targetLightness, c: chroma, h: hue });

  // Contrast check against theme primary text
  const minContrast = isDarkTheme ? 2.6 : contrastRatio(text, surface) * 0.85;
  if (contrastRatio(text, backgroundRgb) < minContrast) {
    const step = isDarkTheme ? 0.012 : -0.012;
    for (let i = 0; i < 4; i++) {
      targetLightness += step;
      const candidate = oklchToRgb({ l: targetLightness, c: chroma, h: hue });
      if (contrastRatio(text, candidate) >= minContrast) {
        backgroundRgb = candidate;
        break;
      }
    }
  }

  // Border framing: slightly lighter in dark mode, slightly darker in light mode
  const bgOklch = rgbToOklch(backgroundRgb);
  const borderLightness = isDarkTheme ? bgOklch.l + 0.09 : bgOklch.l - 0.08;
  const borderChroma = isDarkTheme ? bgOklch.c * 1.4 : bgOklch.c * 1.5;

  const borderRgb = oklchToRgb({
    l: clamp(borderLightness, 0.12, 0.94),
    c: clamp(borderChroma, 0.025, 0.065),
    h: bgOklch.h,
  });

  return { background: toHex(backgroundRgb), border: toHex(borderRgb) };
}

function resolveThemeAnchor(theme: CalendarColourTheme): Oklch {
  // Use text color or explicit harmony anchor as primary chromatic baseline
  const primaryRgb = parseHex(theme.harmonyAnchor ?? theme.text);
  let anchor = rgbToOklch(primaryRgb);

  if (anchor.c <= 0.025) {
    const chromaticReserved = theme.reserved
      .map(parseHex)
      .map(rgbToOklch)
      .filter((colour) => colour.c > 0.025);

    if (chromaticReserved.length > 0) {
      anchor = chromaticReserved[0];
    } else {
      anchor.h = 250;
    }
  }
  return anchor;
}
