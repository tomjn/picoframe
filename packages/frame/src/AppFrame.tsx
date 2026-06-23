import type { FramePlugin } from "@picoframe/plugin-sdk";
import { type ReactNode, useMemo } from "react";
import { HashRouter, type RouteObject, useRoutes } from "react-router";
import { FrameProvider } from "./context/frame";
import { ThemeProvider, type ThemeMode } from "./context/theme";
import { NavigationStackProvider } from "./history/navigation-stack";
import { DefaultFallback } from "./layout/DefaultFallback";
import { composeNav } from "./nav/composeNav";
import { buildRoutes } from "./routing/buildRoutes";
import { buildCrumbMap } from "./routing/crumbs";
import { SlotProvider, composeSlots } from "./slots/slots";

export interface AppFrameProps {
  /** Plugins to compose. Include `framePlugin` first for the default Home route. */
  plugins: FramePlugin[];
  /** App title shown in the top bar when no breadcrumb is available. */
  title?: string;
  theme?: { defaultMode?: ThemeMode };
  /** Override the generic route-loading fallback. */
  fallback?: ReactNode;
}

function RoutedApp({ routes }: { routes: RouteObject[] }) {
  return useRoutes(routes);
}

/** Root component. Composes plugins into the frame: theme, router, nav, slots, routes. */
export function AppFrame({ plugins, title = "picoframe", theme, fallback }: AppFrameProps) {
  const routes = useMemo(() => buildRoutes(plugins), [plugins]);
  const nav = useMemo(() => composeNav(plugins), [plugins]);
  const crumbs = useMemo(() => buildCrumbMap(plugins), [plugins]);
  const slots = useMemo(() => composeSlots(plugins.flatMap((p) => p.slots ?? [])), [plugins]);

  let routed: ReactNode = <RoutedApp routes={routes} />;
  for (const plugin of [...plugins].reverse()) {
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
