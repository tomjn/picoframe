# @picoframe/registry

A [shadcn](https://ui.shadcn.com) **source** registry. It ships picoframe's shadcn
primitives as source you copy into your own app — `shadcn add @picoframe/button`
writes `button.tsx` into your project so you own and customize it. It is **not** an
npm package you import from.

Components: `accordion`, `alert`, `alert-dialog`, `aspect-ratio`, `avatar`,
`badge`, `breadcrumb`, `button`, `calendar`, `card`, `carousel`, `chart`,
`checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`,
`dropdown-menu`, `form`, `hover-card`, `input`, `input-otp`, `label`, `menubar`,
`navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`,
`resizable`, `scroll-area`, `select`, `separator`, `sheet`, `skeleton`,
`slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toggle`,
`toggle-group`, `tooltip` (plus the `utils` `cn` helper, pulled in
automatically).

These are the current Tailwind v4 / React 19 shadcn sources and consume the
picoframe theme tokens (`bg-primary`, `border-input`, `bg-accent`, `ring-ring`,
etc.) defined in `@picoframe/frame/theme.css`.

## Consume from this GitHub source registry

Add the `@picoframe` namespace to your app's `components.json`. The `{name}`
placeholder is replaced with the component name at install time:

```json
{
  "registries": {
    "@picoframe": "https://raw.githubusercontent.com/tomjn/picoframe/main/packages/registry/public/r/{name}.json"
  }
}
```

Then install a component. Its registry dependencies (`utils`, and for `dialog`
also `button`) are resolved and added automatically:

```bash
npx shadcn@latest add @picoframe/button
npx shadcn@latest add @picoframe/dialog
npx shadcn@latest add @picoframe/select
```

You can also add directly by raw URL without configuring the namespace:

```bash
npx shadcn@latest add https://raw.githubusercontent.com/tomjn/picoframe/main/packages/registry/public/r/button.json
```

## Dependencies a consumer needs

`shadcn add` installs npm dependencies for you, but for reference each component
declares:

- Most UI components: `radix-ui` (plain-element components like `input`,
  `textarea`, `skeleton`, `table`, `card`, `alert`, `badge` need none)
- `button`, `toggle`, `badge`: also `class-variance-authority`
- `dialog`, `select`, `checkbox`, `radio-group`, `calendar`, `chart`, `sonner`
  and other icon-using components: also `lucide-react`
- `form`: also `react-hook-form`
- `chart`: also `recharts`
- `calendar`: also `react-day-picker`, `date-fns`
- `command`: also `cmdk`
- `drawer`: also `vaul`
- `carousel`: also `embla-carousel-react`
- `input-otp`: also `input-otp`
- `resizable`: also `react-resizable-panels`
- `sonner`: also `sonner` and `@picoframe/frame` (its `Toaster` reads the active
  light/dark appearance from the frame's `useTheme`)
- `utils`: `clsx`, `tailwind-merge`

## Chart sizing

`chart` deliberately does **not** use Recharts' `ResponsiveContainer`. That
container runs its own `ResizeObserver`, and inside a Tauri WKWebView it
transiently reports `-1` width/height during Suspense transitions and tab
switches - spamming `width(-1) and height(-1)` warnings and racing layout.

Instead `ChartContainer` measures its own element with an explicit
`ResizeObserver`, discards any non-positive reading, and only renders the chart
once it has a real positive size - which it then passes to the chart as explicit
`width`/`height`. The child must be a single Recharts chart element (e.g.
`<LineChart>`); the container clones it to inject the measured dimensions.

## Layout

```
registry.json              # registry index (source of truth)
registry/default/ui/*.tsx  # component sources
registry/default/lib/utils.ts
public/r/*.json            # built, served registry items (commit these)
```

## Build

The served `public/r/*.json` files are generated from `registry.json` and the
component sources by the shadcn CLI:

```bash
bun run registry:build   # runs `shadcn build`, writes public/r/
```

Re-run after editing any component source or `registry.json`, and commit the
regenerated `public/r/` output.
