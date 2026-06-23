import { type FramePlugin, framePlugin } from "@picoframe/frame";
// picoframe:imports-start
import helloPlugin from "@picoframe/plugin-hello";
import prdownloaderPlugin from "@picoframe/plugin-prdownloader";
// picoframe:imports-end

/** The app's plugin list. `picoframe add <plugin>` edits this file. */
export const plugins: FramePlugin[] = [
  framePlugin,
  // picoframe:plugins-start
  helloPlugin,
  prdownloaderPlugin,
  // picoframe:plugins-end
];
