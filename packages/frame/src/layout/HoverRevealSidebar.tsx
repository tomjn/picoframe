import type { NavGroup } from "@picoframe/plugin-sdk";
import { type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { cn } from "../lib/cn";
import { SidebarNav } from "./Sidebar";

/** Grace period before a pointer-leave dismisses the panel, so crossing the gap between the
 *  topbar toggle and the panel (two disjoint hover regions) doesn't flicker it shut. */
export const HOVER_REVEAL_GRACE_MS = 150;

/** The hover intent produced by {@link useHoverReveal}, shared by every reveal trigger. */
export interface HoverRevealHandlers {
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * Reveal state machine for the hover-reveal sidebar. Spread the returned `hoverHandlers` onto
 * every trigger (the edge strip, the panel, and the topbar toggle) so they share one open/close
 * lifecycle; `open`/`close` drive the keyboard and imperative paths. Force-closes and ignores
 * hover whenever `enabled` is false (sidebar expanded or the mode is off).
 */
export function useHoverReveal(enabled: boolean) {
  const [revealed, setRevealed] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const open = useCallback(() => {
    clearTimer();
    setRevealed(true);
  }, [clearTimer]);

  const close = useCallback(() => {
    clearTimer();
    setRevealed(false);
  }, [clearTimer]);

  const scheduleClose = useCallback(() => {
    clearTimer();
    closeTimer.current = setTimeout(() => setRevealed(false), HOVER_REVEAL_GRACE_MS);
  }, [clearTimer]);

  // Collapse back to hidden whenever the mode turns off (e.g. the sidebar is expanded again).
  useEffect(() => {
    if (!enabled) {
      clearTimer();
      setRevealed(false);
    }
  }, [enabled, clearTimer]);

  // Drop any pending timer on unmount.
  useEffect(() => clearTimer, [clearTimer]);

  const hoverHandlers: HoverRevealHandlers = enabled
    ? { onMouseEnter: open, onMouseLeave: scheduleClose }
    : {};

  return { revealed: enabled && revealed, hoverHandlers, open, close };
}

/**
 * The collapsed-state floating sidebar: a left-edge trigger strip plus a panel that slides in
 * over the content. Reveal is driven by hover (via the shared `hoverHandlers`) or by activating
 * the focusable edge trigger with the keyboard. Dismisses on pointer-leave (grace timer, owned by
 * the hook), Escape, an outside pointer-down, or a route change. Render only while the sidebar is
 * collapsed and the mode is active.
 */
export function HoverRevealSidebar({
  groups,
  revealed,
  hoverHandlers,
  onOpen,
  onClose,
}: {
  groups: NavGroup[];
  revealed: boolean;
  hoverHandlers: HoverRevealHandlers;
  /** Keyboard/imperative reveal (also moves focus into the panel). */
  onOpen: () => void;
  onClose: () => void;
}) {
  const { pathname } = useLocation();
  const prevPath = useRef(pathname);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close when the route actually changes. Seeding the ref with the current path means the
  // initial mount (prev === current) never fires a spurious close.
  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  // While open, Escape and any outside pointer-down close the panel. A pointer-down listener
  // (rather than a full-screen catcher) leaves the topbar toggle clickable.
  useEffect(() => {
    if (!revealed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
      // The panel is about to go inert; keep the keyboard user's place on the trigger.
      triggerRef.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [revealed, onClose]);

  const onTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onOpen();
    // Move focus into the panel once it's revealed (and no longer inert).
    requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("a,button,[tabindex]")?.focus();
    });
  };

  return (
    <>
      {/* Focusable edge strip: hover reveals; Tab + Enter/Space reveals for keyboard users. */}
      <button
        {...hoverHandlers}
        ref={triggerRef}
        type="button"
        aria-label="Reveal sidebar"
        aria-expanded={revealed}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "fixed left-0 top-12 bottom-0 z-40 w-3 cursor-pointer",
          "transition-colors hover:bg-sidebar-border/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        )}
      />
      <div
        {...hoverHandlers}
        ref={panelRef}
        data-slot="sidebar-reveal-panel"
        // Inert while closed so its links leave the tab order (no invisible-but-tabbable trap).
        inert={!revealed}
        className={cn(
          "fixed left-0 top-12 bottom-0 z-50 flex min-w-[160px] w-max max-w-[420px] flex-col",
          "border-r border-sidebar-border bg-sidebar shadow-lg",
          "transition duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none",
          revealed ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0",
        )}
      >
        <SidebarNav groups={groups} collapsed={false} />
      </div>
    </>
  );
}
