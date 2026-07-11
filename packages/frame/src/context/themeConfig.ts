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
] as const satisfies readonly ThemeOption<string>[];

export type Accent = (typeof ACCENTS)[number]["value"];
