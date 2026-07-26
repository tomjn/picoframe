import type { IconComponent } from "@picoframe/plugin-sdk";
import { ChevronDown, ChevronLeft, ChevronRight, Menu, PanelLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { useFrame } from "../context/frame";
import { useNavigationStack } from "../history/navigation-stack";
import { cn } from "../lib/cn";
import { decodeSegment, isRoutePath, resolveCrumb, titleCase } from "../routing/crumbs";
import { Slot } from "../slots/slots";
import type { HoverRevealHandlers } from "./HoverRevealSidebar";
import { SidebarPopover } from "./SidebarPopover";

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}

export function TopBar({
  title,
  onToggleSidebar,
  breadcrumbCollapsed = false,
  breadcrumbHidden = false,
  popover = false,
  menuFullscreen = false,
  menuOpen = false,
  onCloseMenu = () => {},
  menuIcon,
  menuIconOpen,
  menuLabel,
  menuLabelVisible = false,
  menuLabelContent,
  showHistoryButtons = true,
  toggleHoverHandlers,
}: {
  title: string;
  onToggleSidebar: () => void;
  /** In hover-reveal mode, hovering the toggle button is a reveal trigger. */
  toggleHoverHandlers?: HoverRevealHandlers;
  /** Show only the current route header; reveal the full path on hover/focus. */
  breadcrumbCollapsed?: boolean;
  /** Hide the breadcrumb region entirely. */
  breadcrumbHidden?: boolean;
  /** In popover mode the menu button anchors the sidebar popover beneath it. */
  popover?: boolean;
  /** Open the popover as a fullscreen panel below the top bar (the narrow-window mode). */
  menuFullscreen?: boolean;
  menuOpen?: boolean;
  onCloseMenu?: () => void;
  /** Popover-mode menu button icon while closed (defaults to a hamburger menu). */
  menuIcon?: IconComponent;
  /** Popover-mode menu button icon while open (defaults to a chevron). */
  menuIconOpen?: IconComponent;
  /** Popover-mode menu button accessible label + tooltip (defaults to "Menu"). */
  menuLabel?: string;
  /** Render the menu label as visible text beside the icon (default false; icon-only). */
  menuLabelVisible?: boolean;
  /** Custom visible label content (image/logo/JSX); replaces the text when shown. */
  menuLabelContent?: ReactNode;
  /** Show the back/forward navigation buttons. */
  showHistoryButtons?: boolean;
}) {
  const navigate = useNavigate();
  const { canBack, canForward } = useNavigationStack();
  const { crumbs: resolvers, nav } = useFrame();
  const { pathname } = useLocation();

  // Build cumulative breadcrumbs from the path; honor static parent labels and
  // per-route `crumb` (string or param-aware function), else title-case. Each
  // crumb carries `to` only when the accumulated path is a real, non-current
  // route, so ancestors you can navigate to become clickable and the rest stay
  // plain text.
  const crumbs: { label: string; to?: string }[] = [];
  const segments = pathname.split("/").filter(Boolean);
  let acc = "";
  segments.forEach((rawSeg, i) => {
    // `pathname` is URL-encoded (spaces -> %20); decode so lookups match the
    // unencoded route/crumb definitions and the fallback label reads cleanly.
    const seg = decodeSegment(rawSeg);
    acc += `/${seg}`;
    const isCurrent = i === segments.length - 1;
    const to = !isCurrent && isRoutePath(resolvers, acc) ? acc : undefined;
    const label = resolveCrumb(resolvers, acc);
    // A label may expand one segment into several crumbs (e.g. settings ancestry);
    // only the final piece maps to the accumulated path, so only it can link.
    if (Array.isArray(label)) {
      label.forEach((l, j) => crumbs.push({ label: l, to: j === label.length - 1 ? to : undefined }));
    } else {
      crumbs.push({ label: label ?? titleCase(seg), to });
    }
  });
  if (crumbs.length === 0) {
    const root = resolveCrumb(resolvers, "/");
    if (typeof root === "string") crumbs.push({ label: root });
  }

  // Render one crumb as a link (navigable ancestor) or plain text. `muted` dims
  // non-current crumbs; the current route header stays full-strength.
  const renderCrumb = (c: { label: string; to?: string }, muted: boolean) =>
    c.to ? (
      <button
        type="button"
        onClick={() => c.to && navigate(c.to)}
        className={cn(
          "-mx-1 min-w-0 truncate rounded-sm px-1 py-0.5 text-muted-foreground transition-colors",
          "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        {c.label}
      </button>
    ) : (
      <span className={cn("min-w-0 truncate", muted && "text-muted-foreground")}>{c.label}</span>
    );

  // Collapse to just the current header only when there's a trail to hide.
  const collapseCrumbs = breadcrumbCollapsed && crumbs.length > 1;
  const ancestors = collapseCrumbs ? crumbs.slice(0, -1) : [];
  const current = crumbs[crumbs.length - 1];

  // In popover mode the toggle opens the menu, so the sidebar glyph gives way to a
  // (customizable) menu button whose icon swaps between closed and open states; otherwise
  // it collapses the persistent rail.
  const closedIcon = menuIcon ?? Menu;
  const openIcon = menuIconOpen ?? ChevronDown;
  const ToggleIcon = popover ? (menuOpen ? openIcon : closedIcon) : PanelLeft;
  const toggleLabel = popover ? (menuLabel ?? "Menu") : "Toggle sidebar";
  const showMenuLabel = popover && menuLabelVisible;

  return (
    <header
      data-tauri-drag-region
      className="relative flex h-12 shrink-0 items-center gap-1 border-b border-border bg-background px-2"
    >
      <div className="relative" {...toggleHoverHandlers}>
        {showMenuLabel ? (
          <button
            type="button"
            aria-label={toggleLabel}
            title={toggleLabel}
            onClick={onToggleSidebar}
            className={cn(
              "flex h-8 items-center gap-2 rounded-md px-2 text-muted-foreground transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <ToggleIcon size={18} />
            {menuLabelContent ?? <span className="text-sm font-medium">{toggleLabel}</span>}
          </button>
        ) : (
          <IconButton label={toggleLabel} onClick={onToggleSidebar}>
            <ToggleIcon size={18} />
          </IconButton>
        )}
        {popover && (
          <SidebarPopover groups={nav} open={menuOpen} onClose={onCloseMenu} fullscreen={menuFullscreen} />
        )}
      </div>
      {showHistoryButtons && (
        <>
          <IconButton label="Back" disabled={!canBack} onClick={() => navigate(-1)}>
            <ChevronLeft size={18} />
          </IconButton>
          <IconButton label="Forward" disabled={!canForward} onClick={() => navigate(1)}>
            <ChevronRight size={18} />
          </IconButton>
        </>
      )}

      {/* `min-w-0` lets the trail shrink on a narrow window instead of pushing the right-hand
          slot cluster off the bar. Individual crumbs truncate rather than wrap. */}
      {!breadcrumbHidden && (
      <div
        data-slot="breadcrumbs"
        className="group ml-1 flex min-w-0 items-center gap-1 overflow-hidden text-sm font-medium"
      >
        {crumbs.length === 0 ? (
          <span>{title}</span>
        ) : collapseCrumbs ? (
          <>
            {/* Ancestors stay in the DOM (focusable → keyboard can reveal them) but the
                grid 0fr→1fr trick collapses their width until hover/focus, animating open. */}
            <div
              data-crumb-ancestors
              className={cn(
                "grid grid-cols-[0fr] overflow-hidden transition-[grid-template-columns] duration-200",
                "group-hover:grid-cols-[1fr] group-focus-within:grid-cols-[1fr]",
              )}
            >
              <div className="flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap">
                {ancestors.map((c, i) => (
                  <span key={`${c.label}-${i}`} className="flex items-center gap-1">
                    {renderCrumb(c, true)}
                    <span className="text-muted-foreground">/</span>
                  </span>
                ))}
              </div>
            </div>
            {renderCrumb(current, false)}
          </>
        ) : (
          crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {i > 0 && <span className="shrink-0 text-muted-foreground">/</span>}
              {renderCrumb(c, i !== crumbs.length - 1)}
            </span>
          ))
        )}
      </div>
      )}

      <div className="ml-2 flex items-center gap-1">
        <Slot id="topbar.left" />
      </div>
      {/* Absolutely centered so it stays centered regardless of the side clusters' widths. */}
      <div
        data-slot="topbar-center"
        className="pointer-events-none absolute left-1/2 top-0 flex h-full -translate-x-1/2 items-center [&>*]:pointer-events-auto"
      >
        <Slot id="topbar.center" />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Slot id="topbar.right" />
      </div>
    </header>
  );
}
