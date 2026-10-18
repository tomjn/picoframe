import { type ReactNode, createContext, useContext, useMemo } from "react";
import { type ResolvedStrings, defaultStrings } from "./defaultStrings";

/**
 * The text a host can translate. Every key is optional and falls back to English. The colour
 * names are maps keyed by the colour id, so a host can translate without knowing the order.
 */
export type FrameStrings = Partial<Omit<ResolvedStrings, "accentNames" | "baseNames">> & {
  accentNames?: Partial<ResolvedStrings["accentNames"]>;
  baseNames?: Partial<ResolvedStrings["baseNames"]>;
};

/** Merge a host's table over the English defaults. An `undefined` value keeps the default. */
export function resolveStrings(strings?: FrameStrings): ResolvedStrings {
  const merged: Record<string, unknown> = { ...defaultStrings };
  for (const [key, value] of Object.entries(strings ?? {})) {
    if (value !== undefined) merged[key] = value;
  }
  return {
    ...(merged as ResolvedStrings),
    accentNames: { ...defaultStrings.accentNames, ...definedOnly(strings?.accentNames) },
    baseNames: { ...defaultStrings.baseNames, ...definedOnly(strings?.baseNames) },
  };
}

function definedOnly<T extends object>(map: T | undefined): Partial<T> {
  return Object.fromEntries(Object.entries(map ?? {}).filter(([, v]) => v !== undefined)) as Partial<T>;
}

const StringsContext = createContext<ResolvedStrings>(defaultStrings);

export function StringsProvider({ strings, children }: { strings?: FrameStrings; children: ReactNode }) {
  const resolved = useMemo(() => resolveStrings(strings), [strings]);
  return <StringsContext.Provider value={resolved}>{children}</StringsContext.Provider>;
}

/** The frame's text. Outside an `AppFrame` (a standalone `Drawer`, say) it is the English defaults. */
export function useStrings(): ResolvedStrings {
  return useContext(StringsContext);
}
