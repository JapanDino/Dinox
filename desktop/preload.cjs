/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dinox", {
  version: "0.1.0",

  // Open a small always-on-top Pomodoro popup window
  openPomodoroPopup: (relativeUrl) => {
    ipcRenderer.send("pomodoro:open", relativeUrl);
  },
});
