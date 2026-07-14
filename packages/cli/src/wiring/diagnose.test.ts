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
  tauriConf: "{}",
};

/** A fully-wired sidecar plugin (worker): the four points plus its externalBin entry. */
const wiredWorker = {
  cargoToml: "tauri-plugin-picoframe-worker = { workspace = true }\n",
  mainRs: "builder = builder.plugin(tauri_plugin_picoframe_worker::init());",
  manifest: 'import workerPlugin from "@picoframe/plugin-worker";',
  capabilities: ['{ "permissions": ["picoframe-worker:default"] }'],
  tauriConf: '{ "bundle": { "externalBin": ["binaries/picoframe-worker-sidecar"] } }',
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
  const [d] = diagnose({
    cargoToml: "",
    mainRs: "",
    manifest: '"@picoframe/plugin-ghost"',
    capabilities: [],
    tauriConf: "",
  });
  expect(d.name).toBe("ghost");
  expect(d.ok).toBe(false);
  expect(d.manifest).toBe(true);
  expect(d.cargoDep).toBe(false);
});

test("non-sidecar plugin has no externalBin requirement", () => {
  const [d] = diagnose(wired);
  expect(d.hasSidecar).toBe(false);
  expect(d.sidecar).toBe(true); // n/a -> passes
});

test("a fully-wired sidecar plugin passes including externalBin", () => {
  const [d] = diagnose(wiredWorker);
  expect(d.name).toBe("worker");
  expect(d.hasSidecar).toBe(true);
  expect(d.sidecar).toBe(true);
  expect(d.ok).toBe(true);
});

test("a sidecar plugin missing its externalBin is flagged (would ship no binary)", () => {
  const [d] = diagnose({ ...wiredWorker, tauriConf: '{ "bundle": {} }' });
  expect(d.hasSidecar).toBe(true);
  expect(d.sidecar).toBe(false);
  expect(d.ok).toBe(false);
  // The other four points are still detected, pinpointing the gap.
  expect(d.cargoDep).toBe(true);
  expect(d.builderCall).toBe(true);
  expect(d.capability).toBe(true);
  expect(d.manifest).toBe(true);
});
