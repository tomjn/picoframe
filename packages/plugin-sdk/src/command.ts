import { invoke, type InvokeArgs } from "@tauri-apps/api/core";

/** The uniform envelope every picoframe plugin command returns (mirrors the Rust `CliResult`). */
export interface CliResult<T = unknown> {
  success: boolean;
  data?: T;
  /** Human readable message. Always the fallback text, even when `error_detail` is set. */
  error?: string;
  /** Present only for errors built with the Rust `CliResult::err_coded`. */
  error_detail?: CliErrorDetail;
}

/** A stable error code and its parameters, for hosts that translate errors. */
export interface CliErrorDetail {
  code: string;
  params: Record<string, string>;
}

/** The error `defineCommand` throws. `code` and `params` are set only for coded errors. */
export interface CommandError extends Error {
  code?: string;
  params?: Record<string, string>;
}

/**
 * Create a typed binding to a plugin command.
 *
 * `defineCommand("picoframe-hello", "hello_greet")` returns a function that
 * invokes `plugin:picoframe-hello|hello_greet`, unwraps the `CliResult`, and
 * either resolves with the `data` payload or throws an `Error` whose `message` is the
 * `error` text. For a coded error the thrown error also has `code` and `params`.
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
      const err: CommandError = new Error(res.error ?? `${pluginId}|${command} failed`);
      if (res.error_detail) {
        err.code = res.error_detail.code;
        err.params = res.error_detail.params;
      }
      throw err;
    }
    return res.data as Data;
  };
}
