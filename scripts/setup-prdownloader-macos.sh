#!/usr/bin/env bash
# Place a locally-built macOS pr-downloader binary into a picoframe app as the
# Tauri externalBin sidecar. macOS has no official pr-downloader release, so the
# binary must be built from source (see the plugin crate README); this script
# only copies an existing build into the right place with the right name.
#
# Usage:
#   scripts/setup-prdownloader-macos.sh [APP_DIR] [SOURCE_BINARY]
#
#   APP_DIR        picoframe app to install into (default: apps/demo)
#   SOURCE_BINARY  built pr-downloader binary (default: $PRD_SOURCE)
#
# The sidecar is named pr-downloader-<target-triple>; Tauri strips the triple at
# bundle time and (via tauri-build) copies it next to the app binary.
set -euo pipefail

APP_DIR="${1:-apps/demo}"
SOURCE="${2:-${PRD_SOURCE:-}}"

if [[ -z "$SOURCE" ]]; then
  echo "error: no source binary. Pass it as the 2nd arg or set PRD_SOURCE to a built pr-downloader." >&2
  echo "       Build it from source (CMake) — see crates/tauri-plugin-picoframe-prdownloader/README.md." >&2
  exit 1
fi
if [[ ! -x "$SOURCE" ]]; then
  echo "error: $SOURCE is not an executable file." >&2
  exit 1
fi

case "$(uname -m)" in
  arm64) TRIPLE="aarch64-apple-darwin" ;;
  x86_64) TRIPLE="x86_64-apple-darwin" ;;
  *) echo "error: unsupported macOS arch $(uname -m)." >&2; exit 1 ;;
esac

DEST_DIR="$APP_DIR/src-tauri/binaries"
DEST="$DEST_DIR/pr-downloader-$TRIPLE"
mkdir -p "$DEST_DIR"
cp "$SOURCE" "$DEST"
chmod +x "$DEST"

echo "Installed sidecar: $DEST"
"$DEST" --version || { echo "warning: the binary did not run cleanly." >&2; exit 1; }
echo "Done. Build the app (\`cargo build\` / \`bun run dev\`) to bundle it."
