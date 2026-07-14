/**
 * Compile the worker sidecar (`sidecar/server.ts`) into a standalone binary named for Tauri's
 * `externalBin` convention: `<base>-<target-triple>`. Tauri copies it next to the app
 * executable at bundle time (and under `tauri dev`), where `picoframe_core::sidecar` resolves
 * it. Under `tauri dev` this step is optional — the plugin falls back to `bun run server.ts`.
 *
 * Usage: `bun run scripts/build-sidecar.ts [outputDir]`
 * Default outputDir: the demo app's `src-tauri/binaries`.
 */
import { $ } from "bun";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "picoframe-worker-sidecar";

/** Map the host platform/arch to the Rust target triple Tauri expects in the filename. */
function hostTriple(): string {
  const key = `${process.platform}-${process.arch}`;
  const triples: Record<string, string> = {
    "darwin-arm64": "aarch64-apple-darwin",
    "darwin-x64": "x86_64-apple-darwin",
    "linux-x64": "x86_64-unknown-linux-gnu",
    "linux-arm64": "aarch64-unknown-linux-gnu",
    "win32-x64": "x86_64-pc-windows-msvc",
  };
  const triple = triples[key];
  if (!triple) throw new Error(`unsupported host ${key}; add its triple to build-sidecar.ts`);
  return triple;
}

const here = dirname(fileURLToPath(import.meta.url));
const server = resolve(here, "../sidecar/server.ts");
const outDir = resolve(process.argv[2] ?? join(here, "../../../apps/demo/src-tauri/binaries"));
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const suffix = process.platform === "win32" ? ".exe" : "";
const outfile = join(outDir, `${BASE}-${hostTriple()}${suffix}`);

console.log(`Compiling ${server}\n       -> ${outfile}`);
await $`bun build ${server} --compile --outfile ${outfile}`;
console.log("Done.");
