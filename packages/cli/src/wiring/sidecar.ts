/**
 * Sidecar wiring. A few plugins (e.g. prdownloader) bundle an external binary as
 * a Tauri `externalBin`. That binary must be declared in the app's
 * `tauri.conf.json` `bundle.externalBin` array — the one wiring point beyond the
 * uniform five (npm dep, Cargo dep, builder call, manifest entry, capability).
 *
 * The binary file itself can't be produced by the CLI (it is built/fetched per
 * platform); `add` declares the config and prints a setup note instead.
 */

/** Short plugin name -> `externalBin` config entries (target-triple stripped). */
export const SIDECARS: Record<string, string[]> = {
  prdownloader: ["binaries/pr-downloader"],
};

const BUNDLE_RE = /^(\s*)"bundle"\s*:\s*\{/;

/** `"externalBin": ["binaries/pr-downloader"],` with the given indent. */
export function externalBinLine(entries: string[], indent: string): string {
  return `${indent}"externalBin": [${entries.map((e) => `"${e}"`).join(", ")}],`;
}

/**
 * Insert an `externalBin` array as the first key of the `bundle` object in a
 * `tauri.conf.json` text. Idempotent (no-op if `externalBin` is already present).
 * Edited as text to keep the rest of the file byte-for-byte intact. Throws if
 * there is no `bundle` object.
 */
export function insertExternalBin(source: string, entries: string[]): string {
  if (/"externalBin"\s*:/.test(source)) return source;
  const lines = source.split("\n");
  const idx = lines.findIndex((l) => BUNDLE_RE.test(l));
  if (idx === -1) {
    throw new Error('"bundle" object not found in tauri.conf.json');
  }
  const bundleIndent = lines[idx].match(BUNDLE_RE)?.[1] ?? "  ";
  const childIndent = `${bundleIndent}  `;
  lines.splice(idx + 1, 0, externalBinLine(entries, childIndent));
  return lines.join("\n");
}
