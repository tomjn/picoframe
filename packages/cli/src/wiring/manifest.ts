/**
 * Marker-anchored editing of an app's `src/app.plugins.ts` — the single visible,
 * CLI-edited plugin list. Two marker regions: one for the default imports, one
 * for the entries in the `plugins` array.
 */
import type { PluginNames } from "../naming";
import { insertBetweenMarkers } from "./markers";

export const IMPORTS_START = "// picoframe:imports-start";
export const IMPORTS_END = "// picoframe:imports-end";
export const PLUGINS_START = "// picoframe:plugins-start";
export const PLUGINS_END = "// picoframe:plugins-end";

/** `import helloPlugin from "@picoframe/plugin-hello";` */
export function importLine(names: PluginNames): string {
  return `import ${names.importBinding} from "${names.npmPackage}";`;
}

/** `  helloPlugin,` (2-space indent, matching the array body). */
export function arrayEntry(names: PluginNames): string {
  return `  ${names.importBinding},`;
}

/** Insert a plugin's import + array entry between their markers. Idempotent. */
export function insertPluginIntoManifest(source: string, names: PluginNames): string {
  const withImport = insertBetweenMarkers(source, IMPORTS_START, IMPORTS_END, importLine(names));
  return insertBetweenMarkers(withImport, PLUGINS_START, PLUGINS_END, arrayEntry(names));
}
