import { AppFrame } from "@picoframe/frame";
import { createTauriStore } from "@picoframe/store";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { plugins } from "./app.plugins";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root element");

createRoot(root).render(
  <StrictMode>
    <AppFrame plugins={plugins} store={createTauriStore()} title="{{APP_NAME}}" />
  </StrictMode>,
);
