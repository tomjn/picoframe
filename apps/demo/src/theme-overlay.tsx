import type { FramePlugin } from "@picoframe/frame";
import { AlertOctagon, AlertTriangle, CheckCircle2, Palette } from "lucide-react";

/**
 * Worked example for app-local token overlays (see packages/frame/THEMING.md). The
 * `--status-*` / `--link` tokens are declared in index.css layered on top of the frame's
 * theme.css; this view consumes them via the generated Tailwind utilities so you can flip
 * mode / accent / base in Appearance settings and watch each token behave as documented:
 * status colours hold their meaning across accents, --link tracks the active accent.
 */
// Full literal class strings — Tailwind scans source for verbatim names, so an
// interpolated `bg-status-${token}` would never be generated.
const STATUSES = [
  {
    label: "Critical",
    Icon: AlertOctagon,
    classes: "border-status-critical/30 bg-status-critical/10 text-status-critical",
  },
  {
    label: "Warning",
    Icon: AlertTriangle,
    classes: "border-status-warning/30 bg-status-warning/10 text-status-warning",
  },
  {
    label: "Success",
    Icon: CheckCircle2,
    classes: "border-status-success/30 bg-status-success/10 text-status-success",
  },
] as const;

function ThemeOverlayPage() {
  return (
    <div className="grid max-w-2xl gap-6 p-6">
      <header className="grid gap-1">
        <h1 className="text-lg font-semibold">App-local token overlay</h1>
        <p className="text-sm text-muted-foreground">
          These semantic tokens (<code>--status-critical/-warning/-success</code>, <code>--link</code>)
          are declared by this app in <code>index.css</code>, not by the frame. Open Appearance
          settings and change mode, accent, and base to see the intended behaviour.
        </p>
      </header>

      <section className="grid gap-3">
        <h2 className="text-sm font-medium">Status colours — accent-independent</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(({ label, Icon, classes }) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${classes}`}
            >
              <Icon size={14} />
              {label}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Hues are literal, so severity meaning survives an accent/base change — the same rule
          the frame applies to <code>--destructive</code> and the chart palette. Only light/dark
          shifts them, for contrast.
        </p>
      </section>

      <section className="grid gap-3">
        <h2 className="text-sm font-medium">Link colour — tracks the active accent</h2>
        <p className="text-sm">
          Read the{" "}
          <a href="#/theme-overlay" className="text-link underline underline-offset-2">
            frame theming guide
          </a>{" "}
          for the full pattern.
        </p>
        <p className="text-xs text-muted-foreground">
          <code>--link</code> aliases <code>--primary</code>, so switching accent recolours this
          link in step with buttons and focus rings — no per-accent overrides needed.
        </p>
      </section>
    </div>
  );
}

/** Demo-local plugin: one nav item + route showcasing the overlay tokens. */
export const themeOverlayPlugin: FramePlugin = {
  id: "demo.theme-overlay",
  version: "0.0.0",
  routes: [
    {
      path: "theme-overlay",
      lazy: () => Promise.resolve({ default: ThemeOverlayPage }),
      crumb: "Theme overlay",
    },
  ],
  nav: [
    {
      id: "demo.main",
      order: 10,
      items: [{ id: "demo.theme-overlay", label: "Theme overlay", to: "/theme-overlay", icon: Palette, order: 20 }],
    },
  ],
};
