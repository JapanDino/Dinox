/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dinoxLauncher", {
  ready: () => ipcRenderer.send("launcher:ready"),
  action: (name) => ipcRenderer.send("launcher:action", name),
  onState: (callback) => {
    ipcRenderer.on("launcher:state", (_event, state) => callback(state));
  },
});
