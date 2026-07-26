# Theming

The frame ships its theme as a single stylesheet, `@picoframe/frame/theme.css`. It defines
every design token, registers the Tailwind colour utilities, and carries the three theming
axes:

- **mode** — light / dark, via a `.dark` class on `<html>`
- **accent** — the brand/`--primary` hue, via `data-accent` on `<html>`
- **base** — the neutral-ramp tint, via `data-base` on `<html>`

`ThemeProvider` (inside `AppFrame`) only toggles those three attributes and persists the
choice. All colour maths lives in `theme.css`, so the stylesheet is useful on its own — see
[Standalone consumption](#standalone-consumption).

## Token model

Every token stores **bare HSL channels** (`H S% L%`), not a finished colour. A `@theme` block
wraps each one in `hsl(var(--token))` to expose it as a Tailwind colour:

```css
:root  { --primary: 240 6% 16%; }
.dark  { --primary: 0 0% 95%; }

@theme { --color-primary: hsl(var(--primary)); }
/* -> utilities: bg-primary, text-primary, border-primary, … */
```

Storing channels (rather than `hsl(...)`) is what makes the token composable: the accent and
base blocks rewrite only the channels, and opacity modifiers (`bg-primary/10`) work because
Tailwind owns the `hsl()` wrapper.

## App-local token overlays

Apps need their own domain tokens — semantic status/severity colours, a link colour — layered
on top of the frame **without forking `theme.css`**. Declare them in your app's own CSS, after
the frame import, following the same channels-plus-`@theme` convention. This snippet is
copy-pasteable:

```css
@import "tailwindcss";
@import "@picoframe/frame/theme.css";

/* Register the utilities (bg-status-critical, text-link, …). */
@theme {
  --color-status-critical: hsl(var(--status-critical));
  --color-status-warning: hsl(var(--status-warning));
  --color-status-success: hsl(var(--status-success));
  --color-link: hsl(var(--link));
}

/* Light values. */
:root {
  --status-critical: 0 72% 45%;
  --status-warning: 33 92% 38%;
  --status-success: 142 71% 33%;
  --link: var(--primary); /* alias -> tracks the active accent, see below */
}

/* Dark values, using the frame's already-defined `dark` custom variant. */
.dark {
  --status-critical: 0 72% 58%;
  --status-warning: 38 92% 56%;
  --status-success: 142 66% 52%;
}
```

Notes:

- No `@custom-variant dark` needed — `theme.css` already declares it, so a `.dark` selector in
  your CSS works.
- The `@theme` block is only for tokens you want as Tailwind utilities. A token consumed only
  via `hsl(var(--token))` in your own CSS needs no registration.
- Overlay CSS must be scanned by Tailwind (its own source, or an `@source`), and any utility
  you use must appear as a **literal** class string — `` `bg-status-${x}` `` interpolation is
  never generated.

### Responding to accent / base

Whether an overlay should react to `data-accent` / `data-base` depends on the token's meaning:

- **Keep semantic colours literal.** Status/severity hues (critical = red, warning = amber)
  carry meaning that must not shift when the user changes accent or base. Give them literal
  channels and vary them only across light/dark. This mirrors the frame's own `--destructive`
  and `--chart-*`, which are deliberately excluded from the base retint.
- **Alias a token to follow the accent.** A link colour usually _should_ move with the brand.
  `--link: var(--primary)` resolves at use time against whichever accent is in scope, so it
  tracks `data-accent` automatically and needs no per-accent overrides or `.dark` value
  (`--primary` already flips per mode).
- **Follow the base ramp** by building a token from `--base-hue` / `--base-sat`, exactly as the
  neutral tokens do: `--surface-alt: var(--base-hue) calc(var(--base-sat) * 5%) 92%`. Use
  `--base-sat-text` instead for anything that renders as text. The vivid bases (crimson through
  fuchsia) push `--base-sat` past 5 to make surfaces read as a real colour, and text built on
  that knob would come out tinted to the point of distraction:
  `--muted-label: var(--base-hue) calc(var(--base-sat-text) * 4%) 46%`.

See [`apps/demo`](../../apps/demo/src/theme-overlay.tsx) (and its `index.css`) for a live
worked example — a "Theme overlay" view whose status pills hold their meaning across accents
while the link colour tracks the accent.

## Standalone consumption

`theme.css` is pure CSS with no JavaScript dependency (it's published as raw source at the
`@picoframe/frame/theme.css` export). You can adopt the **tokens first and the shell later** —
useful for an incremental migration — by importing it without `ThemeProvider` / `AppFrame`:

```css
@import "tailwindcss";
@source "../node_modules/@picoframe/frame/dist"; /* generate the frame's own utility classes */
@import "@picoframe/frame/theme.css";
```

You immediately get all tokens and colour utilities. Constraints while running without the
provider:

- You're locked to the **defaults**: light mode, neutral accent, zinc base. Nothing sets
  `.dark`, `data-accent`, or `data-base`, so those axes are inert until you either adopt
  `ThemeProvider` or toggle the attributes yourself (e.g. add `.dark` from your own
  `matchMedia` listener).
- `@theme` / utility generation requires the Tailwind v4 pipeline (`@import "tailwindcss"`
  present). The tokens themselves resolve in any browser, but `bg-*` utilities do not exist
  without the build step.
- The accent-change cross-fade and the animated `rainbow` / `opal` accents are driven by
  attributes the provider sets, so they stay dormant in standalone use.
