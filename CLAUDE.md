# CLAUDE.md

Project guidance for Claude Code.

**Read [AGENTS.md](AGENTS.md) first.** It explains the thing that most often trips up
agents here: picoframe has two separate `@picoframe/` distribution channels — the
`@picoframe/frame` npm package (which exports only `Button` and `Input` as UI
primitives) versus the `@picoframe/<component>` shadcn source registry (`select`,
`checkbox`, `textarea`, `form`, … — copied into apps via `shadcn add`, never exported
from frame). Do not look for registry components in `@picoframe/frame`.

See [README.md](README.md) for the workspace layout and commands.

## Releasing

**Never run `npm publish` yourself, and never pass `--otp`.** The maintainer publishes,
and handles the one-time password in the browser. Asking for a token, or running the
publish with a token you do not have, is the failure this section exists to stop.

All six npm packages share one version, bumped in lockstep even when only one changed,
so the scaffold template can pin a single number. The crates version separately and are
usually left alone.

Do all of this, then stop and print the publish commands for the maintainer to paste:

1. Bump `version` in `packages/plugin-sdk`, `packages/frame`, `packages/store`,
   `packages/cli`, `plugins/hello`, `plugins/worker`, and the three `@picoframe/*`
   dependency ranges in `packages/cli/templates/app/package.json`.
2. Commit as `release <version>` on `main`, with a line on why the bump is major, minor
   or patch, and push.
3. `bun run build && bun run test && bun run typecheck`.
4. Confirm each package has a built `dist/`, and that the change is actually in it.
5. Print, in dependency order:

```
cd ~/dev/pico-frame
npm publish ./packages/plugin-sdk
npm publish ./packages/frame
npm publish ./packages/store
npm publish ./plugins/hello
npm publish ./plugins/worker
npm publish ./packages/cli
```
