import type { ReactNode } from "react";
import { Navigate } from "react-router";

/**
 * Route guard mirroring a nav item's `useVisible` predicate. Wrap a page whose route
 * must be unreachable while gated: renders `children` when `use()` is true, otherwise
 * redirects (replacing history) to `redirectTo`. Cosmetic (sidebar-only) items don't
 * need this — use it only for the hard-gate subset, passing the same predicate you gave
 * the nav item's `useVisible`.
 */
export function NavGate({
  use,
  redirectTo = "/",
  children,
}: {
  use: () => boolean;
  redirectTo?: string;
  children: ReactNode;
}) {
  return use() ? <>{children}</> : <Navigate to={redirectTo} replace />;
}
