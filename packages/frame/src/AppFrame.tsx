import type { FramePlugin } from "@picoframe/plugin-sdk";
import { type ReactNode, useMemo } from "react";
import { HashRouter, type RouteObject, useRoutes } from "react-router";
import { FrameProvider } from "./context/frame";
import { type HomeOverride, homePlugin } from "./home";
import { ThemeProvider, type ThemeMode } from "./context/theme";
import { NavigationStackProvider } from "./history/navigation-stack";
import { DefaultFallback } from "./layout/DefaultFallback";
import { composeNav } from "./nav/composeNav";
import { buildRoutes } from "./routing/buildRoutes";
import { buildCrumbMap } from "./routing/crumbs";
import { SlotProvider, composeSlots } from "./slots/slots";

export interface AppFrameProps {
  /** Plugins to compose. The built-in home page is provided automatically. */
  plugins: FramePlugin[];
  /** App title shown in the top bar when no breadcrumb is available. */
  title?: string;
  /**
   * Customize the built-in home: a component or `{ Component, label, icon }` to
   * override the page and/or its nav item, or `false` to disable it (then `/`
   * redirects to the first sidebar route).
   */
  home?: HomeOverride | false;
  theme?: { defaultMode?: ThemeMode };
  /** Override the generic route-loading fallback. */
  fallback?: ReactNode;
}

function RoutedApp({ routes }: { routes: RouteObject[] }) {
  return useRoutes(routes);
}

/** Root component. Composes plugins into the frame: theme, router, nav, slots, routes. */
export function AppFrame({ plugins, title = "picoframe", home, theme, fallback }: AppFrameProps) {
  // The frame owns the home route/nav; replace any user-passed `frame` plugin.
  const resolved = useMemo(
    () => [homePlugin(home), ...plugins.filter((p) => p.id !== "frame")],
    [plugins, home],
  );
  const routes = useMemo(() => buildRoutes(resolved), [resolved]);
  const nav = useMemo(() => composeNav(resolved), [resolved]);
  const crumbs = useMemo(() => buildCrumbMap(resolved), [resolved]);
  const slots = useMemo(() => composeSlots(resolved.flatMap((p) => p.slots ?? [])), [resolved]);

  let routed: ReactNode = <RoutedApp routes={routes} />;
  for (const plugin of [...resolved].reverse()) {
    if (plugin.Provider) {
      const Provider = plugin.Provider;
      routed = <Provider>{routed}</Provider>;
    }
  }

  return (
    <ThemeProvider defaultMode={theme?.defaultMode}>
      <HashRouter>
        <NavigationStackProvider>
          <SlotProvider slots={slots}>
            <FrameProvider value={{ title, nav, crumbs, fallback: fallback ?? <DefaultFallback /> }}>
              {routed}
            </FrameProvider>
          </SlotProvider>
        </NavigationStackProvider>
      </HashRouter>
    </ThemeProvider>
  );
}
