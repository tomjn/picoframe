import type { FramePlugin } from "@picoframe/plugin-sdk";
import { type ReactNode, useMemo } from "react";
import { HashRouter, type RouteObject, useRoutes } from "react-router";
import { FrameProvider } from "./context/frame";
import { type HomeOverride, homePlugin } from "./home";
import { ThemeProvider, type ThemeMode } from "./context/theme";
import { DrawerProvider } from "./drawer/DrawerProvider";
import { NavigationStackProvider } from "./history/navigation-stack";
import { DefaultFallback } from "./layout/DefaultFallback";
import { composeNav } from "./nav/composeNav";
import { buildRoutes } from "./routing/buildRoutes";
import { buildCrumbResolvers } from "./routing/crumbs";
import { composeSettings } from "./settings/composeSettings";
import { SettingsStoreProvider } from "./settings/SettingsStoreProvider";
import { settingsPlugin } from "./settings/settingsPlugin";
import type { SettingsStorage } from "./settings/storage";
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
  /**
   * Backend for persisting settings values (`useSetting`). Defaults to `localStorage`;
   * supply your own to persist elsewhere (e.g. a Tauri store) when settings are part of
   * a larger app.
   */
  settingsStorage?: SettingsStorage;
}

function RoutedApp({ routes }: { routes: RouteObject[] }) {
  return useRoutes(routes);
}

/** Root component. Composes plugins into the frame: theme, router, nav, slots, routes. */
export function AppFrame({
  plugins,
  title = "picoframe",
  home,
  theme,
  fallback,
  settingsStorage,
}: AppFrameProps) {
  // The frame owns the home route/nav; replace any user-passed `frame` plugin.
  const resolved = useMemo(
    () => [homePlugin(home), ...plugins.filter((p) => p.id !== "frame")],
    [plugins, home],
  );
  // The frame always owns the settings route, footer link, and Appearance (theme)
  // section, so settings compose from the full plugin set including settingsPlugin.
  const composed = useMemo(() => [...resolved, settingsPlugin()], [resolved]);
  const settings = useMemo(() => composeSettings(composed), [composed]);
  const routes = useMemo(() => buildRoutes(composed), [composed]);
  const nav = useMemo(() => composeNav(resolved), [resolved]);
  const crumbs = useMemo(() => {
    const resolvers = buildCrumbResolvers(composed);
    // Settings deep-links are flat (`/settings/<id>`), so the section id is the URL
    // segment. Map each to its ancestor title chain so the bar reads e.g.
    // "Settings / Engine / Graphics" instead of title-casing the raw id.
    for (const [id, node] of settings.byId) {
      const chain: string[] = [];
      const seen = new Set<string>();
      let cur: typeof node | undefined = node;
      while (cur && !seen.has(cur.id)) {
        seen.add(cur.id);
        chain.unshift(cur.title);
        cur = cur.parent ? settings.byId.get(cur.parent) : undefined;
      }
      resolvers.static.set(`/settings/${id}`, chain.length > 1 ? chain : node.title);
    }
    return resolvers;
  }, [composed, settings]);
  const slots = useMemo(() => composeSlots(composed.flatMap((p) => p.slots ?? [])), [composed]);

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
            <SettingsStoreProvider storage={settingsStorage}>
              <DrawerProvider>
                <FrameProvider
                  value={{ title, nav, crumbs, settings, fallback: fallback ?? <DefaultFallback /> }}
                >
                  {routed}
                </FrameProvider>
              </DrawerProvider>
            </SettingsStoreProvider>
          </SlotProvider>
        </NavigationStackProvider>
      </HashRouter>
    </ThemeProvider>
  );
}
