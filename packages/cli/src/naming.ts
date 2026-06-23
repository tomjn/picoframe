/**
 * Single source of truth for picoframe plugin naming. Everything derives from
 * the short plugin name (e.g. `hello`), so the CLI, wiring, and doctor agree.
 *
 * Tauri forces a plugin's ACL identifier to equal its crate name minus the
 * `tauri-plugin-` prefix, so `tauri-plugin-picoframe-hello` -> `picoframe-hello`.
 * See the plan's "Plugin ACL identifier" note.
 */
export interface PluginNames {
  /** Short name, e.g. `hello`. The user-facing argument to `picoframe add`. */
  short: string;
  /** npm package, e.g. `@picoframe/plugin-hello`. */
  npmPackage: string;
  /** Cargo crate, e.g. `tauri-plugin-picoframe-hello`. */
  crateName: string;
  /** Rust path identifier (crate name with `-` -> `_`). */
  rustIdent: string;
  /** Tauri ACL identifier used in `Builder::new`, capabilities, and `invoke`. */
  aclId: string;
  /** The capability file's own `identifier` field (the short name). */
  capabilityIdentifier: string;
  /** Capability filename under `src-tauri/capabilities/`. */
  capabilityFile: string;
  /** Default-import binding used in `app.plugins.ts`, e.g. `helloPlugin`. */
  importBinding: string;
}

function camel(short: string): string {
  return short.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

export function pluginNames(short: string): PluginNames {
  const crateName = `tauri-plugin-picoframe-${short}`;
  return {
    short,
    npmPackage: `@picoframe/plugin-${short}`,
    crateName,
    rustIdent: crateName.replace(/-/g, "_"),
    aclId: `picoframe-${short}`,
    capabilityIdentifier: short,
    capabilityFile: `${short}.json`,
    importBinding: `${camel(short)}Plugin`,
  };
}

/** First-party plugins the CLI knows how to wire. */
export const FIRST_PARTY: readonly string[] = ["hello"];
