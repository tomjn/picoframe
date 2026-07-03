import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Registers window/document/etc. globally so React Testing Library can render.
GlobalRegistrator.register();
