import { expect, test } from "bun:test";
import { externalBinLine, insertExternalBin } from "./sidecar";

const conf = `{
  "$schema": "https://schema.tauri.app/config/2",
  "bundle": {
    "active": true,
    "targets": "all"
  }
}
`;

test("externalBinLine serializes a single-line array", () => {
  expect(externalBinLine(["binaries/pr-downloader"], "    ")).toBe(
    `    "externalBin": ["binaries/pr-downloader"],`,
  );
});

test("insertExternalBin adds the entry as the first bundle key", () => {
  const out = insertExternalBin(conf, ["binaries/pr-downloader"]);
  expect(out).toBe(`{
  "$schema": "https://schema.tauri.app/config/2",
  "bundle": {
    "externalBin": ["binaries/pr-downloader"],
    "active": true,
    "targets": "all"
  }
}
`);
});

test("insertExternalBin is idempotent", () => {
  const once = insertExternalBin(conf, ["binaries/pr-downloader"]);
  expect(insertExternalBin(once, ["binaries/pr-downloader"])).toBe(once);
});

test("insertExternalBin throws without a bundle object", () => {
  expect(() => insertExternalBin(`{ "app": {} }`, ["x"])).toThrow('"bundle" object not found');
});
