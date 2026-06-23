import type { FramePlugin, FrameRoute } from "@picoframe/plugin-sdk";
import { createElement, lazy } from "react";
import type { RouteObject } from "react-router";
import { AppLayout } from "../layout/AppLayout";

function toRouteObject(route: FrameRoute): RouteObject {
  const Component = lazy(route.lazy);
  const element = createElement(Component);

  if (route.index) {
    return { index: true, element, handle: { crumb: route.crumb } };
  }
  return {
    path: route.path,
    element,
    children: route.children?.map(toRouteObject),
    handle: { crumb: route.crumb },
  };
}

/**
 * Compose all plugin routes into a React Router route tree nested under the
 * single `<AppLayout>` layout route. Every route is `React.lazy`, so the one
 * `<Suspense>` in `RouteHost` is the only loading boundary — no skeleton trees.
 */
export function buildRoutes(plugins: FramePlugin[]): RouteObject[] {
  const childRoutes = plugins.flatMap((p) => p.routes).map(toRouteObject);
  return [{ path: "/", element: createElement(AppLayout), children: childRoutes }];
}
