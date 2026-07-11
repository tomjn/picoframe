import { useState } from "react";
import { useMouseNavigation } from "../history/useMouseNavigation";
import { useFrame } from "../context/frame";
import { useLayoutOption } from "../context/layoutConfig";
import { DrawerHost } from "../drawer/DrawerHost";
import { usePersistentState } from "../lib/usePersistentState";
import { RouteHost } from "./RouteHost";
import { Sidebar, SIDEBAR_DEFAULT_WIDTH } from "./Sidebar";
import { SidebarPopover } from "./SidebarPopover";
import { TopBar } from "./TopBar";

/** The frame's single layout route: sidebar + top bar + routed content. */
export function AppLayout() {
  const { nav, title } = useFrame();
  const [collapsed, setCollapsed] = usePersistentState("picoframe.sidebar.collapsed", false);
  const [width, setWidth] = usePersistentState("picoframe.sidebar.width", SIDEBAR_DEFAULT_WIDTH);
  const [popover] = useLayoutOption("popover");
  const [hideWhenCollapsed] = useLayoutOption("hideWhenCollapsed");
  const [breadcrumbCollapsed] = useLayoutOption("breadcrumbCollapsed");
  const [menuOpen, setMenuOpen] = useState(false);
  useMouseNavigation();

  // In popover mode the menu button opens the overlay; otherwise it collapses the rail.
  const onToggleSidebar = popover ? () => setMenuOpen((v) => !v) : () => setCollapsed((v) => !v);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {!popover && (
        <Sidebar
          groups={nav}
          collapsed={collapsed}
          width={width}
          onResize={setWidth}
          hideWhenCollapsed={hideWhenCollapsed}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} onToggleSidebar={onToggleSidebar} breadcrumbCollapsed={breadcrumbCollapsed} />
        <main data-slot="content-scroll" className="min-h-0 flex-1 overflow-auto overscroll-none">
          <RouteHost />
        </main>
      </div>
      {popover && <SidebarPopover groups={nav} open={menuOpen} onClose={() => setMenuOpen(false)} />}
      <DrawerHost />
    </div>
  );
}
