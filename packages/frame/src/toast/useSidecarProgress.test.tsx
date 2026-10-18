import { afterEach, expect, mock, spyOn, test } from "bun:test";
import type { ProgressEvent } from "@picoframe/plugin-sdk";
import { act, cleanup, render } from "@testing-library/react";
import { toast } from "sonner";
import { StringsProvider } from "../strings/strings";
import { useSidecarProgress } from "./useSidecarProgress";

let emit: (event: ProgressEvent) => void = () => {};
mock.module("@tauri-apps/api/event", () => ({
  listen: (_name: string, cb: (e: { payload: ProgressEvent }) => void) => {
    emit = (payload) => cb({ payload });
    return Promise.resolve(() => {});
  },
}));

function Probe() {
  useSidecarProgress("test://sidecar");
  return null;
}

async function mountWith(strings?: Parameters<typeof StringsProvider>[0]["strings"]) {
  await act(async () => {
    render(
      <StringsProvider strings={strings}>
        <Probe />
      </StringsProvider>,
    );
  });
}

const translated = {
  sidecarDone: "Fertig",
  sidecarWorking: (op: string) => `Arbeite: ${op}`,
  sidecarFailed: (op: string) => `${op} fehlgeschlagen`,
};

afterEach(() => {
  cleanup();
  mock.restore();
});

test("running, complete and failed events show the translated text", async () => {
  const loading = spyOn(toast, "loading").mockReturnValue(1);
  const success = spyOn(toast, "success").mockReturnValue(1);
  const error = spyOn(toast, "error").mockReturnValue(1);
  await mountWith(translated);
  emit({ type: "progress", op: "crunch", status: "running" });
  emit({ type: "progress", op: "crunch", status: "complete" });
  emit({ type: "progress", op: "crunch", status: "failed" });
  expect(loading.mock.calls[0][0]).toBe("Arbeite: crunch");
  expect(success.mock.calls[0][0]).toBe("Fertig");
  expect(error.mock.calls[0][0]).toBe("crunch fehlgeschlagen");
});

test("without a strings table the toasts read English", async () => {
  const loading = spyOn(toast, "loading").mockReturnValue(1);
  const success = spyOn(toast, "success").mockReturnValue(1);
  const error = spyOn(toast, "error").mockReturnValue(1);
  await mountWith();
  emit({ type: "progress", op: "crunch", status: "running" });
  emit({ type: "progress", op: "crunch", status: "complete" });
  emit({ type: "progress", op: "crunch", status: "failed" });
  expect(loading.mock.calls[0][0]).toBe("Working: crunch");
  expect(success.mock.calls[0][0]).toBe("Done");
  expect(error.mock.calls[0][0]).toBe("crunch failed");
});

test("the event's own detail still wins over the table", async () => {
  const loading = spyOn(toast, "loading").mockReturnValue(1);
  await mountWith(translated);
  emit({ type: "progress", op: "crunch", status: "running", detail: "Step 2" });
  expect(loading.mock.calls[0][0]).toBe("Step 2");
});
