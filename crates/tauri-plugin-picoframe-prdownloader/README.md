# tauri-plugin-picoframe-prdownloader

The Rust half of the picoframe `prdownloader` plugin. It bundles the Spring/Recoil
[`pr-downloader`](https://github.com/beyond-all-reason/pr-downloader) tool as a
Tauri `externalBin` **sidecar** and exposes four commands (all returning the
picoframe `CliResult` envelope):

| Command | What it does |
|---|---|
| `prd_version` | Runs the sidecar's `--version` (proves the binary is bundled and runnable). |
| `prd_repos` | Fetches a rapid master index (`<master>/repos.gz`) and lists repositories. Default master `https://repos.springrts.com`, user-overridable. |
| `prd_versions` | Fetches a repository's `versions.gz` and lists downloadable tags. |
| `prd_download` | Runs the sidecar to download a rapid tag, parsing its log output into success/error. |

The sidecar is resolved next to the app executable (where Tauri's `externalBin`
bundling places it), so the plugin's ACL grant stays uniform with every other
picoframe plugin — just `picoframe-prdownloader:default`, no extra shell-execute
scope. `PRD_SIDECAR` overrides the path (handy for development).

## The sidecar binary (you must provide it)

`pr-downloader` has **no official standalone release**. It ships only bundled
inside [RecoilEngine](https://github.com/beyond-all-reason/RecoilEngine) release
archives, and **only for Linux x64 and Windows x64** — there is no official macOS
build (the engine does not yet build on macOS, though the `pr-downloader` tool
subdirectory does compile there on its own).

Bundle the binary at `src-tauri/binaries/pr-downloader-<target-triple>` (Tauri
strips the triple at bundle time). `picoframe add prdownloader` declares the
`externalBin` entry in `tauri.conf.json` but cannot produce the binary itself.

### Per platform

- **macOS** (`aarch64-apple-darwin` / `x86_64-apple-darwin`): build from source.
  pr-downloader is a CMake C/C++ project (deps: `curl`, `zlib`, `minizip`). A
  build produced via the RecoilEngine checkout (`tools/pr-downloader`) works.
  Caveat: such a build may link Homebrew dylibs (`minizip`, gcc `libstdc++`); for
  a distributable app those must be bundled/rpath-fixed or statically linked.
  `scripts/setup-prdownloader-macos.sh` copies a local build into an app.
- **Linux x64** (`x86_64-unknown-linux-gnu`) / **Windows x64**
  (`x86_64-pc-windows-msvc`): extract `pr-downloader[.exe]` from the matching
  RecoilEngine release archive, e.g.
  `https://github.com/beyond-all-reason/RecoilEngine/releases/download/<tag>/recoil_<tag>_amd64-<linux|windows>.7z`.
  (The exact path of the executable *inside* the archive is not verified here —
  inspect the `.7z` and place the binary at the `src-tauri/binaries/` path above.)

pr-downloader has no `--json` or list mode; output is human-readable log lines, so
`prd_download` relies on exit code + log-line matching, and content browsing uses
the rapid index files directly (see `prd_repos` / `prd_versions`).
