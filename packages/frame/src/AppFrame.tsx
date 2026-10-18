import type { FramePlugin } from "@picoframe/plugin-sdk";
import { type ReactNode, useMemo } from "react";
import { Direction } from "radix-ui";
import { HashRouter, type RouteObject, useRoutes } from "react-router";
import { FrameProvider } from "./context/frame";
import { type LayoutConfig, LayoutConfigProvider } from "./context/layoutConfig";
import { type HomeOverride, homePlugin } from "./home";
import { ThemeProvider, type ThemeMode, type Accent, type Base } from "./context/theme";
import { type DrawerContainer, DrawerProvider } from "./drawer/DrawerProvider";
import { NavigationStackProvider } from "./history/navigation-stack";
import { DefaultFallback } from "./layout/DefaultFallback";
import { composeNav } from "./nav/composeNav";
import { RouteAppearance, buildAppearanceRules } from "./routing/appearance";
import { buildRoutes } from "./routing/buildRoutes";
import { buildCrumbResolvers } from "./routing/crumbs";
import { composeSettings } from "./settings/composeSettings";
import { SettingsBadgeProvider } from "./settings/SettingsBadge";
import { PersistentStoreProvider } from "./settings/SettingsStoreProvider";
import { settingsPlugin } from "./settings/settingsPlugin";
import type { PersistentStorage } from "./settings/storage";
import { SlotProvider, composeSlots } from "./slots/slots";
import { type FrameStrings, StringsProvider, resolveStrings } from "./strings/strings";

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
  theme?: { defaultMode?: ThemeMode; defaultAccent?: Accent; defaultBase?: Base };
  /**
   * Translate the text the frame draws itself. Every key is optional and falls back to
   * English. The frame ships no translations: build the table from your own translation
   * runtime and pass it here.
   */
  strings?: FrameStrings;
  /**
   * BCP 47 tag (for example `de`) used to sort the frame's settings sections. Omit to use the
   * runtime's default locale. Match it to the language your `strings` table is in.
   */
  locale?: string;
  /**
   * Reading direction of the frame. The frame sets it on its root element and hands it to
   * Radix, so menus, selects and popovers align to the right edge. Omit to follow
   * `document.documentElement.dir`, which falls back to `ltr`.
   */
  dir?: "ltr" | "rtl";
  /**
   * Configure sidebar/breadcrumb layout behaviours. Each option is a bare value (locked)
   * or `{ default, userConfigurable: true }` (exposed as a user setting seeded to `default`).
   */
  layout?: LayoutConfig;
  /** Override the generic route-loading fallback. */
  fallback?: ReactNode;
  /**
   * Drawer defaults. `container` sets a provider-level portal target for every drawer
   * (overridable per-open via `useDrawer().open({ container })`); omit to portal into
   * `document.body`.
   */
  drawer?: { container?: DrawerContainer };
  /**
   * Backend for persisting values (`useSetting` / `usePersistentValue`). Defaults to
   * `localStorage`; supply a disk-backed adapter (e.g. `createTauriStore()` from
   * `@picoframe/store`) to persist to disk and share state with the Rust side.
   */
  store?: PersistentStorage;
  /** @deprecated Use `store`. */
  settingsStorage?: PersistentStorage;
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
  strings,
  locale,
  dir,
  layout,
  fallback,
  drawer,
  store,
  settingsStorage,
}: AppFrameProps) {
  const resolvedDir = dir ?? (document.documentElement.dir === "rtl" ? "rtl" : "ltr");
  const { home: homeLabel, settings: settingsLabel, appearance: appearanceTitle, appearanceDescription } =
    resolveStrings(strings);
  // The frame owns the home route/nav; replace any user-passed `frame` plugin.
  const resolved = useMemo(
    () => [homePlugin(home, { home: homeLabel }), ...plugins.filter((p) => p.id !== "frame")],
    [plugins, home, homeLabel],
  );
  // The frame always owns the settings route, footer link, and Appearance (theme)
  // section, so settings compose from the full plugin set including settingsPlugin.
  // Its titles are read when settings and routes compose, so they come in as plain values and
  // a table rebuilt every render does not rebuild the routes.
  const composed = useMemo(
    () => [...resolved, settingsPlugin({ settings: settingsLabel, appearance: appearanceTitle, appearanceDescription })],
    [resolved, settingsLabel, appearanceTitle, appearanceDescription],
  );
  const settings = useMemo(() => composeSettings(composed, locale), [composed, locale]);
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
  const appearance = useMemo(() => buildAppearanceRules(composed), [composed]);

  let routed: ReactNode = <RoutedApp routes={routes} />;
  for (const plugin of [...resolved].reverse()) {
    if (plugin.Provider) {
      const Provider = plugin.Provider;
      routed = <Provider>{routed}</Provider>;
    }
  }

  return (
    <Direction.DirectionProvider dir={resolvedDir}>
    <StringsProvider strings={strings}>
    <ThemeProvider
      defaultMode={theme?.defaultMode}
      defaultAccent={theme?.defaultAccent}
      defaultBase={theme?.defaultBase}
    >
      <HashRouter>
        {/* Inside the router so it can read the path, inside ThemeProvider so it can
            override the appearance. Renders nothing. */}
        <RouteAppearance rules={appearance} />
        <NavigationStackProvider>
          <SlotProvider slots={slots}>
            <PersistentStoreProvider storage={store ?? settingsStorage}>
              <DrawerProvider container={drawer?.container}>
                <LayoutConfigProvider config={layout}>
                  <FrameProvider
                    value={{ title, nav, crumbs, settings, fallback: fallback ?? <DefaultFallback /> }}
                  >
                    <SettingsBadgeProvider>{routed}</SettingsBadgeProvider>
                  </FrameProvider>
                </LayoutConfigProvider>
              </DrawerProvider>
            </PersistentStoreProvider>
          </SlotProvider>
        </NavigationStackProvider>
      </HashRouter>
    </ThemeProvider>
    </StringsProvider>
    </Direction.DirectionProvider>
  );
}
