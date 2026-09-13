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

export function generateCalendarColourOptions(theme: CalendarColourTheme, count = 8): CalendarColourSelection[] {
  const anchor = rgbToOklch(parseHex(theme.harmonyAnchor ?? theme.reserved[0] ?? theme.surface));
  const vocabulary = theme.reserved
    .map(parseHex)
    .map(rgbToOklch)
    .filter((colour) => colour.c > 0.025);

  const relationships = [0, 180, 30, -30, 60, -60, 120, -120];
  const vocabularyHues = vocabulary.flatMap((colour) => [
    colour.h,
    colour.h + 180,
  ]);

  const targets = [
    anchor.h,
    ...vocabularyHues,
    ...relationships.map((offset) => anchor.h + offset),
  ].map(normaliseHue);

  const selectedHues: number[] = [];
  const options: CalendarColourSelection[] = [];
  const shuffled = targets
    .map((hue) => ({ hue, sort: Math.random() }))
    .sort((first, second) => first.sort - second.sort)
    .map((item) => item.hue);

  for (const target of shuffled) {
    if (selectedHues.some((hue) => circularDistance(hue, target) < 22)) continue;
    selectedHues.push(target);
    options.push({
      hueOffset: normaliseHue(target - anchor.h),
      chromaBias: Math.random() * 2 - 1,
      lightnessBias: Math.random() * 2 - 1,
    });
    if (options.length === count) break;
  }

  // Always fill the requested count, but only after exhausting meaningful theme relationships.
  let fallbackOffset = 0;
  while (options.length < count) {
    const target = normaliseHue(anchor.h + fallbackOffset);
    fallbackOffset += 47;
    if (selectedHues.some((hue) => circularDistance(hue, target) < 18)) continue;
    selectedHues.push(target);
    options.push({
      hueOffset: normaliseHue(target - anchor.h),
      chromaBias: Math.random() * 2 - 1,
      lightnessBias: Math.random() * 2 - 1,
    });
  }

  return options;
}

export function renderCalendarColour(selection: CalendarColourSelection, theme: CalendarColourTheme): CalendarColourRender {
  const surface = parseHex(theme.surface);
  const text = parseHex(theme.text);
  const anchor = rgbToOklch(parseHex(theme.harmonyAnchor ?? theme.reserved[0] ?? theme.surface));
  const base = rgbToOklch(surface);
  const hue = normaliseHue(anchor.h + selection.hueOffset);
  const isDarkTheme = base.l < 0.5;

  // Calendar colours are surface treatments. Keep them in the theme's value range rather than
  // turning the source hue into a saturated coloured block.
  const chroma = clamp(0.035 + selection.chromaBias * 0.012, 0.025, 0.05);
  const targetLightness = isDarkTheme
    ? clamp(base.l + 0.10 + selection.lightnessBias * 0.035, 0.25, 0.38)
    : clamp(base.l + selection.lightnessBias * 0.018, 0.88, 0.95);
  const source = oklchToRgb({ l: targetLightness, c: chroma, h: hue });

  const baselineContrast = contrastRatio(text, surface);
  const weights = isDarkTheme ? [0.78, 0.68, 0.58, 0.48, 0.38] : [0.72, 0.62, 0.52, 0.42, 0.32];
  let background = mixOklab(surface, source, weights[weights.length - 1]);
  for (const weight of weights) {
    const candidate = mixOklab(surface, source, weight);
    if (contrastRatio(text, candidate) >= baselineContrast * 0.90) {
      background = candidate;
      break;
    }
  }

  const border = mixOklab(background, source, isDarkTheme ? 0.72 : 0.64);
  return { background: toHex(background), border: toHex(border) };
}

function parseHex(value: string): Rgb {
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return { r: 128, g: 128, b: 128 };
  const hex = match[1].length === 3 ? match[1].split('').map((part) => part + part).join('') : match[1];
  return { r: Number.parseInt(hex.slice(0, 2), 16), g: Number.parseInt(hex.slice(2, 4), 16), b: Number.parseInt(hex.slice(4, 6), 16) };
}
function rgbToOklch(rgb: Rgb): Oklch { const lab = rgbToOklab(rgb); return { l: lab.l, c: Math.hypot(lab.a, lab.b), h: normaliseHue(Math.atan2(lab.b, lab.a) * 180 / Math.PI) }; }
function oklchToRgb(lch: Oklch): Rgb { const radians = lch.h * Math.PI / 180; return oklabToRgb({ l: lch.l, a: lch.c * Math.cos(radians), b: lch.c * Math.sin(radians) }); }
function rgbToOklab(rgb: Rgb): Oklab {
  const r = srgbToLinear(rgb.r / 255), g = srgbToLinear(rgb.g / 255), b = srgbToLinear(rgb.b / 255);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969563 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const lRoot = Math.cbrt(l), mRoot = Math.cbrt(m), sRoot = Math.cbrt(s);
  return { l: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot, a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot, b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot };
}
function oklabToRgb(lab: Oklab): Rgb {
  const lRoot = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b, mRoot = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b, sRoot = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;
  const l = lRoot ** 3, m = mRoot ** 3, s = sRoot ** 3;
  return { r: clampByte(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), g: clampByte(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), b: clampByte(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s) };
}
function mixOklab(first: Rgb, second: Rgb, weight: number): Rgb { const a = rgbToOklab(first), b = rgbToOklab(second); return oklabToRgb({ l: a.l + (b.l - a.l) * weight, a: a.a + (b.a - a.a) * weight, b: a.b + (b.b - a.b) * weight }); }
function contrastRatio(first: Rgb, second: Rgb): number { const firstL = relativeLuminance(first), secondL = relativeLuminance(second), lighter = Math.max(firstL, secondL), darker = Math.min(firstL, secondL); return (lighter + 0.05) / (darker + 0.05); }
function relativeLuminance(rgb: Rgb): number { const r = srgbToLinear(rgb.r / 255), g = srgbToLinear(rgb.g / 255), b = srgbToLinear(rgb.b / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
function srgbToLinear(value: number): number { return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; }
function normaliseHue(value: number): number { return (value % 360 + 360) % 360; }
function circularDistance(first: number, second: number): number { const distance = Math.abs(first - second) % 360; return Math.min(distance, 360 - distance); }
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
function clampByte(value: number): number { return Math.round(clamp(value * 255, 0, 255)); }
function toHex(rgb: Rgb): string { return `#${[rgb.r, rgb.g, rgb.b].map((value) => value.toString(16).padStart(2, '0')).join('')}`; }
