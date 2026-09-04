import { serverEnv } from "@packages/env/server";
import { app, BrowserWindow } from "electron";
import path from "node:path";

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(import.meta.dirname, "preload.js"),
    },
  });

  if (serverEnv.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(serverEnv.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(import.meta.dirname, "../renderer/index.html"),
    );
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
