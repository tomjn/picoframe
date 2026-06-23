#!/usr/bin/env bun
/**
 * picoframe CLI. v1 commands: `add`, `list`, `doctor`. (`create` lands with
 * publishing in Phase 4.) Wiring is explicit, marker-anchored, and idempotent.
 */
import { add } from "./commands/add";
import { doctor } from "./commands/doctor";
import { list } from "./commands/list";

interface Parsed {
  positionals: string[];
  appDir: string;
  dryRun: boolean;
}

function parse(argv: string[]): Parsed {
  const positionals: string[] = [];
  let appDir = process.cwd();
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--app") appDir = argv[++i] ?? appDir;
    else if (a === "--dry-run") dryRun = true;
    else positionals.push(a);
  }
  return { positionals, appDir, dryRun };
}

const HELP = `picoframe — Tauri v2 app-frame CLI

Usage:
  picoframe add <plugin> [--app <dir>] [--dry-run]   Wire a first-party plugin into an app
  picoframe list [--app <dir>]                        List first-party plugins + install state
  picoframe doctor [--app <dir>]                      Verify per-plugin wiring (Cargo/builder/capability/manifest)

Options:
  --app <dir>   Target app directory (default: current directory)
  --dry-run     Preview changes without writing (add only)
`;

function main(): number {
  const [cmd, ...rest] = process.argv.slice(2);
  const { positionals, appDir, dryRun } = parse(rest);

  try {
    switch (cmd) {
      case "add": {
        const plugin = positionals[0];
        if (!plugin) throw new Error("usage: picoframe add <plugin>");
        add(plugin, { appDir, dryRun });
        return 0;
      }
      case "list":
        list(appDir);
        return 0;
      case "doctor":
        return doctor(appDir);
      case undefined:
      case "help":
      case "--help":
      case "-h":
        console.log(HELP);
        return 0;
      default:
        console.error(`unknown command: ${cmd}\n`);
        console.log(HELP);
        return 1;
    }
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}

process.exit(main());
