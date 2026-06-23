import { type ReactNode, createContext, useContext, useEffect } from "react";
import { usePersistentState } from "../lib/usePersistentState";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** The resolved appearance after applying `system`. */
  resolved: "light" | "dark";
}

const ThemeContext = createContext<ThemeValue | null>(null);

function systemPrefersDark(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({
  defaultMode = "system",
  children,
}: {
  defaultMode?: ThemeMode;
  children: ReactNode;
}) {
  const [mode, setMode] = usePersistentState<ThemeMode>("picoframe.theme", defaultMode);

  const resolved: "light" | "dark" = mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  useEffect(() => {
    if (mode !== "system" || typeof matchMedia === "undefined") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => document.documentElement.classList.toggle("dark", mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  return <ThemeContext.Provider value={{ mode, setMode, resolved }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <AppFrame> / <ThemeProvider>");
  return ctx;
}
