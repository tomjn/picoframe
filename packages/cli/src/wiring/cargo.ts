/**
 * Add a plugin crate to an app's `src-tauri/Cargo.toml` `[dependencies]` table.
 * We append within the section (after the last dependency) using a workspace
 * inheritance reference, matching how the demo and template are wired.
 */

/**
 * `tauri-plugin-picoframe-hello = { workspace = true }`, or with an explicit
 * right-hand side (e.g. `"0.0.1"`) for a standalone app outside a workspace.
 */
export function depLine(crateName: string, rhs = "{ workspace = true }"): string {
  return `${crateName} = ${rhs}`;
}

/**
 * The right-hand side the app uses for its picoframe crates, read from
 * `picoframe-core`. The monorepo demo inherits via `{ workspace = true }`; a
 * standalone `create` app pins a published `"0.0.1"`. `add` mirrors this so a
 * new plugin crate matches. Falls back to workspace inheritance when core is
 * absent.
 */
export function picoframeCargoRhs(source: string): string {
  return source.match(/^\s*picoframe-core\s*=\s*(.+?)\s*$/m)?.[1] ?? "{ workspace = true }";
}

/**
 * Insert a crate dependency into the `[dependencies]` table. Idempotent (no-op
 * if the crate is already a dependency). Throws if there is no `[dependencies]`
 * section.
 */
export function insertCargoDependency(source: string, crateName: string, rhs?: string): string {
  const lines = source.split("\n");
  const header = lines.findIndex((l) => l.trim() === "[dependencies]");
  if (header === -1) {
    throw new Error("[dependencies] section not found in Cargo.toml");
  }

  // Section runs until the next table header (or end of file).
  let end = lines.length;
  for (let i = header + 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith("[")) {
      end = i;
      break;
    }
  }

  // Idempotent: already a dependency?
  for (let i = header + 1; i < end; i++) {
    const t = lines[i].trim();
    if (t.startsWith(`${crateName} `) || t.startsWith(`${crateName}=`)) {
      return source;
    }
  }

  // Insert after the last non-empty line in the section (before any trailing blank line).
  let insertAt = header + 1;
  for (let i = header + 1; i < end; i++) {
    if (lines[i].trim() !== "") insertAt = i + 1;
  }

  lines.splice(insertAt, 0, depLine(crateName, rhs));
  return lines.join("\n");
}
