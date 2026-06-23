import { invoke, type InvokeArgs } from "@tauri-apps/api/core";

/** The uniform envelope every picoframe plugin command returns (mirrors the Rust `CliResult`). */
export interface CliResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Create a typed binding to a plugin command.
 *
 * `defineCommand("picoframe-hello", "hello_greet")` returns a function that
 * invokes `plugin:picoframe-hello|hello_greet`, unwraps the `CliResult`, and
 * either resolves with the `data` payload or throws the `error`.
 *
 * `pluginId` is the Tauri ACL identifier (crate name minus `tauri-plugin-`),
 * not the npm package name.
 */
export function defineCommand<Args extends InvokeArgs | undefined, Data>(
  pluginId: string,
  command: string,
): (args: Args) => Promise<Data> {
  return async (args: Args) => {
    const res = await invoke<CliResult<Data>>(`plugin:${pluginId}|${command}`, args ?? undefined);
    if (!res.success) {
      throw new Error(res.error ?? `${pluginId}|${command} failed`);
    }
    return res.data as Data;
  };
}
