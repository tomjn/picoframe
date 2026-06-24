# CLAUDE.md

Project guidance for Claude Code.

**Read [AGENTS.md](AGENTS.md) first.** It explains the thing that most often trips up
agents here: picoframe has two separate `@picoframe/` distribution channels — the
`@picoframe/frame` npm package (which exports only `Button` and `Input` as UI
primitives) versus the `@picoframe/<component>` shadcn source registry (`select`,
`checkbox`, `textarea`, `form`, … — copied into apps via `shadcn add`, never exported
from frame). Do not look for registry components in `@picoframe/frame`.

See [README.md](README.md) for the workspace layout and commands.
