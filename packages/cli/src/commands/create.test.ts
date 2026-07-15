/**
 * `create` scaffolds a frame-only, standalone (published-deps) app. Two things
 * matter: the scaffold is a valid picoframe app with no leftover placeholders,
 * and it is the demo's "before" state — wiring `hello` into it reproduces the
 * demo's marker regions exactly. The latter is the plan's `create + add == demo`
 * integration check, asserted here against the one file with no parameterization
 * (app.plugins.ts).
 */
import { afterAll, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pluginNames } from "../naming";
import { insertPluginIntoBuilder, pluginLine } from "../wiring/rust-builder";
import { insertPluginIntoManifest } from "../wiring/manifest";
import { appPaths, assertApp } from "./app";
import { scaffold } from "./create";

const repoRoot = `${import.meta.dir}/../../../..`;
const demo = (rel: string) => readFileSync(`${repoRoot}/apps/demo/${rel}`, "utf8");
const hello = pluginNames("hello");

const dir = mkdtempSync(join(tmpdir(), "picoframe-create-"));
scaffold(dir, { name: "acme-app", identifier: "com.acme.app" });
const read = (rel: string) => readFileSync(join(dir, rel), "utf8");

afterAll(() => rmSync(dir, { recursive: true, force: true }));

test("scaffold produces a valid picoframe app", () => {
  expect(() => assertApp(appPaths(dir))).not.toThrow();
});

test("scaffold substitutes the app name and identifier", () => {
  expect(JSON.parse(read("package.json")).name).toBe("acme-app");
  const conf = JSON.parse(read("src-tauri/tauri.conf.json"));
  expect(conf.identifier).toBe("com.acme.app");
  expect(conf.productName).toBe("acme-app");
  expect(read("src-tauri/Cargo.toml")).toContain(`name = "acme-app"`);
});

test("scaffold uses published deps, not workspace inheritance, and omits hello", () => {
  const pkg = read("package.json");
  // Assert a real published semver range, not a pinned literal — the template's
  // versions bump at every release and a hard-coded value goes stale (it did at 0.5.1).
  expect(pkg).toMatch(/"@picoframe\/frame": "\^\d+\.\d+\.\d+"/);
  expect(pkg).toMatch(/"@picoframe\/plugin-sdk": "\^\d+\.\d+\.\d+"/);
  expect(pkg).not.toContain("workspace:*");
  expect(pkg).not.toContain("plugin-hello");

  const cargo = read("src-tauri/Cargo.toml");
  expect(cargo).toMatch(/picoframe-core = "\d+\.\d+\.\d+"/);
  expect(cargo).not.toContain("workspace = true");
  expect(cargo).not.toContain("hello");
});

test("scaffold leaves no unsubstituted placeholders", () => {
  for (const rel of [
    "package.json",
    "index.html",
    "src/main.tsx",
    "src/app.plugins.ts",
    "src/index.css",
    "src-tauri/Cargo.toml",
    "src-tauri/tauri.conf.json",
    "src-tauri/src/main.rs",
  ]) {
    expect(read(rel)).not.toContain("{{");
  }
});

test("scaffold writes a real .gitignore (npm strips a literal .gitignore, so the template ships `gitignore`)", () => {
  expect(existsSync(join(dir, "gitignore"))).toBe(false);
  const gi = read(".gitignore");
  expect(gi).toContain("node_modules");
  expect(gi).toContain("src-tauri/target");
});

test("frame-only app.plugins.ts + add hello + worker reproduces the demo byte-for-byte", () => {
  // The demo wires both first-party plugins; the manifest region is kept sorted, so adding
  // hello then worker reproduces it regardless of order.
  let wired = insertPluginIntoManifest(read("src/app.plugins.ts"), hello);
  wired = insertPluginIntoManifest(wired, pluginNames("worker"));
  expect(wired).toBe(demo("src/app.plugins.ts"));
});

test("frame-only main.rs + add hello inserts the demo's builder line", () => {
  const wired = insertPluginIntoBuilder(read("src-tauri/src/main.rs"), hello.crateName);
  expect(wired).toContain(pluginLine(hello.crateName));
  expect(wired.split("\n").filter((l) => l.includes("plugins-start")).length).toBe(1);
});
