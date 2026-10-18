# @picoframe/plugin-sdk

Manifest types and the `defineCommand` IPC helper for picoframe plugins.

## CliResult

Every plugin command returns a `CliResult`, mirrored by `CliResult` in the `picoframe-core` crate.

```ts
interface CliResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  error_detail?: { code: string; params: Record<string, string> };
}
```

`error` is the message in English. It is set on every failure.

`error_detail` is optional and present only when the Rust side built the error with `CliResult::err_coded`. It gives a host a stable `code` and the `params` for it, so the host can show the error in the user's language instead of matching on the English message. The field is left out of the JSON when absent.

```rust
CliResult::err("disk full");
CliResult::err_coded("file.missing", BTreeMap::from([("path".into(), path.clone())]), format!("File not found: {path}"));
```

## defineCommand

`defineCommand(pluginId, command)` returns a function that invokes the command, resolves with `data`, or throws an `Error` whose `message` is the `error` text.

For a coded error the thrown error also has `code` and `params`. For any other failure both are `undefined`, so hosts that ignore them see no change.

```ts
try {
  await readFile({ path });
} catch (e) {
  const { code, params, message } = e as CommandError;
  show(code ? t(code, params) : message);
}
```
