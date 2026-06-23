/**
 * `picoframe create <name>` — scaffold a new, standalone picoframe app from the
 * bundled frame-only template. The template ships with `{{APP_NAME}}` /
 * `{{APP_IDENTIFIER}}` placeholders and published (`^0.0.2` / `"0.0.2"`)
 * dependency specs, so the result builds outside this monorepo. After scaffolding
 * it runs `bun install`; `picoframe add <plugin>` wires plugins in from there.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface TemplateVars {
  name: string;
  identifier: string;
}

interface CreateOptions {
  appDir: string;
  install: boolean;
}

/** Extensions copied as-is rather than treated as substitutable text. */
const BINARY = new Set([".png", ".ico", ".icns"]);

/**
 * Template filename -> scaffolded filename. npm strips a literal `.gitignore`
 * from published packages, so the template ships it as `gitignore` and we
 * restore the dot on scaffold.
 */
const RENAME: Record<string, string> = { gitignore: ".gitignore" };

/** Path to the bundled template; resolves the same from `src/` and built `dist/`. */
function templateDir(): string {
  return join(import.meta.dir, "..", "..", "templates", "app");
}

/** Replace `{{APP_NAME}}` / `{{APP_IDENTIFIER}}` placeholders. */
export function substitute(content: string, vars: TemplateVars): string {
  return content
    .replaceAll("{{APP_NAME}}", vars.name)
    .replaceAll("{{APP_IDENTIFIER}}", vars.identifier);
}

/** Recursively copy the template into `targetDir`, substituting text files. */
export function scaffold(targetDir: string, vars: TemplateVars): void {
  copyDir(templateDir(), targetDir, vars);
}

function copyDir(src: string, dest: string, vars: TemplateVars): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, entry.name);
    const to = join(dest, RENAME[entry.name] ?? entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to, vars);
    } else if (BINARY.has(extname(entry.name))) {
      writeFileSync(to, readFileSync(from));
    } else {
      writeFileSync(to, substitute(readFileSync(from, "utf8"), vars));
    }
  }
}

function extname(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i);
}

const NAME_RE = /^[a-z][a-z0-9-]*$/;

export function create(name: string, opts: CreateOptions): void {
  if (!NAME_RE.test(name)) {
    throw new Error(
      `invalid app name "${name}". Use lowercase letters, digits, and hyphens, starting with a letter (e.g. my-app).`,
    );
  }
  const target = join(opts.appDir, name);
  if (existsSync(target) && readdirSync(target).length > 0) {
    throw new Error(`${target} already exists and is not empty.`);
  }

  const vars: TemplateVars = { name, identifier: `com.example.${name}` };
  console.log(`Scaffolding ${name} into ${target} (identifier ${vars.identifier}):`);
  scaffold(target, vars);
  console.log("  + frame-only app (run `picoframe add <plugin>` to add plugins)");

  if (opts.install) {
    console.log("\nInstalling dependencies (bun install)...");
    execFileSync("bun", ["install"], { cwd: target, stdio: "inherit" });
  }

  console.log(`\nDone. Next:`);
  console.log(`  cd ${name}`);
  if (!opts.install) console.log("  bun install");
  console.log("  bun run dev        # launch the app");
  console.log("  picoframe add hello  # wire in a plugin");
}
