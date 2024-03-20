import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "main/index.ts"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "preload/index.ts"),
      },
    },
  },
  renderer: {
    root: ".",
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "index.html"),
        },
      },
    },
    plugins: [react(), TanStackRouterVite()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
  },
});
