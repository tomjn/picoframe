import type { FramePlugin, SettingsSection } from "@picoframe/plugin-sdk";

/** A composed settings section with its resolved children. */
export interface SettingsNode extends SettingsSection {
  children: SettingsNode[];
}

export interface ComposedSettings {
  /** Top-level sections, sorted; each carries its (sorted) `children`. */
  nodes: SettingsNode[];
  /** Every node by id, for O(1) deep-link (`/settings/<id>`) lookup. */
  byId: Map<string, SettingsNode>;
}

/**
 * Merge every plugin's settings sections into a tree.
 * Sections with the same `id` merge (first declarer wins; later declarations fill only
 * unset fields), so a plugin can attach a sub-section to a category it does not own.
 * `parent` builds the tree; an unknown parent is logged and the node falls back to
 * top-level. Siblings sort by `order` (default 100), then `title`.
 */
export function composeSettings(plugins: FramePlugin[]): ComposedSettings {
  const byId = new Map<string, SettingsNode>();

  for (const plugin of plugins) {
    for (const s of plugin.settings ?? []) {
      if (s.id.includes("/")) {
        console.error(`[picoframe] settings id "${s.id}" must be path-safe (no "/")`);
      }
      const existing = byId.get(s.id);
      if (existing) {
        existing.order ??= s.order;
        existing.description ??= s.description;
        existing.icon ??= s.icon;
        existing.parent ??= s.parent;
        existing.Component ??= s.Component;
      } else {
        byId.set(s.id, { ...s, children: [] });
      }
    }
  }

  const nodes: SettingsNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parent ? byId.get(node.parent) : undefined;
    if (node.parent && !parent) {
      console.error(
        `[picoframe] settings section "${node.id}" has unknown parent "${node.parent}"`,
      );
    }
    if (parent) parent.children.push(node);
    else nodes.push(node);
  }

  const sortNodes = (list: SettingsNode[]) => {
    list.sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.title.localeCompare(b.title));
    for (const n of list) sortNodes(n.children);
  };
  sortNodes(nodes);

  return { nodes, byId };
}
