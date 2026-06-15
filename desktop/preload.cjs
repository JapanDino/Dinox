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
});
