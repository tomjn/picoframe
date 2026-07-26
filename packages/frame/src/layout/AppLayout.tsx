import { useEffect, useState } from "react";
import { useMouseNavigation } from "../history/useMouseNavigation";
import { useFrame } from "../context/frame";
import { useLayoutConfig, useLayoutOption } from "../context/layoutConfig";
import { DrawerHost } from "../drawer/DrawerHost";
import { Toaster } from "../toast/Toaster";
import { useNarrowViewport } from "../lib/useNarrowViewport";
import { usePersistentState } from "../lib/usePersistentState";
import { HoverRevealSidebar, useHoverReveal } from "./HoverRevealSidebar";
import { RouteHost } from "./RouteHost";
import { Sidebar, SIDEBAR_DEFAULT_WIDTH } from "./Sidebar";
import { useSidebarState } from "./useSidebarState";
import { TopBar } from "./TopBar";

/** The frame's single layout route: sidebar + top bar + routed content. */
export function AppLayout() {
  const { nav, title } = useFrame();
  const { collapsed, setCollapsed } = useSidebarState();
  const [width, setWidth] = usePersistentState("picoframe.sidebar.width", SIDEBAR_DEFAULT_WIDTH);
  const [popover] = useLayoutOption("popover");
  const [hideWhenCollapsed] = useLayoutOption("hideWhenCollapsed");
  const [hoverReveal] = useLayoutOption("hoverReveal");
  const [collapseWhenNarrow] = useLayoutOption("collapseWhenNarrow");
  const [breadcrumbCollapsed] = useLayoutOption("breadcrumbCollapsed");
  const [historyButtons] = useLayoutOption("historyButtons");
  const { menuButton, breadcrumbHidden, narrowBreakpoint } = useLayoutConfig();
  const [menuOpen, setMenuOpen] = useState(false);
  useMouseNavigation();

  // A narrow window borrows the popover presentation for as long as it stays narrow. It
  // never writes the persisted collapse state, so widening restores the docked rail exactly
  // as the user left it.
  const narrow = useNarrowViewport(narrowBreakpoint) && collapseWhenNarrow;
  const popoverMode = popover || narrow;

  // Popover has no persistent sidebar, so there's nothing to hover-reveal. It wins.
  const hoverRevealActive = hoverReveal && !popoverMode;
  // The floating panel only stands in while the docked rail is collapsed away.
  const reveal = useHoverReveal(hoverRevealActive && collapsed);

  // In popover mode the menu button opens the overlay, otherwise it collapses the rail.
  const onToggleSidebar = popoverMode ? () => setMenuOpen((v) => !v) : () => setCollapsed((v) => !v);

  // Widening the window mid-menu would otherwise leave the panel hanging as an anchored card
  // with no way back to it, since the toggle reverts to collapsing the rail.
  useEffect(() => {
    if (!popoverMode) setMenuOpen(false);
  }, [popoverMode]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {!popoverMode && (
        <Sidebar
          groups={nav}
          collapsed={collapsed}
          width={width}
          onResize={setWidth}
          // Hover-reveal hides the docked rail entirely when collapsed; the floating panel replaces it.
          hideWhenCollapsed={hideWhenCollapsed || hoverRevealActive}
        />
      )}
      {hoverRevealActive && collapsed && (
        <HoverRevealSidebar
          groups={nav}
          revealed={reveal.revealed}
          hoverHandlers={reveal.hoverHandlers}
          onOpen={reveal.open}
          onClose={reveal.close}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={title}
          onToggleSidebar={onToggleSidebar}
          // Hovering the toggle is a second reveal trigger (alongside the left-edge strip).
          toggleHoverHandlers={hoverRevealActive && collapsed ? reveal.hoverHandlers : undefined}
          breadcrumbCollapsed={breadcrumbCollapsed}
          breadcrumbHidden={breadcrumbHidden}
          popover={popoverMode}
          menuFullscreen={narrow}
          menuOpen={menuOpen}
          onCloseMenu={() => setMenuOpen(false)}
          menuIcon={menuButton.icon}
          menuIconOpen={menuButton.iconOpen}
          menuLabel={menuButton.label}
          menuLabelVisible={menuButton.labelVisible}
          menuLabelContent={menuButton.labelContent}
          showHistoryButtons={historyButtons}
        />
        <main data-slot="content-scroll" className="min-h-0 flex-1 overflow-auto overscroll-none">
          <RouteHost />
        </main>
      </div>
      <DrawerHost />
      <Toaster position="bottom-right" closeButton />
    </div>
  );
}
