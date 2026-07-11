/**
 * Single source of truth for the theming picker UI (swatch lists) and the
 * `Accent` / `Base` union types. The matching CSS lives in `theme.css` as
 * `[data-accent="…"]` / `[data-base="…"]` blocks — CSS can't be generated at
 * runtime, so the colour values are defined there; here we keep only the list
 * of valid values, their labels, and a preview swatch for the settings UI.
 *
 * Keep each `value` in sync with a corresponding CSS block in `theme.css`.
 */

/** One selectable option: the persisted value, its UI label, and a preview swatch. */
export interface ThemeOption<V extends string> {
  value: V;
  label: string;
  /** CSS colour for the settings swatch; mirrors the option's light-mode key token. */
  swatch: string;
}

/**
 * Accent colour axis (the brand/`--primary` hue), orthogonal to base and mode.
 * `neutral` is the default: it carries no `data-accent` attribute, so the base
 * neutral tokens apply unchanged. Swatches mirror each accent's light-mode
 * `--primary` in `theme.css`.
 */
export const ACCENTS = [
  { value: "neutral", label: "Default", swatch: "hsl(240 6% 16%)" },
  { value: "blue", label: "Blue", swatch: "hsl(221 83% 53%)" },
  { value: "green", label: "Green", swatch: "hsl(142 76% 36%)" },
  { value: "rose", label: "Rose", swatch: "hsl(347 77% 50%)" },
  { value: "violet", label: "Violet", swatch: "hsl(262 83% 58%)" },
  { value: "orange", label: "Orange", swatch: "hsl(25 95% 53%)" },
  { value: "red", label: "Red", swatch: "hsl(0 72% 51%)" },
  { value: "amber", label: "Amber", swatch: "hsl(38 92% 50%)" },
  { value: "yellow", label: "Yellow", swatch: "hsl(48 96% 53%)" },
  { value: "teal", label: "Teal", swatch: "hsl(173 80% 32%)" },
  { value: "cyan", label: "Cyan", swatch: "hsl(192 91% 34%)" },
  { value: "sky", label: "Sky", swatch: "hsl(200 90% 40%)" },
  { value: "indigo", label: "Indigo", swatch: "hsl(243 75% 59%)" },
  { value: "purple", label: "Purple", swatch: "hsl(271 76% 53%)" },
  { value: "pink", label: "Pink", swatch: "hsl(330 75% 47%)" },
  {
    value: "rainbow",
    label: "Rainbow",
    swatch:
      "linear-gradient(90deg, hsl(350 70% 50%), hsl(48 70% 46%), hsl(150 55% 40%), hsl(200 70% 45%), hsl(320 60% 52%))",
  },
] as const satisfies readonly ThemeOption<string>[];

export type Accent = (typeof ACCENTS)[number]["value"];

/**
 * Base neutral ramp axis (the gray-tint hue), orthogonal to accent and mode.
 * Each base shifts `--base-hue` / `--base-sat` in `theme.css`, recolouring every
 * neutral surface (background, border, muted, sidebar) while leaving an active
 * accent's `--primary`/`--ring` untouched. `zinc` (hue 240) is the default and
 * carries no `data-base` attribute. Note: the `neutral` base (grayscale) is a
 * different thing from the `neutral` *accent* — separate axes, separate UI
 * sections. Swatches are a representative mid-gray at each base's hue.
 */
export const BASES = [
  { value: "zinc", label: "Zinc", swatch: "hsl(240 6% 55%)" },
  { value: "slate", label: "Slate", swatch: "hsl(215 16% 55%)" },
  { value: "gray", label: "Gray", swatch: "hsl(220 4% 55%)" },
  { value: "stone", label: "Stone", swatch: "hsl(30 10% 55%)" },
  { value: "neutral", label: "Neutral", swatch: "hsl(0 0% 55%)" },
  { value: "rose", label: "Rose", swatch: "hsl(345 22% 58%)" },
  { value: "red", label: "Red", swatch: "hsl(2 24% 58%)" },
  { value: "amber", label: "Amber", swatch: "hsl(40 26% 55%)" },
  { value: "green", label: "Green", swatch: "hsl(150 18% 52%)" },
  { value: "teal", label: "Teal", swatch: "hsl(185 20% 52%)" },
  { value: "blue", label: "Blue", swatch: "hsl(214 26% 58%)" },
  { value: "indigo", label: "Indigo", swatch: "hsl(250 22% 60%)" },
  { value: "violet", label: "Violet", swatch: "hsl(276 22% 60%)" },
] as const satisfies readonly ThemeOption<string>[];

export type Base = (typeof BASES)[number]["value"];
