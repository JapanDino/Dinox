/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");

let packageVersion = "0.1.4";
try {
  packageVersion = require("../package.json").version || packageVersion;
} catch {
  // Keep a static fallback for packaged preload failures.
}

contextBridge.exposeInMainWorld("dinox", {
  version: packageVersion,

  // Open a small always-on-top Pomodoro popup window
  openPomodoroPopup: (relativeUrl) => {
    ipcRenderer.send("pomodoro:open", relativeUrl);
  },

  // Backup management — only available in the Electron desktop app
  backup: {
    /** Returns a sorted list of backup files in the data directory */
    list: () => ipcRenderer.invoke("backup:list"),
    /** Creates a manual backup of the current database */
    create: () => ipcRenderer.invoke("backup:create"),
    /** Restores the database from a named backup (creates a safety backup first) */
    restore: (name) => ipcRenderer.invoke("backup:restore", name),
    /** Permanently deletes a named backup file */
    delete: (name) => ipcRenderer.invoke("backup:delete", name),
    /** Opens the data directory in the OS file manager */
    openDir: () => ipcRenderer.invoke("backup:open-dir"),
  },
});
