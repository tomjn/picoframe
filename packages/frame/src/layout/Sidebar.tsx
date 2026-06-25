import type { NavGroup, NavItem } from "@picoframe/plugin-sdk";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useState,
} from "react";
import { NavLink } from "react-router";
import { cn } from "../lib/cn";
import { Slot } from "../slots/slots";

export const SIDEBAR_MIN_WIDTH = 160;
export const SIDEBAR_MAX_WIDTH = 420;
/** Default expanded width (px); ~20% narrower than the previous fixed 240px. */
export const SIDEBAR_DEFAULT_WIDTH = 192;
/** Keyboard resize step (px) for the drag handle. */
const SIDEBAR_KEY_STEP = 16;

const clampWidth = (px: number) => Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, px));

function NavItemView({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground transition-colors",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
          collapsed && "justify-center",
        )
      }
    >
      {Icon ? <Icon size={18} className="shrink-0" /> : <span className="h-[18px] w-[18px] shrink-0" />}
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge && <span className="ml-auto text-xs text-muted-foreground">{item.badge()}</span>}
    </NavLink>
  );
}

function NavGroupView({ group, collapsed }: { group: NavGroup; collapsed: boolean }) {
  return (
    <div className="space-y-1">
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
}: {
  groups: NavGroup[];
  collapsed: boolean;
  width: number;
  onResize: (px: number) => void;
}) {
  return (
    <aside
      data-slot="sidebar"
      data-collapsed={collapsed || undefined}
      style={collapsed ? undefined : { width: clampWidth(width) }}
      className={cn(
        "group/sidebar relative flex h-full flex-col border-r border-sidebar-border bg-sidebar",
        collapsed ? "w-14 transition-[width] duration-200" : "shrink-0",
      )}
    >
      <nav className="flex-1 space-y-3 overflow-y-auto p-2">
        {groups.map((group) => (
          <NavGroupView key={group.id} group={group} collapsed={collapsed} />
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-2">
        <Slot id="sidebar.footer" />
      </div>
      {!collapsed && <ResizeHandle width={clampWidth(width)} onResize={onResize} />}
    </aside>
  );
}
