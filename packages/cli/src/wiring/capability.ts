/**
 * Per-app Tauri capability file generation for a picoframe plugin.
 *
 * The ACL identifier is the crate name with a leading `tauri-plugin-` stripped
 * (Tauri's own derivation — see tauri-utils acl/build.rs). Granting
 * `<identifier>:default` enables the plugin's default command set on the window.
 */

/** Crate name -> Tauri ACL identifier (e.g. `tauri-plugin-picoframe-hello` -> `picoframe-hello`). */
export function aclIdentifier(crateName: string): string {
  return crateName.replace(/^tauri-plugin-/, "");
}

export interface Capability {
  $schema: string;
  identifier: string;
  description: string;
  windows: string[];
  permissions: string[];
}

/** Build the capability object granting a plugin's default permission set. */
export function buildCapability(crateName: string): Capability {
  const id = aclIdentifier(crateName);
  return {
    $schema: "../gen/schemas/desktop-schema.json",
    identifier: id,
    description: `Grants the ${id} plugin's default commands to the main window.`,
    windows: ["main"],
    permissions: [`${id}:default`],
  };
}
