import { type ReactNode, createContext, useContext, useMemo, useState } from "react";

/**
 * Value shown as an indicator on the Settings footer link. Interpreted as:
 * - `true` — a small attention dot (the common "something needs you" indicator);
 * - a `number` — a compact count bubble;
 * - any other node — rendered as-is inside the bubble;
 * - `false` / `null` / `undefined` — nothing.
 */
export type SettingsBadge = boolean | number | ReactNode;

interface SettingsBadgeContextValue {
  badge: SettingsBadge;
  setBadge: (badge: SettingsBadge) => void;
}

const SettingsBadgeContext = createContext<SettingsBadgeContextValue | null>(null);

/** Frame-mounted provider holding the single Settings footer-link badge. */
export function SettingsBadgeProvider({ children }: { children: ReactNode }) {
  const [badge, setBadge] = useState<SettingsBadge>(null);
  const value = useMemo(() => ({ badge, setBadge }), [badge]);
  return <SettingsBadgeContext.Provider value={value}>{children}</SettingsBadgeContext.Provider>;
}

/**
 * Read and set the badge/indicator on the frame's Settings footer link, from anywhere inside
 * `<AppFrame>`. Use it to surface a "something in settings needs you" signal (e.g. a stale
 * credential), typically driven from an effect:
 *
 * ```tsx
 * const { setBadge } = useSettingsBadge();
 * useEffect(() => setBadge(credentialStale), [credentialStale]); // dot when stale, cleared otherwise
 * ```
 *
 * The badge is a single shared slot (last writer wins) — one app-level owner is the intended
 * pattern. See {@link SettingsBadge} for accepted values.
 */
export function useSettingsBadge(): SettingsBadgeContextValue {
  const ctx = useContext(SettingsBadgeContext);
  if (!ctx) throw new Error("useSettingsBadge must be used within <AppFrame>");
  return ctx;
}
