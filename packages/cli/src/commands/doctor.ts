/**
 * `picoframe doctor` — verify the per-plugin wiring invariant across the app.
 * Exits non-zero if any referenced plugin is only partially wired.
 */
import { existsSync, readFileSync } from "node:fs";
import { diagnose, type PluginDiagnosis } from "../wiring/diagnose";
import { appPaths, assertApp, readCapabilities } from "./app";

const tick = (b: boolean) => (b ? "ok " : "MISSING");

function reportLine(d: PluginDiagnosis): string {
  const parts = [
    `cargo:${tick(d.cargoDep)}`,
    `builder:${tick(d.builderCall)}`,
    `capability:${tick(d.capability)}`,
    `manifest:${tick(d.manifest)}`,
  ];
  // Only sidecar plugins have an externalBin to verify; hide the column for the rest.
  if (d.hasSidecar) parts.push(`sidecar:${tick(d.sidecar)}`);
  return `${d.ok ? "PASS" : "FAIL"}  ${d.name.padEnd(14)} ${parts.join("  ")}`;
}

export function doctor(appDir: string): number {
  const p = appPaths(appDir);
  assertApp(p);
  const results = diagnose({
    cargoToml: readFileSync(p.cargoToml, "utf8"),
    mainRs: readFileSync(p.mainRs, "utf8"),
    manifest: readFileSync(p.manifest, "utf8"),
    capabilities: readCapabilities(p),
    tauriConf: existsSync(p.tauriConf) ? readFileSync(p.tauriConf, "utf8") : "",
  });

  if (results.length === 0) {
    console.log("No picoframe plugins wired into this app.");
    return 0;
  }

  console.log(`Checking ${results.length} plugin(s) in ${p.root}:\n`);
  for (const d of results) console.log(reportLine(d));

  const broken = results.filter((d) => !d.ok);
  if (broken.length) {
    console.log(`\n${broken.length} plugin(s) partially wired. Re-run \`picoframe add <plugin>\` to repair.`);
    return 1;
  }
  console.log("\nAll plugins fully wired.");
  return 0;
}
