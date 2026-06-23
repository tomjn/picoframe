/**
 * `picoframe add <plugin>` — explicit, idempotent wiring of a first-party plugin
 * into an app: npm dep, Cargo dep, Rust builder call, frontend manifest entry,
 * and capability grant. Prints what changed; `--dry-run` previews without writing.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FIRST_PARTY, pluginNames } from "../naming";
import { buildCapability, serializeCapability } from "../wiring/capability";
import { insertCargoDependency, picoframeCargoRhs } from "../wiring/cargo";
import { insertPluginIntoManifest } from "../wiring/manifest";
import { insertNpmDependency, picoframeNpmSpec } from "../wiring/npm-deps";
import { insertPluginIntoBuilder } from "../wiring/rust-builder";
import { SIDECARS, insertExternalBin } from "../wiring/sidecar";
import { appPaths, assertApp } from "./app";

interface AddOptions {
  appDir: string;
  dryRun: boolean;
}

/** Lines present in `after` but not `before` — a lightweight added-lines diff. */
function addedLines(before: string, after: string): string[] {
  const prev = new Set(before.split("\n"));
  return after.split("\n").filter((l) => l.trim() && !prev.has(l));
}

function applyToFile(
  path: string,
  transform: (src: string) => string,
  dryRun: boolean,
  label: string,
): boolean {
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) {
    console.log(`  · ${label}: already present`);
    return false;
  }
  for (const line of addedLines(before, after)) console.log(`  + ${label}: ${line.trim()}`);
  if (!dryRun) writeFileSync(path, after);
  return true;
}

export function add(plugin: string, opts: AddOptions): void {
  if (!FIRST_PARTY.includes(plugin)) {
    throw new Error(`unknown plugin "${plugin}". Known: ${FIRST_PARTY.join(", ")}.`);
  }
  const names = pluginNames(plugin);
  const p = appPaths(opts.appDir);
  assertApp(p);

  console.log(`Wiring ${names.npmPackage} into ${p.root}${opts.dryRun ? " (dry run)" : ""}:`);

  let changed = false;
  changed = applyToFile(p.packageJson, (s) => insertNpmDependency(s, names.npmPackage, picoframeNpmSpec(s)), opts.dryRun, "package.json") || changed;
  changed = applyToFile(p.cargoToml, (s) => insertCargoDependency(s, names.crateName, picoframeCargoRhs(s)), opts.dryRun, "Cargo.toml") || changed;
  changed = applyToFile(p.mainRs, (s) => insertPluginIntoBuilder(s, names.crateName), opts.dryRun, "main.rs") || changed;
  changed = applyToFile(p.manifest, (s) => insertPluginIntoManifest(s, names), opts.dryRun, "app.plugins.ts") || changed;

  // Capability file: written directly (no marker insertion).
  const capPath = join(p.capabilitiesDir, names.capabilityFile);
  const capContent = serializeCapability(buildCapability(names));
  if (existsSync(capPath) && readFileSync(capPath, "utf8") === capContent) {
    console.log("  · capability: already present");
  } else {
    console.log(`  + capability: ${names.capabilityFile} (grants ${names.aclId}:default)`);
    if (!opts.dryRun) writeFileSync(capPath, capContent);
    changed = true;
  }

  // Sidecar plugins also declare an `externalBin` in tauri.conf.json. The binary
  // itself is built/fetched per platform, so we only wire the config and warn.
  const sidecar = SIDECARS[plugin];
  if (sidecar) {
    changed = applyToFile(p.tauriConf, (s) => insertExternalBin(s, sidecar), opts.dryRun, "tauri.conf.json") || changed;
    console.log(
      `  ! ${names.short} bundles a sidecar — provide the binary at ${sidecar.map((e) => `src-tauri/${e}-<target-triple>`).join(", ")}`,
    );
  }

  if (!changed) {
    console.log(`\n${names.short} is already fully wired. Nothing to do.`);
    return;
  }
  if (opts.dryRun) {
    console.log("\nDry run — no files written.");
    return;
  }
  console.log(`\nDone. Next: run \`bun install\` and rebuild (\`bun run dev\`) to pick up ${names.short}.`);
}
