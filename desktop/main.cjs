/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { app, BrowserWindow, dialog, shell } = require("electron");

const isDev = !app.isPackaged;
const PROD_HOST = "127.0.0.1";
const PROD_PORT = Number(process.env.DINOX_PROD_PORT ?? "3131");

let nextServerProcess = null;

function toPrismaFileUrl(filePath) {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function resolveRuntimePaths() {
  const appRoot = app.getAppPath();

  return {
    appRoot,
    prismaCli: path.join(appRoot, "node_modules", "prisma", "build", "index.js"),
    nextCli: path.join(appRoot, "node_modules", "next", "dist", "bin", "next"),
  };
}

function runNodeScript(scriptPath, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `Command failed with exit code ${code}`));
    });
  });
}

async function waitForServer(url, retries = 80) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok || response.status >= 300) {
        return;
      }
    } catch {
      // server is still booting
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function startProductionServer() {
  const runtimePaths = resolveRuntimePaths();
  const userDataDir = path.join(app.getPath("appData"), "Dinox");
  fs.mkdirSync(userDataDir, { recursive: true });

  const dbPath = path.join(userDataDir, "dinox.db");
  process.env.DATABASE_URL = toPrismaFileUrl(dbPath);

  await runNodeScript(runtimePaths.prismaCli, ["migrate", "deploy"], runtimePaths.appRoot);

  nextServerProcess = spawn(
    process.execPath,
    [runtimePaths.nextCli, "start", "-H", PROD_HOST, "-p", String(PROD_PORT)],
    {
      cwd: runtimePaths.appRoot,
      env: {
        ...process.env,
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    }
  );

  nextServerProcess.stderr.on("data", (chunk) => {
    console.error(`[next] ${chunk}`);
  });

  await waitForServer(`http://${PROD_HOST}:${PROD_PORT}`);

  return `http://${PROD_HOST}:${PROD_PORT}`;
}

async function resolveStartUrl() {
  if (isDev) {
    return process.env.DINOX_DEV_URL ?? "http://localhost:3000";
  }

  return startProductionServer();
}

function createMainWindow(startUrl) {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: "#f7f6f3",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  void window.loadURL(startUrl);
}

app.whenReady().then(async () => {
  try {
    const startUrl = await resolveStartUrl();
    createMainWindow(startUrl);

    app.on("activate", async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        const resolvedUrl = await resolveStartUrl();
        createMainWindow(resolvedUrl);
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown startup error.";
    console.error(message);

    await dialog.showErrorBox("Dinox startup failed", message);
    app.quit();
  }
});

app.on("before-quit", () => {
  if (nextServerProcess) {
    nextServerProcess.kill();
    nextServerProcess = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

