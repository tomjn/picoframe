import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
  /** The resolved appearance after applying `system` and any route override. */
  resolved: "light" | "dark";
  /**
   * Force an appearance regardless of `mode`, or `null` to go back to following it.
   * Drives `FrameRoute.appearance`. It does not touch the user's stored setting, so
   * the Appearance panel keeps showing what they chose.
   */
  setAppearanceOverride: (appearance: "light" | "dark" | null) => void;
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
  const [accent, setAccentState] = usePersistentState<Accent>("picoframe.accent", defaultAccent);
  const [base, setBase] = usePersistentState<Base>("picoframe.base", defaultBase);
  // The current route's forced appearance, if any. Deliberately not persisted: it belongs
  // to wherever the user happens to be, not to their preferences.
  const [override, setAppearanceOverride] = useState<"light" | "dark" | null>(null);
  // `system` has to be state rather than a read at render time, so that an OS change
  // both repaints and reaches `resolved` (which the toast surface reads).
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Applying an accent flips a transient `data-accent-anim` attribute for ~500ms;
  // theme.css uses it to briefly cross-fade colour-bearing surfaces so the new accent
  // glides in (gated behind prefers-reduced-motion). Wraps setAccent so the cue only
  // fires on explicit user changes, never on initial hydration.
  const accentAnimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setAccent = useCallback(
    (next: Accent) => {
      setAccentState(next);
      if (typeof document === "undefined") return;
      const root = document.documentElement;
      root.dataset.accentAnim = "";
      if (accentAnimTimer.current) clearTimeout(accentAnimTimer.current);
      accentAnimTimer.current = setTimeout(() => {
        delete document.documentElement.dataset.accentAnim;
        accentAnimTimer.current = null;
      }, 500);
    },
    [setAccentState],
  );
  useEffect(() => () => {
    if (accentAnimTimer.current) clearTimeout(accentAnimTimer.current);
  }, []);

  const preferred: "light" | "dark" = mode === "system" ? (systemDark ? "dark" : "light") : mode;
  const resolved: "light" | "dark" = override ?? preferred;

  // A layout effect so the class is on the document before the new route paints. A
  // passive effect would show one frame of the outgoing appearance on every navigation
  // that changes it.
  useLayoutEffect(() => {
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

  // Tracked whatever the mode, since `preferred` ignores it unless the mode is `system`.
  // One listener for the life of the provider beats re-subscribing on every mode change.
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ mode, setMode, resolved, setAppearanceOverride, accent, setAccent, base, setBase }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <AppFrame> / <ThemeProvider>");
  return ctx;
}
