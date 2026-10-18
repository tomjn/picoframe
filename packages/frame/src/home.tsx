import type { FramePlugin, FrameRoute, IconComponent } from "@picoframe/plugin-sdk";
import { House } from "lucide-react";
import type { ComponentType } from "react";
import { Navigate } from "react-router";
import { useFrame } from "./context/frame";
import { createFramePlugin, framePlugin } from "./framePlugin";
import { type ResolvedStrings, defaultStrings } from "./strings/defaultStrings";

/**
 * Override for the built-in home page. A bare component replaces just the `/`
 * page (keeping the "Home" nav item); the object form also customizes the nav
 * item's label/icon and can keep the default page by omitting `Component`.
 */
export type HomeOverride =
  | ComponentType
  | { Component?: ComponentType; label?: string; icon?: IconComponent };

/** Index route used when the home is disabled: redirect to the first nav route. */
export function RedirectToFirst() {
  const { nav } = useFrame();
  const first = nav.flatMap((g) => g.items).find((i) => i.to !== "/")?.to;
  return first ? <Navigate to={first} replace /> : null;
}

/**
 * Resolve the home plugin from the `home` prop:
 * - `undefined` -> the default `framePlugin` (launcher home + "Home" nav item, labelled from `strings`).
 * - `false` -> no home page or nav item; `/` redirects to the first nav route.
 * - a component / `{ Component, label, icon }` -> override the page and/or nav item.
 */
export function homePlugin(
  home: HomeOverride | false | undefined,
  strings: Pick<ResolvedStrings, "home"> = defaultStrings,
): FramePlugin {
  if (home === undefined) {
    return strings.home === defaultStrings.home ? framePlugin : createFramePlugin(strings.home);
  }

  if (home === false) {
    return {
      id: "frame",
      version: framePlugin.version,
      routes: [{ index: true, lazy: () => Promise.resolve({ default: RedirectToFirst }) }],
    };
  }

  const cfg = typeof home === "function" ? { Component: home } : home;
  const label = cfg.label ?? strings.home;
  const icon = cfg.icon ?? House;
  const custom = cfg.Component;
  const lazyHome: FrameRoute["lazy"] = custom
    ? () => Promise.resolve({ default: custom })
    : () => import("./pages/Home");

  return {
    id: "frame",
    version: framePlugin.version,
    nav: [{ id: "main", order: 0, items: [{ id: "frame.home", label, to: "/", end: true, order: 0, icon }] }],
    routes: [{ index: true, lazy: lazyHome, crumb: label }],
  };
}
