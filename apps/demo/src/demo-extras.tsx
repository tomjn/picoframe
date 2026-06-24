import { type FramePlugin, Button, Input, useDrawer, useSetting } from "@picoframe/frame";
import { Cpu, PanelRight, SlidersHorizontal } from "lucide-react";
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
  routes: [],
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
