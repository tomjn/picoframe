import type { IconComponent, NavItem } from "@picoframe/plugin-sdk";
import type { ReactNode } from "react";

/** A nav item's live presentation, after applying any `use*` reactive overrides. */
export interface ResolvedNavItem {
  visible: boolean;
  label: string;
  icon: IconComponent | undefined;
  description: ReactNode;
}

/**
 * Resolve a nav item's live presentation in one fixed hook-call order. Each `use*` hook,
 * when present, overrides its static counterpart and is reactive (it may read `useSetting`
 * / `useContext`). Call this once at the top of the item's own component (`NavItemView`,
 * `ToolCard`) so the sidebar and launcher stay DRY and hook-safe.
 *
 * Every hook runs even where the caller ignores its result (the sidebar resolves a
 * `description` it never shows). Hooks must run unconditionally per fiber; the extra
 * subscription is negligible and is what lets a single resolver serve both surfaces. As
 * with `useVisible`, a given item `id` must consistently define, or not define, each hook.
 */
export function useResolvedNavItem(item: NavItem): ResolvedNavItem {
  return {
    visible: item.useVisible ? item.useVisible() : true,
    label: item.useLabel ? item.useLabel() : item.label,
    icon: item.useIcon ? item.useIcon() : item.icon,
    description: item.useDescription ? item.useDescription() : item.description,
  };
}
