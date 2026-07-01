import { type FramePlugin, Button, Input, useDrawer, usePersistentValue, useSetting } from "@picoframe/frame";
import { Cpu, Globe, PanelRight, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router";

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
  routes: [{ path: "notes", lazy: () => Promise.resolve({ default: DraftPage }), crumb: "Notes" }],
  nav: [
    {
      id: "demo.main",
      order: 10,
      items: [{ id: "demo.notes", label: "Notes", to: "/notes", order: 10 }],
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
  slots: [{ slot: "topbar.right", order: 10, Component: DrawerTrigger }],
  settings: [
    { id: "general", title: "General", order: 0, icon: SlidersHorizontal, Component: GeneralSettings },
    { id: "general.appearance", parent: "general", title: "Appearance", Component: AppearanceSettings },
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
