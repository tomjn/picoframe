# @picoframe/registry

A [shadcn](https://ui.shadcn.com) **source** registry. It ships picoframe's shadcn
primitives as source you copy into your own app — `shadcn add @picoframe/button`
writes `button.tsx` into your project so you own and customize it. It is **not** an
npm package you import from.

Components: `button`, `dialog`, `tooltip`, `popover`, `collapsible`, `select`
(plus the `utils` `cn` helper, pulled in automatically).

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

- All UI components: `radix-ui`
- `button`: also `class-variance-authority`
- `dialog`, `select`: also `lucide-react`
- `utils`: `clsx`, `tailwind-merge`

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
