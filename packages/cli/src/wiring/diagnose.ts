/**
 * The per-plugin wiring invariant: a plugin is correctly installed only when all
 * four wiring points agree — the Cargo dependency, the `.plugin(...)` builder
 * call, the capability grant, and the frontend manifest entry. A triad mismatch
 * (e.g. manifest entry present but capability missing) is the #1 silent
 * "not allowed by ACL" failure mode, so `doctor` checks all four independently.
 *
 * Sidecar plugins (those in {@link SIDECARS}) add a fifth point: their `externalBin`
 * entries must be declared in `tauri.conf.json`, or the bundled server binary won't ship.
 */
import { SIDECARS } from "./sidecar";

export interface WiringSources {
  cargoToml: string;
  mainRs: string;
  manifest: string;
  /** Contents of every file in `src-tauri/capabilities/`. */
  capabilities: string[];
  /** Contents of `src-tauri/tauri.conf.json` (for the sidecar `externalBin` check). */
  tauriConf: string;
}

export interface PluginDiagnosis {
  name: string;
  cargoDep: boolean;
  builderCall: boolean;
  capability: boolean;
  manifest: boolean;
  /** `true` when the plugin is not a sidecar, or its `externalBin` entries are all declared. */
  sidecar: boolean;
  /** Whether this plugin bundles a sidecar (drives whether `sidecar` is shown by `doctor`). */
  hasSidecar: boolean;
  ok: boolean;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Discover every plugin short-name referenced by any wiring point, then check each. */
export function diagnose(s: WiringSources): PluginDiagnosis[] {
  const shorts = new Set<string>();
  for (const m of s.cargoToml.matchAll(/tauri-plugin-picoframe-([a-z0-9-]+)\s*=/g)) shorts.add(m[1]);
  for (const m of s.mainRs.matchAll(/tauri_plugin_picoframe_([a-z0-9_]+)::init\(\)/g))
    shorts.add(m[1].replace(/_/g, "-"));
  for (const m of s.manifest.matchAll(/@picoframe\/plugin-([a-z0-9-]+)/g)) shorts.add(m[1]);
  for (const cap of s.capabilities)
    for (const m of cap.matchAll(/picoframe-([a-z0-9-]+):default/g)) shorts.add(m[1]);

  return [...shorts].sort().map((name) => {
    const ident = name.replace(/-/g, "_");
    const cargoDep = new RegExp(`tauri-plugin-picoframe-${escape(name)}\\s*=`).test(s.cargoToml);
    const builderCall = new RegExp(`tauri_plugin_picoframe_${escape(ident)}::init\\(\\)`).test(s.mainRs);
    const manifest = new RegExp(`@picoframe/plugin-${escape(name)}\\b`).test(s.manifest);
    const capability = s.capabilities.some((c) =>
      new RegExp(`picoframe-${escape(name)}:default`).test(c),
    );
    // Sidecar plugins must declare every `externalBin` entry in tauri.conf.json; non-sidecar
    // plugins have nothing extra to check (`sidecar` stays true).
    const entries = SIDECARS[name];
    const hasSidecar = entries != null;
    const sidecar = !hasSidecar || entries.every((e) => s.tauriConf.includes(`"${e}"`));
    return {
      name,
      cargoDep,
      builderCall,
      capability,
      manifest,
      sidecar,
      hasSidecar,
      ok: cargoDep && builderCall && capability && manifest && sidecar,
    };
  });
}
