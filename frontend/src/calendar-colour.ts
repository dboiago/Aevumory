export type CalendarColourSelection = {
  hueOffset: number;
  chromaBias: number;
  lightnessBias: number;
};

export type CalendarColourTheme = {
  surface: string;
  text: string;
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
  const base = rgbToOklch(parseHex(theme.surface));
  const reservedHues = theme.reserved
    .map(parseHex)
    .map(rgbToOklch)
    .filter((colour) => colour.c > 0.025)
    .map((colour) => colour.h);
  const options: CalendarColourSelection[] = [];

  // Always create one candidate per sector. A small random rotation and jitter keeps
  // each opening fresh without allowing the options to collapse into the same few hues.
  const sectorSize = 360 / count;
  const rotation = Math.random() * sectorSize;

  for (let index = 0; index < count; index += 1) {
    let hueOffset = rotation + index * sectorSize + (Math.random() - 0.5) * sectorSize * 0.28;
    let hue = normaliseHue(base.h + hueOffset);

    // Reserved semantic colours are not hard exclusions. Move a candidate away from
    // them instead of rejecting it, which guarantees that the picker remains populated.
    for (const reserved of reservedHues) {
      const distance = circularDistance(hue, reserved);
      if (distance < 28) {
        const direction = normaliseHue(hue - reserved) <= 180 ? 1 : -1;
        hue = normaliseHue(reserved + direction * 28);
        hueOffset = normaliseHue(hue - base.h);
      }
    }

    options.push({
      hueOffset,
      chromaBias: Math.random() * 2 - 1,
      lightnessBias: Math.random() * 2 - 1,
    });
  }

  return options;
}

export function renderCalendarColour(selection: CalendarColourSelection, theme: CalendarColourTheme): CalendarColourRender {
  const base = rgbToOklch(parseHex(theme.surface));
  const hue = normaliseHue(base.h + selection.hueOffset);
  const isDarkTheme = base.l < 0.5;
  const chroma = clamp(0.14 + selection.chromaBias * 0.025, 0.115, 0.18);
  const lightness = isDarkTheme
    ? clamp(0.54 + selection.lightnessBias * 0.045, 0.49, 0.59)
    : clamp(0.82 + selection.lightnessBias * 0.045, 0.775, 0.865);
  const source = oklchToRgb({ l: lightness, c: chroma, h: hue });
  const surface = parseHex(theme.surface);
  const text = parseHex(theme.text);
  const baselineContrast = contrastRatio(text, surface);

  // Keep enough of the selected hue in the fill to make neighbouring choices
  // visibly different, while retaining the theme's existing text treatment.
  const weights = isDarkTheme ? [0.52, 0.44, 0.36, 0.28, 0.20] : [0.42, 0.36, 0.30, 0.24, 0.18];
  let background = mixOklab(surface, source, weights[weights.length - 1]);

  for (const weight of weights) {
    const candidate = mixOklab(surface, source, weight);
    if (contrastRatio(text, candidate) >= baselineContrast * 0.90) {
      background = candidate;
      break;
    }
  }

  const border = mixOklab(background, source, isDarkTheme ? 0.66 : 0.54);
  return { background: toHex(background), border: toHex(border) };
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
  const r = srgbToLinear(rgb.r / 255);
  const g = srgbToLinear(rgb.g / 255);
  const b = srgbToLinear(rgb.b / 255);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969563 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);
  return { l: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot, a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot, b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot };
}

function oklabToRgb(lab: Oklab): Rgb {
  const lRoot = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const mRoot = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const sRoot = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;
  return {
    r: clampByte(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: clampByte(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: clampByte(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

function mixOklab(first: Rgb, second: Rgb, weight: number): Rgb {
  const a = rgbToOklab(first);
  const b = rgbToOklab(second);
  return oklabToRgb({ l: a.l + (b.l - a.l) * weight, a: a.a + (b.a - a.a) * weight, b: a.b + (b.b - a.b) * weight });
}

function contrastRatio(first: Rgb, second: Rgb): number {
  const firstL = relativeLuminance(first);
  const secondL = relativeLuminance(second);
  const lighter = Math.max(firstL, secondL);
  const darker = Math.min(firstL, secondL);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(rgb: Rgb): number {
  const r = srgbToLinear(rgb.r / 255);
  const g = srgbToLinear(rgb.g / 255);
  const b = srgbToLinear(rgb.b / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function srgbToLinear(value: number): number { return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; }
function normaliseHue(value: number): number { return (value % 360 + 360) % 360; }
function circularDistance(first: number, second: number): number { const distance = Math.abs(first - second) % 360; return Math.min(distance, 360 - distance); }
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
function clampByte(value: number): number { return Math.round(clamp(value * 255, 0, 255)); }
function toHex(rgb: Rgb): string { return `#${[rgb.r, rgb.g, rgb.b].map((value) => value.toString(16).padStart(2, '0')).join('')}`; }
