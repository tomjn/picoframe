/**
 * `add` must work in two worlds: the monorepo demo (workspace inheritance) and a
 * standalone app scaffolded by `create` (published versions). It decides which by
 * mirroring the spec the app already uses for its frame (npm) / core (Cargo)
 * dependency. These tests pin that mirroring.
 */
import { expect, test } from "bun:test";
import { depLine, insertCargoDependency, picoframeCargoRhs } from "./cargo";
import { insertNpmDependency, picoframeNpmSpec } from "./npm-deps";

const workspacePkg = `{
  "dependencies": {
    "@picoframe/frame": "workspace:*",
    "@picoframe/plugin-sdk": "workspace:*"
  }
}
`;

const publishedPkg = `{
  "dependencies": {
    "@picoframe/frame": "^0.0.1",
    "@picoframe/plugin-sdk": "^0.0.1"
  }
}
`;

test("picoframeNpmSpec reads the frame spec from package.json", () => {
  expect(picoframeNpmSpec(workspacePkg)).toBe("workspace:*");
  expect(picoframeNpmSpec(publishedPkg)).toBe("^0.0.1");
});

test("picoframeNpmSpec falls back to ^0.0.2 when no frame dep is present", () => {
  expect(picoframeNpmSpec(`{ "dependencies": {} }`)).toBe("^0.0.2");
});

test("insertNpmDependency honors an explicit published spec", () => {
  const out = insertNpmDependency(publishedPkg, "@picoframe/plugin-hello", "^0.0.1");
  expect(out).toContain(`"@picoframe/plugin-hello": "^0.0.1"`);
});

const workspaceCargo = `[dependencies]
tauri = { workspace = true }
picoframe-core = { workspace = true }
`;

const publishedCargo = `[dependencies]
tauri = { version = "2" }
picoframe-core = "0.0.1"
`;

test("picoframeCargoRhs reads the core dependency's right-hand side", () => {
  expect(picoframeCargoRhs(workspaceCargo)).toBe("{ workspace = true }");
  expect(picoframeCargoRhs(publishedCargo)).toBe(`"0.0.1"`);
});

test("picoframeCargoRhs falls back to workspace inheritance when core is absent", () => {
  expect(picoframeCargoRhs(`[dependencies]\ntauri = { version = "2" }\n`)).toBe("{ workspace = true }");
});

test("depLine defaults to workspace inheritance but accepts an explicit rhs", () => {
  expect(depLine("tauri-plugin-picoframe-hello")).toBe(
    "tauri-plugin-picoframe-hello = { workspace = true }",
  );
  expect(depLine("tauri-plugin-picoframe-hello", `"0.0.1"`)).toBe(
    `tauri-plugin-picoframe-hello = "0.0.1"`,
  );
});

test("insertCargoDependency honors an explicit published rhs", () => {
  const out = insertCargoDependency(publishedCargo, "tauri-plugin-picoframe-hello", `"0.0.1"`);
  expect(out).toContain(`tauri-plugin-picoframe-hello = "0.0.1"`);
});
