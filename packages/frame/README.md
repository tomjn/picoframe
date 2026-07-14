# @picoframe/frame

The reusable **Tauri v2 app-frame** React shell: collapsible grouped sidebar, top bar,
hash routing, forward/back navigation, slot composition, and theming. Apps are
assembled by composing full-stack plugins into the frame.

```bash
npm install @picoframe/frame
```

```tsx
import { AppFrame } from "@picoframe/frame";
import { plugins } from "./app.plugins";

createRoot(root).render(<AppFrame plugins={plugins} title="My app" />);
```

## What this package exports

| Export | What it is |
| --- | --- |
| `AppFrame` | The application shell component |
| `framePlugin` | Built-in plugin (home route launcher) |
| `useFrame`, `useNavigationStack`, `useDrawer` | Hooks |
| `ThemeProvider`, `useTheme` | Theming |
| `Slot` | Named slot for plugin contributions |
| `cn` | Class-name merge helper |
| `Button`, `Input` | The **only** UI primitives shipped here (see below) |
| `FramePlugin`, `NavGroup`, `NavItem`, `defineCommand`, … | Re-exported plugin-sdk contract |

## UI components: frame vs. the registry

picoframe has **two separate `@picoframe/` channels** — don't confuse them:

| | `@picoframe/frame` (this package) | `@picoframe/registry` |
| --- | --- | --- |
| How you get it | `import { Button } from "@picoframe/frame"` | `npx shadcn@latest add @picoframe/select` |
| Mechanism | compiled JS/`.d.ts` you import from npm | shadcn **source** registry — copies `.tsx` into your app |
| UI components | **only `Button` and `Input`** | `select`, `input`, `textarea`, `label`, `checkbox`, `radio-group`, `switch`, `slider`, `form`, `dialog`, `tooltip`, `popover`, `collapsible`, … |

`Button` and `Input` are exported here because **npm-published plugins** need
importable primitives (a plugin can't use the consumer app's copied-in registry
files). Every other component is app-level and lives in the registry, where the app
author owns the copied source. `Select`/`Checkbox`/`Textarea`/etc. will **never** be
exports of this package — use `shadcn add @picoframe/<name>`. See
[`../registry/README.md`](../registry/README.md) and the repo `AGENTS.md`.

## Drawer

One frame-managed drawer, opened from anywhere via `useDrawer()`. `open()` replaces the current
content; `close()` dismisses it. Esc and a backdrop click close it too.

```tsx
const { open } = useDrawer();
open({ title: "Details", content: <Details /> });
```

`open()` options:

| Option | Default | What it does |
| --- | --- | --- |
| `content` | — | The drawer body (required). |
| `direction` | `"right"` | `"left"` / `"right"` side sheet, or `"bottom"` bottom sheet. |
| `size` | `"md"` | `"sm"` / `"md"` / `"lg"` / `"full"` — a width (side) or height (bottom). |
| `width` / `height` | — | Explicit CSS size overriding `size` for that axis. |
| `container` | provider default → `document.body` | Portal target (see below). |
| `title`, `description` | — | Accessible name/description; omit to keep them screen-reader-only. |

### Container targeting

By default the drawer portals to `document.body` and covers the whole window (modal: scroll-locked,
focus-trapped). Pass a `container` — an `HTMLElement`, a `() => HTMLElement | null` (resolved lazily,
for targets that mount after the provider), or `null` — to portal into a bounded region instead. When
contained, the drawer switches to `absolute` positioning and a **non-modal** dialog, so its overlay is
scoped to that element and the rest of the app (e.g. the sidebar) stays interactive.

The container must be `position: relative` (and typically `overflow: hidden`, so the panel and scrim
respect its rounded corners):

```tsx
open({ direction: "bottom", size: "lg", container: () => panelRef.current, content: <Panel /> });
```

Set a **provider-level default** for every drawer via `<AppFrame drawer={{ container }} />`; a per-open
`container` overrides it. See the demo's "Drawer lab" page for a worked example.

### Native `<select>` caveat

The dialog focus trap fights the browser's native `<select>` popup, so a native `<select>` inside a
drawer misbehaves. Use the registry `select` component (`npx shadcn add @picoframe/select`) instead.

## Toasts & sidecar progress

The frame mounts a theme-aware toast surface (`Toaster`, built on [sonner](https://sonner.emilkowal.ski/)) automatically, and re-exports `toast` so a plugin can raise notifications without importing sonner or a registry component:

```tsx
import { toast } from "@picoframe/frame";
toast.success("Saved");
```

For plugins backed by a [sidecar](../../docs/sidecar.md) (a long-lived local server), `useSidecarProgress` drives a single self-updating toast from the sidecar's streamed progress:

```tsx
useSidecarProgress("picoframe://sidecar/worker"); // listens on ".../progress"
```

This progress primitive lives in the frame (not the registry) because npm-published plugins can only import from `@picoframe/frame`.

## Settings footer badge

The frame's Settings footer link can carry an indicator so an app can surface "something in
settings needs you" (e.g. a stale integration credential). `useSettingsBadge()` reads and sets
it from anywhere inside `<AppFrame>`:

```tsx
import { useSettingsBadge } from "@picoframe/frame";

const { setBadge } = useSettingsBadge();
useEffect(() => setBadge(credentialStale), [credentialStale]);
```

The badge value is `true` (an attention dot), a number (a count bubble), any other node
(rendered in the bubble), or `false`/`null` (nothing). It's a single shared slot — one
app-level owner, last writer wins.

## Theming

The frame's design tokens ship as `@picoframe/frame/theme.css` (mode / accent / base axes).
See [THEMING.md](THEMING.md) for the token model, a copy-pasteable **app-local token overlay**
snippet (semantic status/link tokens layered on without forking the theme), guidance on when an
overlay should track the accent/base, and how to consume `theme.css` standalone before adopting
`AppFrame`.

## License

MIT
