export type CalendarColourSelection = {
  hueOffset: number;
  chromaBias: number;
  lightnessBias: number;
};

export type CalendarColourTheme = {
  surface: string;
  text: string;
  harmonyAnchor?: string;
  reserved: string[];
};

export type CalendarColourRender = {
  background: string;
  border: string;
};

type Rgb = { r: number; g: number; b: number };
type Oklab = { l: number; a: number; b: number };
type Oklch = { l: number; c: number; h: number };

type HueCandidate = {
  hue: number;
  score: number;
};

export function generateCalendarColourOptions(theme: CalendarColourTheme, count = 8): CalendarColourSelection[] {
  const anchor = resolveThemeAnchor(theme);
  const vocabulary = theme.reserved
    .map(parseHex)
    .map(rgbToOklch)
    .filter((colour) => colour.c > 0.03);
  const vocabularyHues = vocabulary.map((colour) => colour.h);

  const offsets = [0, 24, -24, 48, -48, 90, 120, 150, 180, 210, 240, 270, 312, 336];
  const candidates: HueCandidate[] = [];

  for (const offset of offsets) {
    const hue = normaliseHue(anchor.h + offset);
    candidates.push({
      hue,
      score: scoreHue(hue, anchor.h, vocabularyHues),
    });
  }

  for (const vocabularyHue of vocabularyHues) {
    for (const offset of [0, 24, -24, 180]) {
      const hue = normaliseHue(vocabularyHue + offset);
      candidates.push({
        hue,
        score: scoreHue(hue, anchor.h, vocabularyHues) + 0.15,
      });
    }
  }

  const ranked = candidates
    .sort((first, second) => second.score - first.score)
    .map((candidate) => candidate.hue);

  const selectedHues: number[] = [];
  for (const hue of shuffled(ranked)) {
    if (selectedHues.some((selected) => circularDistance(selected, hue) < 22)) continue;
    selectedHues.push(hue);
    if (selectedHues.length === count) break;
  }

  for (const hue of ranked) {
    if (selectedHues.length === count) break;
    if (selectedHues.some((selected) => circularDistance(selected, hue) < 16)) continue;
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

  // Dark themes require higher chroma and lightness elevation to read as distinct tints
  const chroma = isDarkTheme
    ? clamp(0.052 + selection.chromaBias * 0.012, 0.038, 0.068)
    : clamp(0.034 + selection.chromaBias * 0.008, 0.022, 0.046);

  let targetLightness = isDarkTheme
    ? clamp(base.l + 0.085 + selection.lightnessBias * 0.025, 0.23, 0.32)
    : clamp(base.l + selection.lightnessBias * 0.015, 0.86, 0.95);

  let backgroundRgb = oklchToRgb({ l: targetLightness, c: chroma, h: hue });

  // Ensure text legibility: adjust lightness step if contrast drops below baseline requirement
  const minContrast = contrastRatio(text, surface) * 0.85;
  if (contrastRatio(text, backgroundRgb) < minContrast) {
    const step = isDarkTheme ? -0.015 : 0.015;
    for (let i = 0; i < 5; i++) {
      targetLightness += step;
      backgroundRgb = oklchToRgb({ l: targetLightness, c: chroma, h: hue });
      if (contrastRatio(text, backgroundRgb) >= minContrast) break;
    }
  }

  // Calculate high-contrast border: brighter edge for dark themes, darker edge for light themes
  const bgOklch = rgbToOklch(backgroundRgb);
  const borderLightness = isDarkTheme ? bgOklch.l + 0.08 : bgOklch.l - 0.07;
  const borderRgb = oklchToRgb({
    l: clamp(borderLightness, 0.05, 0.96),
    c: clamp(bgOklch.c * 1.45, 0.03, 0.10),
    h: bgOklch.h,
  });

  return { background: toHex(backgroundRgb), border: toHex(borderRgb) };
}

function resolveThemeAnchor(theme: CalendarColourTheme): Oklch {
  const parsedAnchor = parseHex(theme.harmonyAnchor ?? theme.reserved[0] ?? theme.surface);
  let anchor = rgbToOklch(parsedAnchor);

  if (anchor.c <= 0.03) {
    const chromaticReserved = theme.reserved
      .map(parseHex)
      .map(rgbToOklch)
      .filter((colour) => colour.c > 0.03);

    if (chromaticReserved.length > 0) {
      anchor = chromaticReserved.reduce((prev, curr) => (curr.c > prev.c ? curr : prev), chromaticReserved[0]);
    } else {
      anchor.h = 250; // Fallback default hue for purely monochromatic themes
    }
  }
  return anchor;
}

function scoreHue(hue: number, anchorHue: number, vocabularyHues: number[]): number {
  const anchorDistance = circularDistance(hue, anchorHue);
  const vocabularyDistance = vocabularyHues.length === 0
    ? 180
    : Math.min(...vocabularyHues.map((vocabularyHue) => circularDistance(hue, vocabularyHue)));

  const harmonyDistance = nearestHarmonyDistance(hue, anchorHue);
  return (1 - vocabularyDistance / 180) * 0.65
    + (1 - harmonyDistance / 180) * 0.25
    + (1 - anchorDistance / 180) * 0.10;
}

function nearestHarmonyDistance(hue: number, anchorHue: number): number {
  const harmonyOffsets = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  return Math.min(...harmonyOffsets.map((offset) =>
    circularDistance(hue, normaliseHue(anchorHue + offset)),
  ));
}

function shuffled(values: number[]): number[] {
  return values
    .map((value) => ({ value, sort: Math.random() }))
    .sort((first, second) => first.sort - second.sort)
    .map((item) => item.value);
}

function randomBias(): number {
  return Math.random() * 2 - 1;
}

function parseHex(value: string): Rgb {
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return { r: 128, g: 128, b: 128 };
  const hex = match[1].length === 3 ? match[1].split('').map((part) => part + part).join('') : match[1];
  return { r: Number.parseInt(hex.slice(0, 2), 16), g: Number.parseInt(hex.slice(2, 4), 16), b: Number.parseInt(hex.slice(4, 6), 16) };
}

function rgbToOklch(rgb: Rgb): Oklch {
  const lab = rgbToOklab(rgb);
  return { l: lab.l, c: Math.hypot(lab.a, lab.b), h: normaliseHue(Math.atan2(lab.b, lab.a) * 180 / Math.PI) };
}

function oklchToRgb(lch: Oklch): Rgb {
  const radians = lch.h * Math.PI / 180;
  return oklabToRgb({ l: lch.l, a: lch.c * Math.cos(radians), b: lch.c * Math.sin(radians) });
}

function rgbToOklab(rgb: Rgb): Oklab {
  const r = srgbToLinear(rgb.r / 255), g = srgbToLinear(rgb.g / 255), b = srgbToLinear(rgb.b / 255);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969563 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const lRoot = Math.cbrt(l), mRoot = Math.cbrt(m), sRoot = Math.cbrt(s);
  return { l: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot, a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot, b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot };
}

function oklabToRgb(lab: Oklab): Rgb {
  const lRoot = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b,
        mRoot = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b,
        sRoot = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;
  const l = lRoot ** 3, m = mRoot ** 3, s = sRoot ** 3;
  return {
    r: clampByte(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: clampByte(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: clampByte(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

function mixOklab(first: Rgb, second: Rgb, weight: number): Rgb {
  const a = rgbToOklab(first), b = rgbToOklab(second);
  return oklabToRgb({ l: a.l + (b.l - a.l) * weight, a: a.a + (b.a - a.a) * weight, b: a.b + (b.b - a.b) * weight });
}

function contrastRatio(first: Rgb, second: Rgb): number {
  const firstL = relativeLuminance(first), secondL = relativeLuminance(second), lighter = Math.max(firstL, secondL), darker = Math.min(firstL, secondL);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(rgb: Rgb): number {
  const r = srgbToLinear(rgb.r / 255), g = srgbToLinear(rgb.g / 255), b = srgbToLinear(rgb.b / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function srgbToLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function normaliseHue(value: number): number {
  return (value % 360 + 360) % 360;
}

function circularDistance(first: number, second: number): number {
  const distance = Math.abs(first - second) % 360;
  return Math.min(distance, 360 - distance);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampByte(value: number): number {
  return Math.round(clamp(value * 255, 0, 255));
}

function toHex(rgb: Rgb): string {
  return `#${[rgb.r, rgb.g, rgb.b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}
