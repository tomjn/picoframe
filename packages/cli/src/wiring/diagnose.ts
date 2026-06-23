/**
 * The per-plugin wiring invariant: a plugin is correctly installed only when all
 * four wiring points agree — the Cargo dependency, the `.plugin(...)` builder
 * call, the capability grant, and the frontend manifest entry. A triad mismatch
 * (e.g. manifest entry present but capability missing) is the #1 silent
 * "not allowed by ACL" failure mode, so `doctor` checks all four independently.
 */

export interface WiringSources {
  cargoToml: string;
  mainRs: string;
  manifest: string;
  /** Contents of every file in `src-tauri/capabilities/`. */
  capabilities: string[];
}

export interface PluginDiagnosis {
  name: string;
  cargoDep: boolean;
  builderCall: boolean;
  capability: boolean;
  manifest: boolean;
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
    return { name, cargoDep, builderCall, capability, manifest, ok: cargoDep && builderCall && capability && manifest };
  });
}
