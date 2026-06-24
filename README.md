# picoframe

A general-purpose, reusable **Tauri v2 app-frame** for building desktop apps from
composable full-stack plugins. picoframe gives you a ready-made application shell —
collapsible grouped sidebar, top bar, hash routing, forward/back navigation, slots,
and theming — so an app is assembled by wiring plugins together rather than rebuilding
the chrome each time. It is domain-agnostic.

Plugins are **full-stack**: a frontend half (nav, routes, slots, typed IPC bindings)
published to npm as `@picoframe/plugin-<x>`, and an optional backend half published to
crates.io as a `tauri-plugin-picoframe-<x>` crate.

## Repository layout

This is a [Bun workspace](https://bun.sh) (`packages/*`, `plugins/*`, `apps/*`) and a
Cargo workspace (`crates/*`, `apps/demo/src-tauri`) in one repo.

```
packages/
  plugin-sdk/   @picoframe/plugin-sdk   Manifest types + the defineCommand IPC helper
  frame/        @picoframe/frame        The React app-frame shell (sidebar, top bar, routing, slots, theme)
  cli/          @picoframe/cli          Wires plugins into an app: create / add / list / doctor
  registry/     @picoframe/registry     shadcn source registry (owned, copy-in primitives)
plugins/
  hello/        @picoframe/plugin-hello Example plugin: nav group, lazy routes, top-bar slot, typed IPC
apps/
  demo/         @picoframe/demo         Reference app composing the frame + hello plugin
crates/
  picoframe-core/                       Shared Rust core (e.g. native mouse-nav)
  tauri-plugin-picoframe-hello/         Backend half of the hello plugin
```

## Plugin naming

Tauri strips the `tauri-plugin-` prefix from a crate's `links` key to form the ACL
identifier, so the names line up as:

- crate `tauri-plugin-picoframe-<x>` (with `links == package.name`)
- ACL identifier `picoframe-<x>`, capability `picoframe-<x>:default`
- IPC call `invoke("plugin:picoframe-<x>|<cmd>")`
- npm package `@picoframe/plugin-<x>`

## Develop

```bash
bun install              # install workspace deps

bun run dev              # launch the demo app in a Tauri dev window
bun run build            # build the npm libraries (plugin-sdk -> frame -> hello) to dist/
bun run test             # run the Bun test suite
bun run typecheck        # type-check the whole workspace (no build required)
cargo build              # build the Rust crates + demo backend
```

## Components (`@picoframe/registry`)

shadcn-style primitives are distributed as a **source registry**: `shadcn add
@picoframe/<name>` copies the component into your own app so you own and customize it.
See [`packages/registry/README.md`](packages/registry/README.md) for the component list
and how to consume the registry.

## License

MIT
