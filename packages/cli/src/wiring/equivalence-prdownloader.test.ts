/**
 * Equivalence test for the sidecar plugin: `picoframe add prdownloader` must
 * reproduce the demo's prdownloader wiring byte-for-byte. Mirrors the hello
 * equivalence test, plus the one extra wiring point a sidecar needs — the
 * `externalBin` entry in `tauri.conf.json`. For each edited file we derive the
 * "before" state by reversing the prdownloader wiring (leaving hello in place),
 * then assert that applying the wiring reproduces the committed demo exactly.
 */
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { pluginNames } from "../naming";
import { buildCapability, serializeCapability } from "./capability";
import { depLine, insertCargoDependency } from "./cargo";
import { arrayEntry, importLine, insertPluginIntoManifest } from "./manifest";
import { insertNpmDependency } from "./npm-deps";
import { insertPluginIntoBuilder, pluginLine } from "./rust-builder";
import { insertExternalBin } from "./sidecar";

const repoRoot = `${import.meta.dir}/../../../..`;
const demo = (rel: string) => readFileSync(`${repoRoot}/apps/demo/${rel}`, "utf8");
const names = pluginNames("prdownloader");
const EXTERNAL_BIN = ["binaries/pr-downloader"];

test("main.rs: add prdownloader reproduces the demo builder", () => {
  const after = demo("src-tauri/src/main.rs");
  const before = after.replace(`\n${pluginLine(names.crateName)}`, "");
  expect(before).not.toBe(after);
  expect(insertPluginIntoBuilder(before, names.crateName)).toBe(after);
});

test("Cargo.toml: add prdownloader reproduces the demo dependency", () => {
  const after = demo("src-tauri/Cargo.toml");
  const before = after.replace(`\n${depLine(names.crateName)}`, "");
  expect(before).not.toBe(after);
  expect(insertCargoDependency(before, names.crateName)).toBe(after);
});

test("package.json: add prdownloader reproduces the demo dependency", () => {
  const after = demo("package.json");
  const before = after.replace(`\n    "${names.npmPackage}": "workspace:*",`, "");
  expect(before).not.toBe(after);
  expect(insertNpmDependency(before, names.npmPackage)).toBe(after);
});

test("app.plugins.ts: add prdownloader reproduces the demo manifest", () => {
  const after = demo("src/app.plugins.ts");
  const before = after.replace(`\n${importLine(names)}`, "").replace(`\n${arrayEntry(names)}`, "");
  expect(before).not.toBe(after);
  expect(insertPluginIntoManifest(before, names)).toBe(after);
});

test("capability: serialized prdownloader grant equals the demo file", () => {
  expect(serializeCapability(buildCapability(names))).toBe(demo("src-tauri/capabilities/prdownloader.json"));
});

test("tauri.conf.json: add prdownloader reproduces the demo externalBin", () => {
  const after = demo("src-tauri/tauri.conf.json");
  const before = after.replace(`\n    "externalBin": ["binaries/pr-downloader"],`, "");
  expect(before).not.toBe(after);
  expect(insertExternalBin(before, EXTERNAL_BIN)).toBe(after);
});

test("all prdownloader wiring is idempotent against the already-wired demo", () => {
  expect(insertPluginIntoBuilder(demo("src-tauri/src/main.rs"), names.crateName)).toBe(
    demo("src-tauri/src/main.rs"),
  );
  expect(insertCargoDependency(demo("src-tauri/Cargo.toml"), names.crateName)).toBe(
    demo("src-tauri/Cargo.toml"),
  );
  expect(insertNpmDependency(demo("package.json"), names.npmPackage)).toBe(demo("package.json"));
  expect(insertPluginIntoManifest(demo("src/app.plugins.ts"), names)).toBe(demo("src/app.plugins.ts"));
  expect(insertExternalBin(demo("src-tauri/tauri.conf.json"), EXTERNAL_BIN)).toBe(
    demo("src-tauri/tauri.conf.json"),
  );
});
