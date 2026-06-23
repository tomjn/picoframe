/**
 * Add a plugin package to an app's `package.json` `dependencies`. Edited as text
 * (not a JSON round-trip) so the rest of the file — formatting, key order of
 * other blocks, trailing newline — stays byte-for-byte intact. The new key is
 * inserted in sorted position and commas are normalized (every entry but the
 * last gets a trailing comma).
 */

const ENTRY_KEY = /^\s*"([^"]+)"\s*:/;

/**
 * The version spec the app uses for its picoframe dependencies, read from
 * `@picoframe/frame`. The monorepo demo declares it as `workspace:*`; a
 * standalone app scaffolded by `create` declares a published `^0.0.1`. `add`
 * mirrors this so a new plugin matches the app's world. Falls back to the
 * published spec when no frame dep is present.
 */
export function picoframeNpmSpec(source: string): string {
  return source.match(/"@picoframe\/frame"\s*:\s*"([^"]+)"/)?.[1] ?? "^0.0.1";
}

/** Insert (or no-op) a dependency into the `dependencies` block. */
export function insertNpmDependency(source: string, pkg: string, version = "workspace:*"): string {
  const lines = source.split("\n");
  const header = lines.findIndex((l) => /"dependencies"\s*:\s*\{/.test(l));
  if (header === -1) {
    throw new Error('"dependencies" block not found in package.json');
  }
  let close = -1;
  for (let i = header + 1; i < lines.length; i++) {
    if (/^\s*\}/.test(lines[i])) {
      close = i;
      break;
    }
  }
  if (close === -1) {
    throw new Error("malformed dependencies block in package.json");
  }

  const body = lines.slice(header + 1, close);
  const keyOf = (l: string): string => l.match(ENTRY_KEY)?.[1] ?? "";

  // Idempotent: already present?
  if (body.some((l) => keyOf(l) === pkg)) {
    return source;
  }

  const entries = body.filter((l) => ENTRY_KEY.test(l));
  const indent = entries[0]?.match(/^(\s*)/)?.[1] ?? "    ";

  let idx = entries.findIndex((l) => keyOf(l).localeCompare(pkg) > 0);
  if (idx === -1) idx = entries.length;

  const updated = [...entries.slice(0, idx), `${indent}"${pkg}": "${version}"`, ...entries.slice(idx)];
  const withCommas = updated.map((l, i) => {
    const base = l.replace(/,\s*$/, "");
    return i < updated.length - 1 ? `${base},` : base;
  });

  return [...lines.slice(0, header + 1), ...withCommas, ...lines.slice(close)].join("\n");
}
