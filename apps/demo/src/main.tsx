import { AppFrame } from "@picoframe/frame";
import { createTauriStore } from "@picoframe/store";
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
    />
  </StrictMode>,
);
