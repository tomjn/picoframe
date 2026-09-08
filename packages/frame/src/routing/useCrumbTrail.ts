import { useCallback, useSyncExternalStore } from "react";
import { useOptionalPersistentStore } from "../settings/SettingsStoreProvider";
import { type Crumb, type CrumbResolvers, buildCrumbTrail } from "./crumbs";

/** No store, or nothing on this path that could change. Subscribe to nothing. */
const noopSubscribe = () => () => {};

/**
 * The breadcrumb trail for a path, kept current as persisted values change.
 *
 * A `crumb` function usually turns an opaque id in the URL into a name it reads from
 * the store, and the name can change while you sit on the page. The top bar owns no
 * setting of its own, so nothing re-rendered it and the trail kept the name the page
 * had when you arrived. This subscribes on the crumb's behalf: while the current path
 * resolves through a function, any write to the store re-resolves the trail.
 *
 * A crumb function is called during this render, so it must stay a plain function. It
 * may read the store synchronously, and it must not call hooks: the number of crumbs
 * follows the path, so hooks inside one would change order on every navigation. That
 * is why the frame subscribes to every key rather than the ones a crumb read. It
 * cannot see them.
 *
 * A path made only of string and array crumbs subscribes to nothing, so a bar over
 * static routes costs what it always did.
 */
export function useCrumbTrail(resolvers: CrumbResolvers, pathname: string): Crumb[] {
  const store = useOptionalPersistentStore();
  const { crumbs, dynamic } = buildCrumbTrail(resolvers, pathname);

  const live = store !== null && dynamic;
  const subscribe = useCallback(
    (onChange: () => void) => (live && store ? store.subscribeAny(onChange) : noopSubscribe()),
    [store, live],
  );
  const revision = useCallback(() => (live && store ? store.revision() : 0), [store, live]);
  // The value is the render itself: a bumped revision re-runs this hook, which resolves
  // the crumbs again against what the store now holds.
  useSyncExternalStore(subscribe, revision, revision);

  return crumbs;
}
