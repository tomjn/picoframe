import { AppFrame } from "@picoframe/frame";
import { createTauriStore } from "@picoframe/store";
import { Compass } from "lucide-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { plugins } from "./app.plugins";
import { demoExtrasPlugin } from "./demo-extras";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root element");

createRoot(root).render(
  <StrictMode>
    <AppFrame
      plugins={[...plugins, demoExtrasPlugin]}
      store={createTauriStore()}
      title="picoframe demo"
      // Expose the layout toggles in Appearance settings so the variations can be flipped
      // live, and show a customized popover-mode menu button (Compass + "Navigation")
      // instead of the default hamburger + "Menu".
      layout={{
        sidebar: {
          popover: { default: false, userConfigurable: true },
          hideWhenCollapsed: { default: false, userConfigurable: true },
          menuIcon: Compass,
          menuLabel: "Navigation",
        },
        breadcrumb: { collapsed: { default: false, userConfigurable: true } },
        history: { buttons: { default: true, userConfigurable: true } },
      }}
    />
  </StrictMode>,
);
