import { Monitor, Moon, Sun } from "lucide-react";
import type { ComponentType } from "react";
import {
  LAYOUT_OPTIONS,
  type LayoutOptionKey,
  useLayoutConfig,
  useLayoutOption,
} from "../context/layoutConfig";
import { type ThemeMode, useTheme } from "../context/theme";
import { ACCENTS, BASES, type ThemeOption } from "../context/themeConfig";
import { cn } from "../lib/cn";

/** A labeled on/off switch for one exposed layout option; renders nothing when locked. */
function LayoutOptionToggle({ optionKey, label, description }: { optionKey: LayoutOptionKey; label: string; description: string }) {
  const [value, setValue] = useLayoutOption(optionKey);
  if (!setValue) return null; // locked: no user control
  const labelId = `layout-opt-${optionKey}`;
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div id={labelId} className="text-sm text-foreground">
          {label}
        </div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-labelledby={labelId}
        onClick={() => setValue(!value)}
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-border transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          value ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "inline-block size-4 rounded-full bg-background transition-transform",
            value ? "translate-x-[1.125rem]" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

const OPTIONS: { mode: ThemeMode; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { mode: "light", label: "Light", Icon: Sun },
  { mode: "dark", label: "Dark", Icon: Moon },
  { mode: "system", label: "System", Icon: Monitor },
];

/** A labeled radiogroup of circular colour swatches (used for both base and accent). */
function SwatchGroup<V extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly ThemeOption<V>[];
  selected: V;
  onSelect: (value: V) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map(({ value, label: optLabel, swatch }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected === value}
            aria-label={optLabel}
            title={optLabel}
            onClick={() => onSelect(value)}
            className={cn(
              "size-7 rounded-full border border-border transition-shadow",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected === value && "ring-2 ring-ring ring-offset-2 ring-offset-background",
            )}
            style={{ background: swatch }}
          />
        ))}
      </div>
    </div>
  );
}

/** Frame-owned Appearance settings: a Light/Dark/System theme control and an accent picker. */
export function AppearanceSettings() {
  const { mode, setMode, accent, setAccent, base, setBase } = useTheme();
  const layoutConfig = useLayoutConfig();
  const anyExposed = LAYOUT_OPTIONS.some((o) => layoutConfig[o.key].exposed);
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

      <SwatchGroup label="Base color" options={BASES} selected={base} onSelect={setBase} />

      <SwatchGroup label="Accent color" options={ACCENTS} selected={accent} onSelect={setAccent} />

      {anyExposed && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-foreground">Layout</div>
          {LAYOUT_OPTIONS.map((o) => (
            <LayoutOptionToggle key={o.key} optionKey={o.key} label={o.label} description={o.description} />
          ))}
        </div>
      )}
    </div>
  );
}
