/**
 * Generic marker-anchored line insertion, shared by the manifest and (in spirit)
 * the Rust builder editors. We anchor on comment markers rather than parsing the
 * host language, so edits are robust, reviewable, and idempotent.
 */

/**
 * Insert `line` between the first `startMarker` and `endMarker` lines, keeping
 * the region sorted. Returns the source unchanged if the line is already present
 * (idempotent). Throws if the markers are missing or out of order.
 */
export function insertBetweenMarkers(
  source: string,
  startMarker: string,
  endMarker: string,
  line: string,
): string {
  const lines = source.split("\n");
  const startIdx = lines.findIndex((l) => l.includes(startMarker));
  const endIdx = lines.findIndex((l) => l.includes(endMarker));
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`markers not found: ${startMarker} / ${endMarker}`);
  }

  const between = lines.slice(startIdx + 1, endIdx);
  if (between.some((l) => l.trim() === line.trim())) {
    return source;
  }

  const updated = [...between, line].sort((a, b) => a.localeCompare(b));
  return [...lines.slice(0, startIdx + 1), ...updated, ...lines.slice(endIdx)].join("\n");
}
