import { Monitor, Moon, Sun } from "lucide-react";
import type { ComponentType } from "react";
import { type Accent, type ThemeMode, useTheme } from "../context/theme";
import { cn } from "../lib/cn";

const OPTIONS: { mode: ThemeMode; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { mode: "light", label: "Light", Icon: Sun },
  { mode: "dark", label: "Dark", Icon: Moon },
  { mode: "system", label: "System", Icon: Monitor },
];

// Swatch preview colours mirror each accent's light-mode --primary (see theme.css);
// "zinc" is the neutral default.
const ACCENTS: { accent: Accent; label: string; color: string }[] = [
  { accent: "zinc", label: "Default", color: "hsl(240 6% 16%)" },
  { accent: "blue", label: "Blue", color: "hsl(221 83% 53%)" },
  { accent: "green", label: "Green", color: "hsl(142 76% 36%)" },
  { accent: "rose", label: "Rose", color: "hsl(347 77% 50%)" },
  { accent: "violet", label: "Violet", color: "hsl(262 83% 58%)" },
  { accent: "orange", label: "Orange", color: "hsl(25 95% 53%)" },
];

/** Frame-owned Appearance settings: a Light/Dark/System theme control and an accent picker. */
export function AppearanceSettings() {
  const { mode, setMode, accent, setAccent } = useTheme();
  return (
    <div className="space-y-6">
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

      <div className="space-y-2">
        <div className="text-sm font-medium text-foreground">Accent color</div>
        <div role="radiogroup" aria-label="Accent color" className="flex flex-wrap gap-2">
          {ACCENTS.map(({ accent: a, label, color }) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={accent === a}
              aria-label={label}
              title={label}
              onClick={() => setAccent(a)}
              className={cn(
                "size-7 rounded-full border border-border transition-shadow",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                accent === a && "ring-2 ring-ring ring-offset-2 ring-offset-background",
              )}
              style={{ background: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
