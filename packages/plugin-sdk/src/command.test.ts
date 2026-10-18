import { afterEach, expect, test } from "bun:test";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { defineCommand, type CliResult } from "./command";

afterEach(() => clearMocks());

async function thrownBy(result: CliResult): Promise<Error & { code?: string; params?: Record<string, string> }> {
  mockIPC(() => result);
  try {
    await defineCommand<undefined, unknown>("picoframe-test", "go")(undefined);
  } catch (e) {
    return e as Error;
  }
  throw new Error("expected defineCommand to throw");
}

// These literals match what the Rust `CliResult::err_coded` and `CliResult::err` serialise to.
test("a coded error exposes code and params and keeps the message", async () => {
  const err = await thrownBy({
    success: false,
    error: "File not found: /tmp/a",
    error_detail: { code: "file.missing", params: { path: "/tmp/a" } },
  });
  expect(err.message).toBe("File not found: /tmp/a");
  expect(err.code).toBe("file.missing");
  expect(err.params).toEqual({ path: "/tmp/a" });
});

test("a plain error leaves code and params undefined", async () => {
  const err = await thrownBy({ success: false, error: "disk full" });
  expect(err.message).toBe("disk full");
  expect(err.code).toBeUndefined();
  expect(err.params).toBeUndefined();
});

test("a failure with no message still throws a fallback message", async () => {
  const err = await thrownBy({ success: false });
  expect(err.message).toBe("picoframe-test|go failed");
});

test("a success resolves with the data", async () => {
  mockIPC(() => ({ success: true, data: { n: 1 } }));
  expect(await defineCommand<undefined, { n: number }>("picoframe-test", "go")(undefined)).toEqual({ n: 1 });
});
