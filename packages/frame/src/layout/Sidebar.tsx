import type { NavGroup, NavItem } from "@picoframe/plugin-sdk";
import { NavLink } from "react-router";
import { cn } from "../lib/cn";
import { Slot } from "../slots/slots";

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

export function Sidebar({ groups, collapsed }: { groups: NavGroup[]; collapsed: boolean }) {
  return (
    <aside
      data-slot="sidebar"
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-14" : "w-60",
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
    </aside>
  );
}
