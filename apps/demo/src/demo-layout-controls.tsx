import { type ReactNode, createContext, useContext, useMemo, useState } from "react";

/**
 * Demo-only runtime controls for the app-configured layout options (menu label visibility,
 * image label, breadcrumb hiding). Lives ABOVE <AppFrame> so its values reach both the
 * `layout` prop (built by the demo wrapper) and the in-frame settings toggles that flip it.
 */
interface DemoLayoutControls {
  menuLabelVisible: boolean;
  useImageLabel: boolean;
  breadcrumbHidden: boolean;
  set: (patch: Partial<Omit<DemoLayoutControls, "set">>) => void;
}

const Ctx = createContext<DemoLayoutControls | null>(null);

export function DemoLayoutControlsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({
    menuLabelVisible: false,
    useImageLabel: false,
    breadcrumbHidden: false,
  });
  const value = useMemo<DemoLayoutControls>(
    () => ({ ...state, set: (patch) => setState((s) => ({ ...s, ...patch })) }),
    [state],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemoLayoutControls(): DemoLayoutControls {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDemoLayoutControls must be used within DemoLayoutControlsProvider");
  return c;
}

/** A self-contained logo used to demo an image-as-menu-label (no asset file needed). */
export const DEMO_LOGO =
  `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">' +
      '<rect width="20" height="20" rx="4" fill="#3b82f6"/>' +
      '<text x="10" y="14.5" font-size="12" font-family="sans-serif" text-anchor="middle" fill="white">P</text>' +
      "</svg>",
  )}`;
