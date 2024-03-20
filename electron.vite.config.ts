import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

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
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
  },
});
