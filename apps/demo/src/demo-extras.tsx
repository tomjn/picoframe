import {
  type FramePlugin,
  Button,
  Input,
  useDrawer,
  useHideSidebar,
  usePersistentValue,
  useSetting,
} from "@picoframe/frame";
import { Cpu, Globe, LayoutDashboard, Maximize, PanelRight, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useDemoLayoutControls } from "./demo-layout-controls";

/** Settings: General → display name (text), Appearance → compact mode (toggle). */
function GeneralSettings() {
  const [name, setName] = useSetting("demo.general.displayName", "");
  return (
    <div className="grid max-w-sm gap-2">
      <span className="text-sm font-medium">Display name</span>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      <p className="text-xs text-muted-foreground">Persisted via useSetting; survives reload.</p>
    </div>
  );
}

function AppearanceSettings() {
  const [compact, setCompact] = useSetting("demo.appearance.compact", false);
  return (
    <label className="flex items-center gap-3 text-sm">
      <input
        type="checkbox"
        className="size-4"
        checked={compact}
        onChange={(e) => setCompact(e.target.checked)}
      />
      Compact mode
    </label>
  );
}

/** A sub-category under "Engine" — the hot-link target demonstrated from the drawer. */
function GraphicsSettings() {
  const [vsync, setVsync] = useSetting("demo.engine.graphics.vsync", true);
  return (
    <label className="flex items-center gap-3 text-sm">
      <input
        type="checkbox"
        className="size-4"
        checked={vsync}
        onChange={(e) => setVsync(e.target.checked)}
      />
      Enable VSync
    </label>
  );
}

/** A page whose draft text survives navigating away and back — via the disk store. */
function DraftPage() {
  const [draft, setDraft] = usePersistentValue("demo.notes.draft", "");
  return (
    <div className="grid max-w-lg gap-3 p-6">
      <h1 className="text-lg font-semibold">Scratch notes</h1>
      <textarea
        className="min-h-40 rounded-md border p-3 text-sm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Type here, navigate away, come back — it's still here."
      />
      <p className="text-xs text-muted-foreground">
        Persisted to disk via usePersistentValue; survives navigation and reload.
      </p>
    </div>
  );
}

/** Demo-only toggles for the app-configured layout options (see demo-layout-controls). */
function DemoLayoutSettings() {
  const c = useDemoLayoutControls();
  const row = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <label className="flex items-center gap-3 text-sm">
      <input
        type="checkbox"
        className="size-4"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
  return (
    <div className="grid gap-3">
      {row("Show menu label (popover mode)", c.menuLabelVisible, (v) => c.set({ menuLabelVisible: v }))}
      {row("Use an image as the menu label", c.useImageLabel, (v) => c.set({ useImageLabel: v }))}
      {row("Hide breadcrumb", c.breadcrumbHidden, (v) => c.set({ breadcrumbHidden: v }))}
      <p className="text-xs text-muted-foreground">
        App-configured layout options (not user settings); wired here only to exercise them.
        Turn on "Sidebar as popover menu" in Appearance to see the menu button, then open it to
        watch the icon swap hamburger → chevron.
      </p>
    </div>
  );
}

/**
 * A page that takes the full width. Calling the hook unconditionally hides the rail for the
 * whole page. The toggle shows the conditional form, where the page keeps the sidebar until
 * it enters its own full-screen mode. Either way the nav stays behind the menu button.
 */
function FocusPage() {
  const [zen, setZen] = useState(false);
  useHideSidebar(zen);
  return (
    <div className="grid max-w-lg gap-4 p-6">
      <h1 className="text-lg font-semibold">Focus mode</h1>
      <p className="text-sm text-muted-foreground">
        useHideSidebar() drops the docked rail while this page is mounted. The top bar's menu
        button still opens the full nav, and leaving the page restores the rail at its previous
        width and collapse state.
      </p>
      <Button variant="outline" size="sm" className="justify-self-start" onClick={() => setZen((v) => !v)}>
        <Maximize size={16} />
        {zen ? "Leave zen mode" : "Enter zen mode"}
      </Button>
    </div>
  );
}

/** Example content for the centered top-bar slot. */
function CenterSlot() {
  return (
    <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
      Center slot
    </span>
  );
}

function DrawerBody() {
  const navigate = useNavigate();
  const { close } = useDrawer();
  return (
    <div className="grid gap-3 text-sm">
      <p className="text-muted-foreground">
        A consistent, frame-managed side drawer. Press Esc or click the backdrop to close.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          navigate("/settings/engine.graphics");
          close();
        }}
      >
        Jump to Engine → Graphics settings
      </Button>
    </div>
  );
}

function DrawerTrigger() {
  const { open } = useDrawer();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        open({
          title: "Demo drawer",
          description: "Opened via useDrawer()",
          content: <DrawerBody />,
        })
      }
    >
      <PanelRight size={16} />
      Drawer
    </Button>
  );
}

/**
 * Demo-local plugin exercising 0.0.6 features: a side drawer (top-bar trigger) and a
 * hierarchical, hot-linkable settings tree (General/Appearance + Engine/Graphics).
 */
export const demoExtrasPlugin: FramePlugin = {
  id: "demo.extras",
  version: "0.0.0",
  routes: [
    { path: "notes", lazy: () => Promise.resolve({ default: DraftPage }), crumb: "Notes" },
    { path: "drawer-lab", lazy: () => import("./demo-drawer-lab"), crumb: "Drawer lab" },
    { path: "focus", lazy: () => Promise.resolve({ default: FocusPage }), crumb: "Focus mode" },
  ],
  nav: [
    {
      id: "demo.main",
      order: 10,
      items: [
        { id: "demo.notes", label: "Notes", to: "/notes", order: 10 },
        { id: "demo.drawer-lab", label: "Drawer lab", to: "/drawer-lab", icon: PanelRight, order: 20 },
        { id: "demo.focus", label: "Focus mode", to: "/focus", icon: Maximize, order: 30 },
      ],
    },
    {
      id: "demo.resources",
      label: "Resources",
      order: 90,
      // `href` nav items open in the system browser via the Tauri opener; they
      // also appear as launcher cards on the home page. `sidebar: false` keeps
      // this one off the sidebar so it shows only on the home launcher.
      items: [
        {
          id: "demo.resources.source",
          label: "Source on GitHub",
          href: "https://github.com/tomjn/picoframe",
          icon: Globe,
          sidebar: false,
        },
      ],
    },
  ],
  slots: [
    { slot: "topbar.right", order: 10, Component: DrawerTrigger },
    { slot: "topbar.center", order: 0, Component: CenterSlot },
  ],
  settings: [
    { id: "general", title: "General", order: 0, icon: SlidersHorizontal, Component: GeneralSettings },
    { id: "general.appearance", parent: "general", title: "Appearance", Component: AppearanceSettings },
    { id: "layout-demo", title: "Layout (demo)", order: 5, icon: LayoutDashboard, Component: DemoLayoutSettings },
    // Pure category (no Component) — renders links to its sub-sections.
    { id: "engine", title: "Engine", order: 10, icon: Cpu },
    {
      id: "engine.graphics",
      parent: "engine",
      title: "Graphics",
      description: "Rendering options.",
      Component: GraphicsSettings,
    },
  ],
};
