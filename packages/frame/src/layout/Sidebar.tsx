import type { NavGroup, NavItem } from "@picoframe/plugin-sdk";
import { ExternalLink } from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useState,
} from "react";
import { NavLink, matchPath, useLocation } from "react-router";
import { cn } from "../lib/cn";
import { useResolvedNavItem } from "../nav/useResolvedNavItem";
import { openExternal } from "../lib/openExternal";
import { Slot } from "../slots/slots";

/** Shared base styling for sidebar entries (internal links and external buttons). */
const navItemBase =
  "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

export const SIDEBAR_MIN_WIDTH = 160;
export const SIDEBAR_MAX_WIDTH = 420;
/** Default expanded width (px); ~20% narrower than the previous fixed 240px. */
export const SIDEBAR_DEFAULT_WIDTH = 192;
/** Keyboard resize step (px) for the drag handle. */
const SIDEBAR_KEY_STEP = 16;

const clampWidth = (px: number) => Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, px));

function NavItemView({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  // Each item owns its own hooks (via the shared resolver), so items can be added or
  // removed at runtime (a whole fiber mounts/unmounts) without shifting any sibling's hook
  // order. Resolved unconditionally before the early return below. `description` is
  // launcher-only and ignored here.
  const { visible, label, icon: Icon } = useResolvedNavItem(item);
  // Read location so `matches` / `activeWhen` re-evaluate on every navigation. Hooks run
  // before the early return; `visible` gates rendering, not the hook order.
  const { pathname } = useLocation();
  if (!visible) return null;

  // Force the highlight when an item is the conceptual home for routes at other paths.
  // OR of the prefix-matched `matches` patterns and the `activeWhen` predicate; combined
  // with NavLink's own `isActive` below.
  const forcedActive =
    (item.matches?.some((p) => matchPath({ path: p, end: false }, pathname) != null) ?? false) ||
    (item.activeWhen?.(pathname) ?? false);

  const glyph = Icon ? (
    <Icon size={18} className="shrink-0" />
  ) : (
    <span className="h-[18px] w-[18px] shrink-0" />
  );

  if (item.href) {
    const href = item.href;
    return (
      <button
        type="button"
        data-nav-item=""
        onClick={() => openExternal(href)}
        title={collapsed ? label : undefined}
        className={cn(navItemBase, "w-full text-left", collapsed && "justify-center")}
      >
        {glyph}
        {!collapsed && <span className="truncate">{label}</span>}
        {!collapsed && <ExternalLink size={14} className="ml-auto shrink-0 text-muted-foreground" />}
      </button>
    );
  }

  return (
    <NavLink
      to={item.to ?? "/"}
      data-nav-item=""
      end={item.end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          navItemBase,
          (isActive || forcedActive) && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
          collapsed && "justify-center",
        )
      }
    >
      {glyph}
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && item.badge && <span className="ml-auto text-xs text-muted-foreground">{item.badge()}</span>}
    </NavLink>
  );
}

function NavGroupView({ group, collapsed }: { group: NavGroup; collapsed: boolean }) {
  // Items self-hide (NavItemView returns null when its `useVisible` is false), so this
  // component's hook order never depends on how many items are visible — items may be
  // added or removed at runtime safely. The group collapses itself (header included) via
  // CSS when it contains no visible item: `hidden` by default, shown only when it
  // `:has([data-nav-item])`, which every visible item renders.
  return (
    <div data-nav-group className="hidden space-y-1 has-[[data-nav-item]]:block">
      {group.label && !collapsed && (
        <div className="px-2 pt-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {group.label}
        </div>
      )}
      {group.items.map((item) => (
        <NavItemView key={item.id} item={item} collapsed={collapsed} />
      ))}
    </div>
  );
}

/** The scrollable nav groups + footer slot, shared by the persistent sidebar and the popover. */
export function SidebarNav({ groups, collapsed }: { groups: NavGroup[]; collapsed: boolean }) {
  return (
    <>
      <nav className="flex-1 space-y-3 overflow-y-auto p-2">
        {/* Drop items opted out via `sidebar: false` (still shown on the home launcher),
            and any group left empty as a result. */}
        {groups
          .map((g) => ({ ...g, items: g.items.filter((i) => i.sidebar !== false) }))
          .filter((g) => g.items.length > 0)
          .map((group) => (
            <NavGroupView key={group.id} group={group} collapsed={collapsed} />
          ))}
      </nav>
      <div className="border-t border-sidebar-border p-2">
        <Slot id="sidebar.footer" />
      </div>
    </>
  );
}

function ResizeHandle({ width, onResize }: { width: number; onResize: (px: number) => void }) {
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    setDragging(true);
    const onMove = (ev: PointerEvent) => onResize(clampWidth(startW + (ev.clientX - startX)));
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") onResize(clampWidth(width - SIDEBAR_KEY_STEP));
    else if (e.key === "ArrowRight") onResize(clampWidth(width + SIDEBAR_KEY_STEP));
    else return;
    e.preventDefault();
  };

  return (
    // A focusable window-splitter: drag to resize, or focus and use Arrow keys.
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuenow={width}
      aria-valuemin={SIDEBAR_MIN_WIDTH}
      aria-valuemax={SIDEBAR_MAX_WIDTH}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={cn(
        "absolute -right-1 top-0 z-10 h-full w-2 cursor-col-resize",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-transparent after:transition-colors",
        "hover:after:bg-ring focus-visible:outline-none focus-visible:after:bg-ring",
        dragging && "after:bg-ring",
      )}
    />
  );
}

export function Sidebar({
  groups,
  collapsed,
  width,
  onResize,
  hideWhenCollapsed = false,
}: {
  groups: NavGroup[];
  collapsed: boolean;
  width: number;
  onResize: (px: number) => void;
  /** When collapsed, drop to zero width instead of leaving an icon rail. */
  hideWhenCollapsed?: boolean;
}) {
  // Fully hidden: keep the <aside> for the width transition but render no content, so its
  // links leave the tab order (avoids the invisible-but-tabbable a11y trap).
  const fullyHidden = collapsed && hideWhenCollapsed;

  return (
    <aside
      data-slot="sidebar"
      data-collapsed={collapsed || undefined}
      style={collapsed ? undefined : { width: clampWidth(width) }}
      className={cn(
        "group/sidebar relative flex h-full flex-col border-r border-sidebar-border bg-sidebar",
        !collapsed && "shrink-0",
        collapsed && !fullyHidden && "w-14 transition-[width] duration-200",
        fullyHidden && "w-0 overflow-hidden border-r-0 transition-[width] duration-200",
      )}
    >
      {!fullyHidden && (
        <>
          <SidebarNav groups={groups} collapsed={collapsed} />
          {!collapsed && <ResizeHandle width={clampWidth(width)} onResize={onResize} />}
        </>
      )}
    </aside>
  );
}
