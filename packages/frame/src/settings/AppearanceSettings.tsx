import { Monitor, Moon, Sun } from "lucide-react";
import type { ComponentType } from "react";
import { type ThemeMode, useTheme } from "../context/theme";
import { cn } from "../lib/cn";

const OPTIONS: { mode: ThemeMode; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { mode: "light", label: "Light", Icon: Sun },
  { mode: "dark", label: "Dark", Icon: Moon },
  { mode: "system", label: "System", Icon: Monitor },
];

/** Frame-owned Appearance settings: a segmented Light/Dark/System theme control. */
export function AppearanceSettings() {
  const { mode, setMode } = useTheme();
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">Theme</div>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="inline-flex gap-0.5 rounded-md border border-border p-0.5"
      >
        {OPTIONS.map(({ mode: m, label, Icon }) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "flex items-center gap-2 rounded-[5px] px-3 py-1.5 text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              mode === m
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
