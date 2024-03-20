import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// Custom APIs for renderer
const api = {
  getOpenPath: (defaultPath?: string) =>
    ipcRenderer.invoke("get-open-path", defaultPath) as Promise<string>,
  getSavePath: (defaultPath: string) =>
    ipcRenderer.invoke("get-save-path", defaultPath) as Promise<string>,
  getSession: (path: string) =>
    ipcRenderer.invoke("get-session", path) as Promise<string>,
  saveSession: (data: string, path: string) =>
    ipcRenderer.send("save-session", { data, path }),
  openDevTools: () => ipcRenderer.send("open-dev-tools"),
};

export type Api = typeof api;

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI;
  // @ts-expect-error (define in dts)
  window.api = api;
}
