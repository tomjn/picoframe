import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { useNavigate } from "react-router";

export type NavDirection = "back" | "forward";

/**
 * Map a DOM mouse button to a navigation direction. The X1/X2 ("back"/"forward")
 * buttons arrive as `MouseEvent.button` 3 and 4 respectively.
 */
export function directionForButton(button: number): NavDirection | null {
  if (button === 3) return "back";
  if (button === 4) return "forward";
  return null;
}

/**
 * Wire the X1/X2 mouse buttons to router back/forward, cross-platform:
 *
 * - Windows / Linux: the webview delivers the buttons as DOM `mouseup` events
 *   (buttons 3/4), handled here directly.
 * - macOS: WKWebView does not surface those buttons to the DOM, so a native
 *   NSEvent monitor in `picoframe-core` swallows them and emits a `mouse-nav`
 *   Tauri event (`"back"` / `"forward"`) which we translate here.
 *
 * Place once inside the router (the frame calls it from `AppLayout`).
 */
export function useMouseNavigation(): void {
  const navigate = useNavigate();

  useEffect(() => {
    const go = (dir: NavDirection) => navigate(dir === "back" ? -1 : 1);

    const onMouseUp = (e: MouseEvent) => {
      const dir = directionForButton(e.button);
      if (dir) {
        e.preventDefault();
        go(dir);
      }
    };
    window.addEventListener("mouseup", onMouseUp);

    const unlisten = listen<string>("mouse-nav", (e) => {
      if (e.payload === "back" || e.payload === "forward") go(e.payload);
    });

    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      unlisten.then((fn) => fn());
    };
  }, [navigate]);
}
