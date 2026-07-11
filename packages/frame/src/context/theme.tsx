import { type ReactNode, createContext, useContext, useEffect } from "react";
import { usePersistentState } from "../lib/usePersistentState";
import type { Accent, Base } from "./themeConfig";

export type ThemeMode = "light" | "dark" | "system";

export type { Accent, Base } from "./themeConfig";

/**
 * One-time migration: the neutral default accent was renamed "zinc" -> "neutral"
 * (freeing the shadcn base-ramp names). Rewrite any persisted legacy value so it
 * rehydrates correctly instead of applying a now-unknown accent. Called at import
 * time below — before ThemeProvider's usePersistentState reads it — so the very
 * first paint is already correct.
 */
export function migrateLegacyAccent(): void {
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("picoframe.accent") === '"zinc"') {
      localStorage.setItem("picoframe.accent", '"neutral"');
    }
  } catch {
    // ignore storage access failures (private mode, disabled storage)
  }
}

migrateLegacyAccent();

interface ThemeValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** The resolved appearance after applying `system`. */
  resolved: "light" | "dark";
  accent: Accent;
  setAccent: (accent: Accent) => void;
  base: Base;
  setBase: (base: Base) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function systemPrefersDark(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({
  defaultMode = "system",
  defaultAccent = "neutral",
  defaultBase = "zinc",
  children,
}: {
  defaultMode?: ThemeMode;
  defaultAccent?: Accent;
  defaultBase?: Base;
  children: ReactNode;
}) {
  const [mode, setMode] = usePersistentState<ThemeMode>("picoframe.theme", defaultMode);
  const [accent, setAccent] = usePersistentState<Accent>("picoframe.accent", defaultAccent);
  const [base, setBase] = usePersistentState<Base>("picoframe.base", defaultBase);

  const resolved: "light" | "dark" = mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  useEffect(() => {
    const root = document.documentElement;
    // The default accent carries no attribute, so the base tokens apply unchanged.
    if (accent === "neutral") delete root.dataset.accent;
    else root.dataset.accent = accent;
  }, [accent]);

  useEffect(() => {
    const root = document.documentElement;
    // The default base (zinc, hue 240) carries no attribute, matching the :root/.dark
    // token defaults, so the neutral ramp applies unchanged.
    if (base === "zinc") delete root.dataset.base;
    else root.dataset.base = base;
  }, [base]);

  useEffect(() => {
    if (mode !== "system" || typeof matchMedia === "undefined") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => document.documentElement.classList.toggle("dark", mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolved, accent, setAccent, base, setBase }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <AppFrame> / <ThemeProvider>");
  return ctx;
}
