/**
 * Per-app Tauri capability file generation for a picoframe plugin.
 *
 * A capability has two distinct names: its own `identifier` (an arbitrary unique
 * label — we use the short plugin name) and the ACL permission string it grants
 * (`picoframe-<short>:default`, the plugin's real ACL id). Only the latter is
 * load-bearing for Tauri; the former just has to be unique among capabilities.
 */
import type { PluginNames } from "../naming";

export interface Capability {
  $schema: string;
  identifier: string;
  description: string;
  windows: string[];
  permissions: string[];
}

/** Build the capability object granting a plugin's default permission set. */
export function buildCapability(names: PluginNames): Capability {
  return {
    $schema: "../gen/schemas/desktop-schema.json",
    identifier: names.capabilityIdentifier,
    description: `Grants the ${names.short} plugin's default commands to the main window.`,
    windows: ["main"],
    permissions: [`${names.aclId}:default`],
  };
}

/**
 * Serialize a capability to the exact on-disk format picoframe uses: 2-space
 * indent, single-line string arrays, trailing newline. We template it rather
 * than `JSON.stringify` because the latter expands one-element arrays across
 * multiple lines, which would not match the hand-authored demo file.
 */
export function serializeCapability(c: Capability): string {
  const arr = (xs: string[]) => `[${xs.map((x) => `"${x}"`).join(", ")}]`;
  return `{
  "$schema": "${c.$schema}",
  "identifier": "${c.identifier}",
  "description": "${c.description}",
  "windows": ${arr(c.windows)},
  "permissions": ${arr(c.permissions)}
}
`;
}
