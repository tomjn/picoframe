/**
 * `doctor`'s pure logic: a fully-wired plugin passes; a broken triad is flagged.
 */
import { expect, test } from "bun:test";
import { diagnose } from "./diagnose";

const wired = {
  cargoToml: '[dependencies]\ntauri-plugin-picoframe-hello = { workspace = true }\n',
  mainRs: "builder = builder.plugin(tauri_plugin_picoframe_hello::init());",
  manifest: 'import helloPlugin from "@picoframe/plugin-hello";',
  capabilities: ['{ "permissions": ["picoframe-hello:default"] }'],
};

test("a fully-wired plugin passes", () => {
  const [d] = diagnose(wired);
  expect(d.name).toBe("hello");
  expect(d.ok).toBe(true);
});

test("a missing capability grant is flagged (the silent ACL failure)", () => {
  const [d] = diagnose({ ...wired, capabilities: [] });
  expect(d.ok).toBe(false);
  expect(d.capability).toBe(false);
  // The other three are still detected, pinpointing the gap.
  expect(d.cargoDep).toBe(true);
  expect(d.builderCall).toBe(true);
  expect(d.manifest).toBe(true);
});

test("repairing the capability makes it pass", () => {
  const [d] = diagnose({ ...wired, capabilities: ['{ "permissions": ["picoframe-hello:default"] }'] });
  expect(d.ok).toBe(true);
});

test("a plugin referenced only by manifest is flagged partial", () => {
  const [d] = diagnose({ cargoToml: "", mainRs: "", manifest: '"@picoframe/plugin-ghost"', capabilities: [] });
  expect(d.name).toBe("ghost");
  expect(d.ok).toBe(false);
  expect(d.manifest).toBe(true);
  expect(d.cargoDep).toBe(false);
});
