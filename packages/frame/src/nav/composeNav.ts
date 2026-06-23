import type { FramePlugin, NavGroup } from "@picoframe/plugin-sdk";

/**
 * Merge every plugin's nav groups into the final sidebar model.
 * Groups with the same `id` merge; items and groups sort by `order` (default 100).
 * Duplicate nav-item ids are a configuration error and logged loudly in dev.
 */
export function composeNav(plugins: FramePlugin[]): NavGroup[] {
  const groups = new Map<string, NavGroup>();

  for (const plugin of plugins) {
    for (const g of plugin.nav ?? []) {
      const target = groups.get(g.id);
      if (target) {
        if (g.label && !target.label) target.label = g.label;
        if (g.order !== undefined && target.order === undefined) target.order = g.order;
        target.items.push(...g.items);
      } else {
        groups.set(g.id, { id: g.id, label: g.label, order: g.order, items: [...g.items] });
      }
    }
  }

  const result = [...groups.values()];
  const seen = new Set<string>();
  for (const g of result) {
    for (const item of g.items) {
      if (seen.has(item.id)) {
        console.error(`[picoframe] duplicate nav item id: "${item.id}" — items must be unique across plugins`);
      }
      seen.add(item.id);
    }
    g.items.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }
  result.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  return result;
}
