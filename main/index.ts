import { app, shell, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { readFile, writeFile } from "fs/promises";
// import { updateElectronApp } from "update-electron-app";
//
// updateElectronApp();

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    icon: process.platform === "linux" ? "../resources/icon.png" : undefined,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
    },
  });

  const docsPath = app.getPath("documents");
  ipcMain.handle("get-open-path", async (_, path?: string) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        defaultPath: path ?? docsPath,
        buttonLabel: "Select",
        filters: [{ name: "JSON List file", extensions: [".jsonl"] }],
      });
      if (result.canceled) return;
      return (path = result.filePaths[0]);
    } catch (error) {
      dialog.showErrorBox(
        "System file dialog error",
        `Failed to get open path: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return;
    }
  });

  ipcMain.handle("get-save-path", async (_, path?: string) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: path ?? docsPath,
        buttonLabel: "Save",
        filters: [{ name: "JSON List file", extensions: [".jsonl"] }],
      });
      if (result.canceled) return;
      return (path = result.filePath);
    } catch (error) {
      dialog.showErrorBox(
        "System file dialog error",
        `Failed to get save path: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return;
    }
  });

  ipcMain.handle("get-session", async (_, path: string) => {
    try {
      const file = await readFile(path, { encoding: "utf-8" });
      return file;
    } catch (error) {
      dialog.showErrorBox(
        "Invalid Open Path",
        `Read file at ${path} failed with the following error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return;
    }
  });

  ipcMain.on(
    "save-session",
    async (_, { data, path }: { data: string; path: string }) => {
      if (!data) {
        dialog.showErrorBox(
          "Invalid Save Data",
          "Save data is empty, please check your data",
        );
        return;
      }
      if (!path) {
        dialog.showErrorBox(
          "Invalid Save Path",
          "Save path is empty, please check your path",
        );
        return;
      }
      try {
        await writeFile(path, data);
      } catch (error) {
        dialog.showErrorBox(
          "Invalid Save Path",
          `Write file failed with following error: ${error}`,
        );
      }
    },
  );

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  // if (is.dev) {
  ipcMain.on("open-dev-tools", () => {
    mainWindow.webContents.openDevTools();
  });
  // }

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    void mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app
  .whenReady()
  .then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId("com.electron");

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on("browser-window-created", (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    // IPC test
    ipcMain.on("ping", () => console.log("pong"));

    createWindow();

    app.on("activate", function() {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  })
  .catch((error) => {
    console.error("Error:", error);
    dialog.showErrorBox(
      "App initialization error",
      `Failed to initialize app: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    app.quit();
  });

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
