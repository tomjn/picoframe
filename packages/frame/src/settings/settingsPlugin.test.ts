import { expect, test } from "bun:test";
import type { FramePlugin } from "@picoframe/plugin-sdk";
import { composeSettings } from "./composeSettings";
import { FRAME_APPEARANCE_SETTINGS_ID, settingsPlugin } from "./settingsPlugin";

test("exposes the appearance section id as a stable constant", () => {
  expect(FRAME_APPEARANCE_SETTINGS_ID).toBe("frame.appearance");
  const ids = settingsPlugin().settings?.map((s) => s.id) ?? [];
  expect(ids).toContain(FRAME_APPEARANCE_SETTINGS_ID);
});

test("an app can hide the frame-owned appearance section by merging useVisible onto it", () => {
  const appPlugin: FramePlugin = {
    id: "app.theme-lock",
    version: "0",
    routes: [],
    settings: [{ id: FRAME_APPEARANCE_SETTINGS_ID, title: "Appearance", useVisible: () => false }],
  };
  // App plugin composes before settingsPlugin(), so it is the first declarer.
  const composed = composeSettings([appPlugin, settingsPlugin()]);
  const node = composed.byId.get(FRAME_APPEARANCE_SETTINGS_ID);
  expect(node?.useVisible?.()).toBe(false); // app's useVisible survives the merge
  expect(node?.Component).toBeDefined();     // settingsPlugin still fills the Component
});
