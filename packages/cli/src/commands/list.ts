/**
 * `picoframe list` — first-party plugins and whether each is wired into this app.
 */
import { readFileSync } from "node:fs";
import { FIRST_PARTY, pluginNames } from "../naming";
import { diagnose } from "../wiring/diagnose";
import { appPaths, assertApp, readCapabilities } from "./app";

export function list(appDir: string): void {
  const p = appPaths(appDir);
  assertApp(p);
  const results = diagnose({
    cargoToml: readFileSync(p.cargoToml, "utf8"),
    mainRs: readFileSync(p.mainRs, "utf8"),
    manifest: readFileSync(p.manifest, "utf8"),
    capabilities: readCapabilities(p),
  });
  const byName = new Map(results.map((d) => [d.name, d]));

  console.log(`First-party plugins (app: ${p.root}):\n`);
  for (const short of FIRST_PARTY) {
    const names = pluginNames(short);
    const d = byName.get(short);
    const status = !d ? "not installed" : d.ok ? "installed" : "partially wired";
    console.log(`  ${short.padEnd(14)} ${names.npmPackage.padEnd(26)} ${status}`);
  }
}
