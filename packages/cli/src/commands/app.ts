/** Resolve the files the CLI edits within a picoframe app directory. */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface AppPaths {
  root: string;
  packageJson: string;
  cargoToml: string;
  mainRs: string;
  manifest: string;
  capabilitiesDir: string;
  tauriConf: string;
}

export function appPaths(root: string): AppPaths {
  return {
    root,
    packageJson: join(root, "package.json"),
    cargoToml: join(root, "src-tauri", "Cargo.toml"),
    mainRs: join(root, "src-tauri", "src", "main.rs"),
    manifest: join(root, "src", "app.plugins.ts"),
    capabilitiesDir: join(root, "src-tauri", "capabilities"),
    tauriConf: join(root, "src-tauri", "tauri.conf.json"),
  };
}

/** Verify `root` looks like a picoframe app, throwing a clear error otherwise. */
export function assertApp(p: AppPaths): void {
  const missing = [p.packageJson, p.cargoToml, p.mainRs, p.manifest].filter((f) => !existsSync(f));
  if (missing.length) {
    throw new Error(
      `${p.root} does not look like a picoframe app (missing: ${missing.map((m) => m.replace(`${p.root}/`, "")).join(", ")}).\n` +
        "Run this from an app directory, or pass --app <dir>.",
    );
  }
}

/** Read every capability file's contents (empty array if the dir is absent). */
export function readCapabilities(p: AppPaths): string[] {
  if (!existsSync(p.capabilitiesDir)) return [];
  return readdirSync(p.capabilitiesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readFileSync(join(p.capabilitiesDir, f), "utf8"));
}
