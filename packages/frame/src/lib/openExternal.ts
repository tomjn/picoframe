import { openUrl } from "@tauri-apps/plugin-opener";

/**
 * Open a URL in the user's default browser via the Tauri opener plugin. Apps must
 * register `tauri_plugin_opener` and grant `opener:default` in a capability for
 * this to succeed (the picoframe app template and demo wire this by default).
 */
export function openExternal(url: string): void {
  openUrl(url).catch((err) => {
    console.error(`[picoframe] failed to open external url: ${url}`, err);
  });
}
