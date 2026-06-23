/**
 * The CLI's integration test: `picoframe add hello` must reproduce the
 * hand-wired demo byte-for-byte. For each edited file we derive the frame-only
 * "before" state by reversing the hello wiring, then assert that applying the
 * wiring reproduces the committed demo exactly.
 */
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { pluginNames } from "../naming";
import { buildCapability, serializeCapability } from "./capability";
import { depLine, insertCargoDependency } from "./cargo";
import { arrayEntry, importLine, insertPluginIntoManifest } from "./manifest";
import { insertNpmDependency } from "./npm-deps";
import { insertPluginIntoBuilder, pluginLine } from "./rust-builder";

const repoRoot = `${import.meta.dir}/../../../..`;
const demo = (rel: string) => readFileSync(`${repoRoot}/apps/demo/${rel}`, "utf8");
const names = pluginNames("hello");
const prd = pluginNames("prdownloader");

test("main.rs: add hello reproduces the demo builder", () => {
  const after = demo("src-tauri/src/main.rs");
  const before = after.replace(`\n${pluginLine(names.crateName)}`, "");
  expect(before).not.toBe(after);
  expect(insertPluginIntoBuilder(before, names.crateName)).toBe(after);
});

test("Cargo.toml: add hello reproduces the demo dependency", () => {
  // Cargo deps are appended (not sorted), so the round-trip only holds when hello
  // is the last dep. Strip the later-added prdownloader crate to get that state.
  const after = demo("src-tauri/Cargo.toml").replace(`\n${depLine(prd.crateName)}`, "");
  const before = after.replace(`\n${depLine(names.crateName)}`, "");
  expect(before).not.toBe(after);
  expect(insertCargoDependency(before, names.crateName)).toBe(after);
});

test("package.json: add hello reproduces the demo dependency", () => {
  const after = demo("package.json");
  const before = after.replace(`\n    "${names.npmPackage}": "workspace:*",`, "");
  expect(before).not.toBe(after);
  expect(insertNpmDependency(before, names.npmPackage)).toBe(after);
});

test("app.plugins.ts: add hello reproduces the demo manifest", () => {
  const after = demo("src/app.plugins.ts");
  const before = after.replace(`\n${importLine(names)}`, "").replace(`\n${arrayEntry(names)}`, "");
  expect(before).not.toBe(after);
  expect(insertPluginIntoManifest(before, names)).toBe(after);
});

test("capability: serialized hello grant equals the demo file", () => {
  expect(serializeCapability(buildCapability(names))).toBe(demo("src-tauri/capabilities/hello.json"));
});

test("all wiring is idempotent against the already-wired demo", () => {
  expect(insertPluginIntoBuilder(demo("src-tauri/src/main.rs"), names.crateName)).toBe(
    demo("src-tauri/src/main.rs"),
  );
  expect(insertCargoDependency(demo("src-tauri/Cargo.toml"), names.crateName)).toBe(
    demo("src-tauri/Cargo.toml"),
  );
  expect(insertNpmDependency(demo("package.json"), names.npmPackage)).toBe(demo("package.json"));
  expect(insertPluginIntoManifest(demo("src/app.plugins.ts"), names)).toBe(demo("src/app.plugins.ts"));
});
