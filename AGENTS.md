# AGENTS.md

Guidance for AI agents and contributors working in **picoframe**. Read this before
reasoning about where a UI component lives — it covers the single most common point
of confusion in this repo.

## Two `@picoframe/` channels — do not confuse them

picoframe distributes UI through **two completely separate channels**. Both use the
`@picoframe/` prefix, but they resolve in totally different ways:

### 1. `@picoframe/frame` — an npm package you import

A normal published npm package. It exports the app-frame shell plus a deliberately
**minimal** set of importable UI primitives:

```ts
import { AppFrame, Button, Input, useFrame, Slot, cn } from "@picoframe/frame";
```

The **only** UI components it exports are **`Button` and `Input`**. That is intentional
(see the rule below), not an oversight or a missing build step.

### 2. `@picoframe/<component>` — shadcn registry items you copy in

`select`, `input`, `textarea`, `label`, `checkbox`, `radio-group`, `switch`, `slider`,
`form`, `button`, `dialog`, `tooltip`, `popover`, `collapsible` are **shadcn
source-registry items, NOT npm packages**. They are served as JSON over HTTP from
`packages/registry/public/r/` and copied into a consumer app:

```bash
npx shadcn@latest add @picoframe/select
```

That command writes `select.tsx` into the consumer's `components/ui/` so the app owns
the source.

> **They will NEVER appear in `@picoframe/frame`'s exports, its `dist/`, its
> `package.json` subpath exports, or in `node_modules`.** If you are looking for
> `Select` / `Checkbox` / `Textarea` as a frame import and not finding it, you are in
> the wrong channel — use `shadcn add @picoframe/<name>`. Nothing is broken.

## The export-boundary rule

- **`@picoframe/frame` exports only the primitives that npm-published plugins must be
  able to `import`.** Plugins are libraries; they cannot reach a consumer app's
  copied-in registry files, so frame ships `Button` / `Input` for them. A new
  component is added to frame's exports *only* if a plugin needs to import it.
- **Everything app-level lives in the registry** (`packages/registry`) and is consumed
  via `shadcn add`. The app author owns the copied source.

When adding a new shadcn component, it goes in `packages/registry`
(see `packages/registry/README.md`) — **not** into `@picoframe/frame`.

## Orientation

See [README.md](README.md) for the workspace layout and commands.
