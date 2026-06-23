import { type FramePlugin, framePlugin } from "@picoframe/frame";
// picoframe:imports-start
import helloPlugin from "@picoframe/plugin-hello";
// picoframe:imports-end

/** The app's plugin list. `picoframe add <plugin>` edits this file. */
export const plugins: FramePlugin[] = [
  framePlugin,
  // picoframe:plugins-start
  helloPlugin,
  // picoframe:plugins-end
];
