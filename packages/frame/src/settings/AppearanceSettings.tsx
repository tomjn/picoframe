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
import { useStrings } from "../strings/strings";

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
          value ? "pf-primary-surface bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "inline-block size-4 rounded-full bg-background transition-transform",
            value ? "translate-x-[1.125rem] rtl:-translate-x-[1.125rem]" : "translate-x-1 rtl:-translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

const OPTIONS: { mode: ThemeMode; Icon: ComponentType<{ size?: number }> }[] = [
  { mode: "light", Icon: Sun },
  { mode: "dark", Icon: Moon },
  { mode: "system", Icon: Monitor },
];

/** A labeled radiogroup of circular colour swatches (used for both base and accent). */
function SwatchGroup<V extends string>({
  label,
  options,
  names,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly ThemeOption<V>[];
  names: Record<V, string>;
  selected: V;
  onSelect: (value: V) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map(({ value, swatch }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected === value}
            aria-label={names[value]}
            title={names[value]}
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
  const t = useStrings();
  const modeLabels: Record<ThemeMode, string> = { light: t.light, dark: t.dark, system: t.system };
  const layoutText: Record<LayoutOptionKey, { label: string; description: string }> = {
    popover: { label: t.layoutPopover, description: t.layoutPopoverDescription },
    hideWhenCollapsed: { label: t.layoutHideWhenCollapsed, description: t.layoutHideWhenCollapsedDescription },
    hoverReveal: { label: t.layoutHoverReveal, description: t.layoutHoverRevealDescription },
    collapseWhenNarrow: { label: t.layoutCollapseWhenNarrow, description: t.layoutCollapseWhenNarrowDescription },
    floatingTopBar: { label: t.layoutFloatingTopBar, description: t.layoutFloatingTopBarDescription },
    breadcrumbCollapsed: { label: t.layoutBreadcrumbCollapsed, description: t.layoutBreadcrumbCollapsedDescription },
    historyButtons: { label: t.layoutHistoryButtons, description: t.layoutHistoryButtonsDescription },
  };
  const anyExposed = LAYOUT_OPTIONS.some((key) => layoutConfig[key].exposed);
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-sm font-medium text-foreground">{t.theme}</div>
        <div
          role="radiogroup"
          aria-label={t.theme}
          className="inline-flex gap-0.5 rounded-md border border-border p-0.5"
        >
          {OPTIONS.map(({ mode: m, Icon }) => (
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
              {modeLabels[m]}
            </button>
          ))}
        </div>
      </div>

      <SwatchGroup label={t.baseColor} options={BASES} names={t.baseNames} selected={base} onSelect={setBase} />

      <SwatchGroup label={t.accentColor} options={ACCENTS} names={t.accentNames} selected={accent} onSelect={setAccent} />

      {anyExposed && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-foreground">{t.layout}</div>
          {LAYOUT_OPTIONS.map((key) => (
            <LayoutOptionToggle key={key} optionKey={key} {...layoutText[key]} />
          ))}
        </div>
      )}
    </div>
  );
}
