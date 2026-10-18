import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { ACCENTS, BASES } from "./context/themeConfig";

/**
 * WCAG 1.4.11 asks a focus indicator for 3:1 against the colour beside it. Every
 * focus ring in frame and the registry is drawn in `--ring`, and an offset ring
 * sits on the page (`--background`) or on a card (`--card`). This sweeps every
 * base, every accent and both schemes, reading the values out of theme.css so the
 * test measures what ships. The animated accents are sampled at every degree.
 *
 * The colour maths is transcribed from WCAG 2.2 rather than shared with anything
 * it checks.
 */

const CSS = readFileSync(`${import.meta.dir}/theme.css`, "utf8").replace(/[/][*][\s\S]*?[*][/]/g, "");

/** WCAG 1.4.11, the bar a focus indicator has to clear. */
const AA_NON_TEXT = 3;

type Rgb = [number, number, number];

/**
 * CSS `hsl()` to sRGB channels, hue in degrees, the rest 0 to 1. Each channel is
 * rounded to 8 bits, as painted, so a value on the 3:1 line cannot pass here and
 * fail on screen.
 */
function hsl(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * Math.min(Math.max(s, 0), 1);
  const sector = ((((h % 360) + 360) % 360) / 60) % 6;
  const x = c * (1 - Math.abs((sector % 2) - 1));
  const [r, g, b]: Rgb =
    sector < 1 ? [c, x, 0] : sector < 2 ? [x, c, 0] : sector < 3 ? [0, c, x] : sector < 4 ? [0, x, c] : sector < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  const byte = (v: number) => Math.round(v * 255) / 255;
  return [byte(r + m), byte(g + m), byte(b + m)];
}

/** WCAG 2.2 relative luminance. */
function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2.2 contrast ratio. */
function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Every custom property each selector sets, merged across blocks in source order. */
function blocks(): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>();
  for (const [, selector, body] of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const props = out.get(selector.trim()) ?? {};
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) props[name] = value.trim();
    out.set(selector.trim(), props);
  }
  return out;
}

const BLOCKS = blocks();
const block = (selector: string) => BLOCKS.get(selector) ?? {};

/** The space-separated channels of an HSL token, keeping `calc(...)` whole. */
function channels(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (current) parts.push(current);
      current = "";
    } else current += ch;
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * One channel of a token as a number, with `var()` resolved from `vars`. Only the
 * forms theme.css uses are understood: a literal, a `var()`, and `calc(a * b)`.
 * Anything else throws, so new syntax fails the test rather than being misread.
 */
function channel(raw: string, vars: Record<string, string>, depth = 0): number {
  if (depth > 8) throw new Error(`var() cycle resolving ${raw}`);
  const text = raw.trim();
  const ref = /^var\((--[\w-]+)\)$/.exec(text);
  if (ref) {
    const next = vars[ref[1]];
    if (next === undefined) throw new Error(`${ref[1]} is not set`);
    return channel(next, vars, depth + 1);
  }
  const calc = /^calc\((.+)\*(.+)\)$/.exec(text);
  if (calc) return channel(calc[1], vars, depth + 1) * channel(calc[2], vars, depth + 1);
  const literal = /^(-?[\d.]+)(%|deg)?$/.exec(text);
  if (literal) return +literal[1];
  throw new Error(`cannot evaluate "${raw}"`);
}

/** An HSL token resolved to sRGB. */
function colour(token: string, vars: Record<string, string>): Rgb {
  const parts = channels(vars[token] ?? "");
  if (parts.length !== 3) throw new Error(`${token} is not an HSL triple: "${vars[token]}"`);
  const [h, s, l] = parts.map((part) => channel(part, vars));
  return hsl(h, s / 100, l / 100);
}

type Scheme = "light" | "dark";

/** The custom properties in force on the root element for one scheme, base and accent. */
function cascade(scheme: Scheme, base: string, accent: string): Record<string, string> {
  const vars = { ...block(":root") };
  if (scheme === "dark") Object.assign(vars, block(".dark"));
  Object.assign(vars, block(`[data-base="${base}"]`));
  if (accent !== "neutral") {
    Object.assign(vars, block(`[data-accent="${accent}"]`));
    if (scheme === "light") Object.assign(vars, block(`[data-accent="${accent}"]:not(.dark)`));
    else Object.assign(vars, block(`.dark[data-accent="${accent}"]`));
  }
  return vars;
}

interface Reading {
  ratio: number;
  base: string;
  accent: string;
  surface: string;
}

/** Every ring-on-surface ratio for one scheme, the animated accents at each degree. */
function readings(scheme: Scheme): Reading[] {
  const out: Reading[] = [];
  for (const { value: base } of BASES)
    for (const { value: accent } of ACCENTS) {
      const vars = cascade(scheme, base, accent);
      const cycles = (vars["--ring"] ?? "").includes("--pf-accent-hue");
      for (let hue = 0; hue < (cycles ? 360 : 1); hue++) {
        const at = cycles ? { ...vars, "--pf-accent-hue": `${hue}deg` } : vars;
        const ring = colour("--ring", at);
        for (const surface of ["--background", "--card"])
          out.push({
            ratio: contrast(ring, colour(surface, at)),
            base,
            accent: cycles ? `${accent}@${hue}` : accent,
            surface,
          });
      }
    }
  return out;
}

describe("--ring as a focus indicator", () => {
  for (const scheme of ["light", "dark"] as const)
    test(`clears 3:1 against --background and --card in the ${scheme} scheme`, () => {
      const all = readings(scheme);
      const worst = all.reduce((a, b) => (b.ratio < a.ratio ? b : a));
      const failing = [...new Set(all.filter((r) => r.ratio < AA_NON_TEXT).map((r) => r.accent.replace(/@\d+$/, "")))];
      expect(
        worst.ratio,
        `worst ${worst.ratio.toFixed(2)}:1 on ${worst.surface}, ${worst.base} base, ${worst.accent} accent. Accents under 3:1: ${failing.join(", ") || "none"}`,
      ).toBeGreaterThanOrEqual(AA_NON_TEXT);
    });

  test("every accent in the picker sets a ring in both schemes", () => {
    // An accent with no CSS block would silently measure the neutral ring.
    const neutral = { light: cascade("light", "zinc", "neutral")["--ring"], dark: cascade("dark", "zinc", "neutral")["--ring"] };
    for (const { value } of ACCENTS.filter((a) => a.value !== "neutral"))
      for (const scheme of ["light", "dark"] as const) expect(cascade(scheme, "zinc", value)["--ring"], `${value} ${scheme}`).not.toBe(neutral[scheme]);
  });

  test("every base in the picker other than zinc has a CSS block", () => {
    for (const { value } of BASES.filter((b) => b.value !== "zinc")) expect(block(`[data-base="${value}"]`)["--base-hue"], value).toBeDefined();
  });
});
