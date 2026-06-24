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
| `useFrame`, `useNavigationStack` | Hooks |
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

## License

MIT
