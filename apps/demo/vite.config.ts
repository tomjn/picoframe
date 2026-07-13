import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://v2.tauri.app/start/frontend/vite/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
      // Run @picoframe/frame from source (not its built dist) so demo dev reflects local
      // frame edits with HMR — matching the Tailwind @source already pointed at frame/src.
      // Anchored to the bare specifier so the `/theme.css` subpath still resolves via exports.
      {
        find: /^@picoframe\/frame$/,
        replacement: fileURLToPath(new URL("../../packages/frame/src/index.ts", import.meta.url)),
      },
    ],
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome120" : "safari15",
  },
});
