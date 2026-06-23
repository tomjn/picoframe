import { Suspense } from "react";
import { Outlet } from "react-router";
import { useFrame } from "../context/frame";

/** The single route-loading boundary. One generic fallback, no per-page skeletons. */
export function RouteHost() {
  const { fallback } = useFrame();
  return (
    <Suspense fallback={fallback}>
      <Outlet />
    </Suspense>
  );
}
