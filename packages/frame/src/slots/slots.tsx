import type { SlotContribution, SlotId } from "@picoframe/plugin-sdk";
import { type ReactNode, createContext, useContext } from "react";

type SlotMap = Map<string, SlotContribution[]>;

const SlotContext = createContext<SlotMap>(new Map());

/** Group slot contributions by slot id, each sorted by `order`. */
export function composeSlots(contributions: SlotContribution[]): SlotMap {
  const map: SlotMap = new Map();
  for (const c of contributions) {
    const list = map.get(c.slot) ?? [];
    list.push(c);
    map.set(c.slot, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }
  return map;
}

export function SlotProvider({ slots, children }: { slots: SlotMap; children: ReactNode }) {
  return <SlotContext.Provider value={slots}>{children}</SlotContext.Provider>;
}

/** Render every contribution registered for a slot id, in order. */
export function Slot({ id }: { id: SlotId }) {
  const map = useContext(SlotContext);
  const list = map.get(id);
  if (!list?.length) return null;
  return (
    <>
      {list.map(({ Component }, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: contributions are static for the app's lifetime
        <Component key={i} />
      ))}
    </>
  );
}
