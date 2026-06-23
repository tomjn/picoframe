import { defineCommand } from "@picoframe/plugin-sdk";

/** Payload returned by the Rust `hello_greet` command (inside the `CliResult`). */
export interface GreetResult {
  message: string;
}

/**
 * Typed binding to `plugin:picoframe-hello|hello_greet`. The first argument to
 * `defineCommand` is the Tauri ACL identifier (crate name minus `tauri-plugin-`),
 * not the npm package name.
 */
export const helloGreet = defineCommand<{ name: string }, GreetResult>("picoframe-hello", "hello_greet");
