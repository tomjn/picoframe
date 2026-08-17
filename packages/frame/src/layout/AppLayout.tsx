import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useMouseNavigation } from "../history/useMouseNavigation";
import { useFrame } from "../context/frame";
import { useLayoutConfig, useLayoutOption } from "../context/layoutConfig";
import { DrawerHost } from "../drawer/DrawerHost";
import { Toaster } from "../toast/Toaster";
import { cn } from "../lib/cn";
import { useNarrowViewport } from "../lib/useNarrowViewport";
import { usePersistentState } from "../lib/usePersistentState";
import { HideSidebarProvider, type HideSidebarRegistry } from "./hideSidebar";
import { HoverRevealSidebar, useHoverReveal } from "./HoverRevealSidebar";
import { RouteHost } from "./RouteHost";
import { Sidebar, SIDEBAR_DEFAULT_WIDTH } from "./Sidebar";
import { useSidebarState } from "./useSidebarState";
import { TopBar } from "./TopBar";

/** The scroll container the skip link jumps to, and the page's `<main>` landmark. */
const MAIN_ID = "pf-main";

/**
 * The first stop of every Tab walk: a link that jumps past the chrome to the page.
 *
 * The sidebar, the resize handle, the toggle and the top-bar slots come before the
 * page in the DOM, and a keyboard reader would otherwise pass all of them on every
 * visit. That is WCAG 2.4.1 Bypass Blocks, and a heading structure only answers it
 * for a screen reader.
 *
 * It sits off the top of the viewport until focused rather than being hidden, so it
 * stays focusable, and it moves focus itself: following an in-page link scrolls in
 * WebKit without moving focus, which would leave the reader tabbing from the chrome
 * again.
 */
function SkipLink() {
  return (
    <a
      href={`#${MAIN_ID}`}
      data-slot="skip-link"
      onClick={(e) => {
        e.preventDefault();
        document.getElementById(MAIN_ID)?.focus();
      }}
      className={cn(
        "fixed left-3 top-3 z-50 -translate-y-20 rounded-md border border-border bg-background px-3 py-2",
        "text-sm font-medium text-foreground shadow-md transition-transform",
        "focus:translate-y-0 focus:outline-2 focus:outline-offset-2 focus:outline-ring",
      )}
    >
      Skip to content
    </a>
  );
}

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
  const [floatingTopBar] = useLayoutOption("floatingTopBar");
  const { menuButton, breadcrumbHidden, narrowBreakpoint } = useLayoutConfig();
  const [menuOpen, setMenuOpen] = useState(false);
  useMouseNavigation();

  // A count, not a flag, so overlapping `useHideSidebar` callers (and React StrictMode's
  // double-invoked effects) compose: the rail returns only once the last request is withdrawn.
  const [hideRequests, setHideRequests] = useState(0);
  const hideRegistry = useMemo<HideSidebarRegistry>(
    () => ({
      register: () => {
        setHideRequests((n) => n + 1);
        return () => setHideRequests((n) => n - 1);
      },
    }),
    [],
  );

  // A narrow window borrows the popover presentation for as long as it stays narrow. It
  // never writes the persisted collapse state, so widening restores the docked rail exactly
  // as the user left it.
  const narrow = useNarrowViewport(narrowBreakpoint) && collapseWhenNarrow;
  // A page asking for the full width borrows the same presentation: no docked rail, but the
  // menu button keeps the nav one click away, and the persisted collapse state is untouched.
  const popoverMode = popover || narrow || hideRequests > 0;

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
      <SkipLink />
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
      {/* The inset is published as a variable, and reads 0px when the bar is docked, so a page
          can pull itself back under a floating bar with `-mt-[var(--pf-topbar-inset)]` and stay
          inert in every other mode. */}
      <div
        className={cn("flex min-w-0 flex-1 flex-col", floatingTopBar && "relative")}
        style={{ "--pf-topbar-inset": floatingTopBar ? "3rem" : "0px" } as CSSProperties}
      >
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
          floating={floatingTopBar}
        />
        {/* `tabIndex={-1}` so the skip link can put focus here. It is not a tab stop. */}
        <main
          id={MAIN_ID}
          tabIndex={-1}
          data-slot="content-scroll"
          className="min-h-0 flex-1 overflow-auto overscroll-none pt-[var(--pf-topbar-inset)]"
        >
          {/* Scoped to the routed page: `useHideSidebar` is a page-level opt-out, not
              something the surrounding shell (top bar slots, drawer) reaches for. */}
          <HideSidebarProvider value={hideRegistry}>
            <RouteHost />
          </HideSidebarProvider>
        </main>
      </div>
      <DrawerHost />
      <Toaster position="bottom-right" closeButton />
    </div>
  );
}
