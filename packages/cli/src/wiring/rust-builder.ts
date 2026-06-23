/**
 * Marker-anchored editing of an app's `src-tauri/src/main.rs` Tauri builder.
 *
 * The template ships explicit anchors:
 *
 *   let mut builder = tauri::Builder::default()
 *       .plugin(picoframe_core::init());
 *   // picoframe:plugins-start
 *   // picoframe:plugins-end
 *
 * `picoframe add` inserts one `builder = builder.plugin(<ident>::init());` line
 * per plugin between the markers, kept sorted and idempotent. We anchor on
 * comment markers rather than parsing Rust, so the edit is robust and reviewable.
 */

export const PLUGINS_START = "// picoframe:plugins-start";
export const PLUGINS_END = "// picoframe:plugins-end";

/** Cargo crate name -> Rust path identifier (`-` is not legal in a path). */
export function rustIdent(crateName: string): string {
  return crateName.replace(/-/g, "_");
}

/** The exact builder line for a plugin crate, including indentation. */
export function pluginLine(crateName: string): string {
  return `    builder = builder.plugin(${rustIdent(crateName)}::init());`;
}

/**
 * Insert a plugin's builder line between the markers. Returns the source
 * unchanged if the plugin is already present (idempotent). Throws if the
 * markers are missing — the caller decides whether to warn-and-append.
 */
export function insertPluginIntoBuilder(source: string, crateName: string): string {
  const line = pluginLine(crateName);
  const lines = source.split("\n");
  const startIdx = lines.findIndex((l) => l.includes(PLUGINS_START));
  const endIdx = lines.findIndex((l) => l.includes(PLUGINS_END));
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error("picoframe plugin markers not found in main.rs");
  }

  const between = lines.slice(startIdx + 1, endIdx);
  if (between.some((l) => l.trim() === line.trim())) {
    return source;
  }

  const updated = [...between, line].sort((a, b) => a.localeCompare(b));
  return [...lines.slice(0, startIdx + 1), ...updated, ...lines.slice(endIdx)].join("\n");
}
