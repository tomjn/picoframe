import { AppFrame } from "@picoframe/frame";
import { createTauriStore } from "@picoframe/store";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { plugins } from "./app.plugins";
import { demoExtrasPlugin } from "./demo-extras";
import { DEMO_LOGO, DemoLayoutControlsProvider, useDemoLayoutControls } from "./demo-layout-controls";
import { themeOverlayPlugin } from "./theme-overlay";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root element");

// Hoisted so identity is stable: AppFrame memoizes routes/nav/settings on `plugins`, and a
// new store per render would drop persisted state. Only `layout` recomputes per toggle.
const allPlugins = [...plugins, demoExtrasPlugin, themeOverlayPlugin];
const store = createTauriStore();

/** Builds the layout config from the demo's runtime controls (see DemoLayoutControls). */
function DemoApp() {
  const { menuLabelVisible, useImageLabel, breadcrumbHidden } = useDemoLayoutControls();
  return (
    <AppFrame
      plugins={allPlugins}
      store={store}
      title="picoframe demo"
      // Popover/hide/collapse/history stay as user-facing Appearance toggles. The menu button
      // uses the frame defaults (hamburger closed, chevron open, label "Menu"); the demo's own
      // controls drive label visibility, an image label, and hiding the breadcrumb.
      layout={{
        sidebar: {
          popover: { default: false, userConfigurable: true },
          hideWhenCollapsed: { default: false, userConfigurable: true },
          hoverReveal: { default: false, userConfigurable: true },
          collapseWhenNarrow: { default: false, userConfigurable: true },
          menuLabelVisible,
          menuLabelContent: useImageLabel ? (
            <img src={DEMO_LOGO} alt="" className="h-5 w-5 rounded" />
          ) : undefined,
        },
        breadcrumb: {
          collapsed: { default: false, userConfigurable: true },
          hidden: breadcrumbHidden,
        },
        history: { buttons: { default: true, userConfigurable: true } },
      }}
    />
  );
}

createRoot(root).render(
  <StrictMode>
    <DemoLayoutControlsProvider>
      <DemoApp />
    </DemoLayoutControlsProvider>
  </StrictMode>,
);
