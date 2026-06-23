import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { aclIdentifier, buildCapability } from "./capability";
import { insertPluginIntoBuilder, pluginLine } from "./rust-builder";

const repoRoot = `${import.meta.dir}/../../../..`;
const demoMain = readFileSync(`${repoRoot}/apps/demo/src-tauri/src/main.rs`, "utf8");
const HELLO_CRATE = "tauri-plugin-picoframe-hello";

// Spike B: the CLI's generated wiring must reproduce the hand-wired demo exactly.
test("inserting the hello plugin reproduces the hand-wired demo main.rs", () => {
  // Derive the frame-only 'before' state by removing the hand-wired line.
  const before = demoMain.replace(`\n${pluginLine(HELLO_CRATE)}`, "");
  expect(before).not.toBe(demoMain); // sanity: the line was actually present

  const after = insertPluginIntoBuilder(before, HELLO_CRATE);
  expect(after).toBe(demoMain);
});

test("insertion is idempotent", () => {
  expect(insertPluginIntoBuilder(demoMain, HELLO_CRATE)).toBe(demoMain);
});

test("missing markers throw", () => {
  expect(() => insertPluginIntoBuilder("fn main() {}", HELLO_CRATE)).toThrow();
});

test("acl identifier strips the tauri-plugin- prefix", () => {
  expect(aclIdentifier(HELLO_CRATE)).toBe("picoframe-hello");
});

test("generated capability grants <id>:default", () => {
  const cap = buildCapability(HELLO_CRATE);
  expect(cap.identifier).toBe("picoframe-hello");
  expect(cap.permissions).toEqual(["picoframe-hello:default"]);
});
