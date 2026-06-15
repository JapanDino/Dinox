/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { app, BrowserWindow, dialog, shell, screen, ipcMain } = require("electron");

// ── Intercept process.chdir ────────────────────────────────────────────────
// Next.js standalone server.js calls process.chdir(__dirname) at startup.
// When the app is packaged with asar, __dirname resolves to a virtual asar
// path (e.g. .../app.asar/.next/standalone) which is NOT a real directory.
// The OS rejects chdir() to such paths. We patch chdir to silently skip
// any attempt to chdir into an asar archive path.
const _origChdir = process.chdir;
process.chdir = function patchedChdir(dir) {
  if (typeof dir === "string" && dir.includes(".asar") && !dir.includes(".asar.unpacked")) {
    return; // skip — can't chdir into an asar virtual path
  }
  return _origChdir.call(process, dir);
};

const isDev = Boolean(process.env.DINOX_DEV_URL);
const PROD_HOST = "127.0.0.1";
const PROD_PORT = Number(process.env.DINOX_PROD_PORT ?? "3131");

let mainWindow = null;
let splashWindow = null;
let cachedRuntimeDir = null;
let productionServerBooted = false;

function toPrismaFileUrl(filePath) {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function resolveRuntimePaths() {
  const appRoot = app.getAppPath();
  // When packaged as asar, app.asar.unpacked holds extracted native files
  const unpackedRoot = appRoot.endsWith(".asar") ? appRoot + ".unpacked" : appRoot;

  return {
    appRoot,
    unpackedRoot,
    requireHookPath: path.join(appRoot, "desktop", "require-hook.cjs"),
    templateDbPath: path.join(appRoot, "prisma", "dev.db"),
    standaloneServerPath: path.join(appRoot, ".next", "standalone", "server.js"),
  };
}

// ── Find Prisma query engine in app.asar.unpacked ─────────────────────────
// Prisma needs a real on-disk path to dlopen() the query engine.
// This function walks the unpacked standalone node_modules to find it.
function findPrismaQueryEngine(unpackedRoot) {
  const searchBase = path.join(unpackedRoot, ".next", "standalone", "node_modules");
  if (!fs.existsSync(searchBase)) return null;

  function walk(dir, depth) {
    if (depth > 8) return null;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return null; }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.name === ".prisma") {
        // Look for query engine inside .prisma/client/
        const enginePath = path.join(fullPath, "client", "query_engine-windows.dll.node");
        if (fs.existsSync(enginePath)) return enginePath;
      }
      const result = walk(fullPath, depth + 1);
      if (result) return result;
    }
    return null;
  }

  return walk(searchBase, 0);
}

function ensureWritableDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    const probePath = path.join(dirPath, ".dinox-write-probe");
    fs.writeFileSync(probePath, String(Date.now()), "utf8");
    fs.rmSync(probePath, { force: true });
    return true;
  } catch {
    return false;
  }
}

function runtimeDirCandidates() {
  const candidates = [];

  if (process.env.DINOX_DATA_DIR) {
    candidates.push(process.env.DINOX_DATA_DIR);
  }

  if (process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, "Dinox"));
  }

  if (process.env.APPDATA) {
    candidates.push(path.join(process.env.APPDATA, "Dinox"));
  }

  try {
    candidates.push(path.join(app.getPath("home"), ".dinox"));
  } catch {
    // ignore
  }

  candidates.push(path.join(process.cwd(), ".dinox-runtime"));

  try {
    candidates.push(path.join(app.getAppPath(), ".dinox-runtime"));
  } catch {
    // ignore
  }

  return [...new Set(candidates.filter(Boolean))];
}

function runtimeDataDir() {
  if (cachedRuntimeDir) {
    return cachedRuntimeDir;
  }

  for (const candidate of runtimeDirCandidates()) {
    if (ensureWritableDir(candidate)) {
      cachedRuntimeDir = candidate;
      return candidate;
    }
  }

  throw new Error("No writable runtime directory found for Dinox.");
}

function runtimeLogPath() {
  return path.join(runtimeDataDir(), "startup.log");
}

function logRuntime(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.appendFileSync(runtimeLogPath(), line, "utf8");
  } catch {
    // ignore logging failures
  }
}

function ensureRuntimeDb(templateDbPath, targetDbPath) {
  if (fs.existsSync(targetDbPath)) {
    logRuntime(`Runtime DB already exists at ${targetDbPath}`);
    return;
  }

  if (!fs.existsSync(templateDbPath)) {
    throw new Error(`Template DB not found at ${templateDbPath}`);
  }

  fs.copyFileSync(templateDbPath, targetDbPath);
  logRuntime(`Created runtime DB from template: ${targetDbPath}`);
}

// ── Backup system ─────────────────────────────────────────────────────────────
// Backups are stored alongside the DB as `dinox.backup-vX.Y.Z-TIMESTAMP-LABEL.db`.
// They are created automatically before each update migration and on manual request.

const MAX_BACKUPS = 30;

function backupFileName(label) {
  const ts = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
  const version = (() => { try { return app.getVersion(); } catch { return "0"; } })();
  return `dinox.backup-v${version}-${ts}-${label}.db`;
}

function createBackup(dbPath, label) {
  if (!fs.existsSync(dbPath)) throw new Error(`DB not found at: ${dbPath}`);
  const dataDir = path.dirname(dbPath);
  const name = backupFileName(label);
  const dest = path.join(dataDir, name);
  fs.copyFileSync(dbPath, dest);
  logRuntime(`Backup created: ${name}`);
  pruneOldBackups(dataDir);
  return name;
}

function listBackups(dataDir) {
  try {
    return fs.readdirSync(dataDir)
      .filter((f) => /^dinox\.backup-.+\.db$/.test(f))
      .map((name) => {
        const filePath = path.join(dataDir, name);
        const stat = fs.statSync(filePath);
        return { name, size: stat.size, createdAt: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

function pruneOldBackups(dataDir) {
  const backups = listBackups(dataDir);
  if (backups.length <= MAX_BACKUPS) return;
  for (const b of backups.slice(MAX_BACKUPS)) {
    try { fs.rmSync(path.join(dataDir, b.name), { force: true }); } catch { /* ignore */ }
  }
}

function getLastSeenVersion(dataDir) {
  try { return fs.readFileSync(path.join(dataDir, "dinox-version.txt"), "utf8").trim(); }
  catch { return null; }
}

function saveLastSeenVersion(dataDir, version) {
  try { fs.writeFileSync(path.join(dataDir, "dinox-version.txt"), version, "utf8"); }
  catch { /* ignore */ }
}

// ── Migration runner ──────────────────────────────────────────────────────────
// Runs `prisma migrate deploy` via the bundled Prisma CLI so that any new
// schema migrations in the updated app are applied to the user's existing DB.

async function runMigrationsOnStartup(dbPath) {
  const runtimePaths = resolveRuntimePaths();
  const schemaPath = path.join(runtimePaths.appRoot, "prisma", "schema.prisma");

  if (!fs.existsSync(schemaPath)) {
    logRuntime("WARN: schema.prisma not found — skipping migrations");
    return;
  }

  // Prisma CLI may live in the standalone node_modules (production) or root (dev)
  const prismaCandidates = [
    path.join(runtimePaths.appRoot, ".next", "standalone", "node_modules", "prisma", "build", "index.js"),
    path.join(runtimePaths.unpackedRoot, ".next", "standalone", "node_modules", "prisma", "build", "index.js"),
    path.join(runtimePaths.appRoot, "node_modules", "prisma", "build", "index.js"),
  ];

  const prismaScript = prismaCandidates.find((p) => fs.existsSync(p));
  if (!prismaScript) {
    logRuntime("WARN: Prisma CLI not found in bundled node_modules — skipping migrations");
    return;
  }

  logRuntime(`Running: prisma migrate deploy via ${prismaScript}`);

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [prismaScript, "migrate", "deploy", "--schema", schemaPath], {
      env: {
        ...process.env,
        DATABASE_URL: toPrismaFileUrl(dbPath),
        PRISMA_HIDE_UPDATE_MESSAGE: "1",
      },
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += String(d); });
    child.stderr?.on("data", (d) => { stderr += String(d); });

    const timer = setTimeout(() => {
      child.kill();
      logRuntime("WARN: Migration timed out after 30s");
      resolve();
    }, 30_000);

    child.on("close", (code) => {
      clearTimeout(timer);
      logRuntime(`Migration finished (exit ${code})`);
      if (stdout.trim()) logRuntime(`Migration: ${stdout.trim()}`);
      if (stderr.trim()) logRuntime(`Migration stderr: ${stderr.trim()}`);
      resolve();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      logRuntime(`Migration spawn error: ${err.message}`);
      resolve();
    });
  });
}

async function waitForServer(url, retries = 160) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok || response.status >= 300) {
        logRuntime(`Server became ready on attempt ${attempt + 1}`);
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
  if (productionServerBooted) {
    return `http://${PROD_HOST}:${PROD_PORT}`;
  }

  const runtimePaths = resolveRuntimePaths();
  const dataDir = runtimeDataDir();
  const dbPath = path.join(dataDir, "dinox.db");

  ensureRuntimeDb(runtimePaths.templateDbPath, dbPath);

  // ── Detect version change and run migrations ───────────────────────────────
  const currentVersion = app.getVersion();
  const lastSeenVersion = getLastSeenVersion(dataDir);

  if (lastSeenVersion !== currentVersion) {
    logRuntime(`Version change detected: ${lastSeenVersion ?? "none"} → ${currentVersion}`);

    // Backup existing DB before migrating (safe to fail — don't abort startup)
    try {
      const backupName = createBackup(dbPath, "pre-update");
      logRuntime(`Pre-update backup: ${backupName}`);
    } catch (e) {
      logRuntime(`WARN: Pre-update backup failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Apply any pending Prisma migrations to the existing DB
    await runMigrationsOnStartup(dbPath);

    saveLastSeenVersion(dataDir, currentVersion);
  } else {
    logRuntime(`Version ${currentVersion} unchanged — skipping migration`);
  }

  process.env.DATABASE_URL = toPrismaFileUrl(dbPath);
  process.env.NODE_ENV = "production";
  process.env.HOSTNAME = PROD_HOST;
  process.env.PORT = String(PROD_PORT);

  logRuntime(`Runtime directory: ${dataDir}`);
  logRuntime(`Using DATABASE_URL=${process.env.DATABASE_URL}`);

  if (fs.existsSync(runtimePaths.requireHookPath)) {
    require(runtimePaths.requireHookPath);
    logRuntime(`Loaded Prisma require hook: ${runtimePaths.requireHookPath}`);
  }

  // Set Prisma query engine path explicitly so it can dlopen() from a real disk path
  const prismaEngine = findPrismaQueryEngine(runtimePaths.unpackedRoot);
  if (prismaEngine) {
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = prismaEngine;
    logRuntime(`Prisma engine set to: ${prismaEngine}`);
  } else {
    logRuntime("WARN: Prisma query engine not found in unpacked dir — engine may fail to load");
  }

  // Capture server-side errors to startup log for diagnostics
  const _origConsoleError = console.error;
  console.error = (...args) => {
    logRuntime("SERVER: " + args.map((a) => (a instanceof Error ? a.stack : String(a))).join(" "));
    _origConsoleError(...args);
  };

  if (!fs.existsSync(runtimePaths.standaloneServerPath)) {
    throw new Error(
      `Standalone server not found at ${runtimePaths.standaloneServerPath}. Rebuild with Next output=standalone.`
    );
  }

  require(runtimePaths.standaloneServerPath);
  productionServerBooted = true;
  logRuntime(`Loaded standalone server from ${runtimePaths.standaloneServerPath}`);

  const url = `http://${PROD_HOST}:${PROD_PORT}`;
  await waitForServer(url);

  return url;
}

async function resolveStartUrl() {
  if (isDev) {
    return process.env.DINOX_DEV_URL ?? "http://localhost:3000";
  }

  return startProductionServer();
}

function closeSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  splashWindow = null;
}

function createMainWindow(startUrl) {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const winW = Math.min(1440, Math.round(sw * 0.9));
  const winH = Math.min(900, Math.round(sh * 0.9));

  // Resolve icon path — works in both dev (project root) and packaged (asar)
  const iconPath = (() => {
    const candidates = [
      path.join(app.getAppPath(), "build", "icon.ico"),
      path.join(app.getAppPath(), "build", "icon.png"),
      path.join(__dirname, "..", "build", "icon.ico"),
      path.join(__dirname, "..", "build", "icon.png"),
    ];
    return candidates.find((p) => fs.existsSync(p)) ?? undefined;
  })();

  mainWindow = new BrowserWindow({
    width: winW,
    height: winH,
    minWidth: 760,
    minHeight: 500,
    backgroundColor: "#0f172a",
    autoHideMenuBar: true,
    show: false,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.once("did-finish-load", () => {
    closeSplashWindow();
  });

  mainWindow.once("ready-to-show", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  void mainWindow.loadURL(startUrl);
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 300,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    movable: true,
    alwaysOnTop: true,
    backgroundColor: "#0f172a",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const splashHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    width:480px;height:300px;overflow:hidden;
    background:#0f172a;
    font-family:"Segoe UI",system-ui,sans-serif;
    color:#f8fafc;
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    user-select:none;
    -webkit-app-region:drag;
  }

  /* ── background glow ── */
  .glow{
    position:fixed;top:-60px;left:50%;transform:translateX(-50%);
    width:340px;height:200px;
    background:radial-gradient(ellipse,rgba(20,184,166,.18) 0%,transparent 70%);
    pointer-events:none;
  }

  /* ── dino SVG ── */
  .dino-wrap{
    animation:breathe 3s ease-in-out infinite;
    filter:drop-shadow(0 0 18px rgba(20,184,166,.5));
  }
  @keyframes breathe{
    0%,100%{transform:translateY(0)}
    50%{transform:translateY(-6px)}
  }

  /* leg walk animation */
  #leg-l{ transform-origin:21px 48px; animation:legL 1.4s ease-in-out infinite; }
  #leg-r{ transform-origin:32px 48px; animation:legR 1.4s ease-in-out infinite; }
  @keyframes legL{ 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-12deg)} }
  @keyframes legR{ 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(12deg)} }

  /* tail swing */
  #tail{ transform-origin:14px 43px; animation:tailSwing 2s ease-in-out infinite; }
  @keyframes tailSwing{ 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(8deg)} }

  /* eye blink */
  #pupil{ animation:blink 4s step-end infinite; }
  @keyframes blink{ 0%,90%,100%{transform:scaleY(1)} 92%,98%{transform:scaleY(0.1)} }

  /* ── name ── */
  .name{
    margin-top:16px;
    font-size:26px;font-weight:700;letter-spacing:.5px;
    background:linear-gradient(135deg,#14b8a6,#7dd3fc);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  }
  .tagline{
    margin-top:4px;font-size:12px;color:#64748b;letter-spacing:.5px;
    text-transform:uppercase;
  }

  /* ── progress ── */
  .bar-wrap{
    margin-top:22px;
    width:220px;height:3px;
    background:rgba(255,255,255,.07);border-radius:99px;overflow:hidden;
  }
  .bar-fill{
    height:100%;border-radius:99px;
    background:linear-gradient(90deg,#0d9488,#14b8a6,#7dd3fc);
    background-size:200% 100%;
    animation:shimmer 1.6s linear infinite;
    width:100%;
  }
  @keyframes shimmer{
    0%{background-position:200% 0}
    100%{background-position:-200% 0}
  }

  /* ── status text ── */
  .status{
    margin-top:10px;font-size:11px;color:#475569;
    min-height:16px;
    animation:fadeStatus .4s ease;
  }
  @keyframes fadeStatus{from{opacity:0}to{opacity:1}}

  /* ── version ── */
  .version{
    position:fixed;bottom:12px;right:16px;
    font-size:10px;color:#1e293b;letter-spacing:.3px;
  }
</style>
</head>
<body>
<div class="glow"></div>

<!-- Dino SVG (same geometry as icon, scaled to 80px) -->
<div class="dino-wrap">
<svg width="80" height="80" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <!-- tail -->
  <g id="tail">
    <polygon points="14,40 14,46 5,52 4,50 10,44 10,40" fill="#14b8a6"/>
  </g>
  <!-- body -->
  <rect x="14" y="30" width="28" height="18" rx="4" fill="#14b8a6"/>
  <!-- neck + head -->
  <rect x="30" y="18" width="14" height="16" rx="3" fill="#14b8a6"/>
  <!-- snout -->
  <rect x="40" y="22" width="10" height="8" rx="2" fill="#14b8a6"/>
  <!-- arm -->
  <rect x="32" y="37" width="5" height="3" rx="1" fill="#0d9488"/>
  <rect x="34" y="40" width="4" height="2" rx="1" fill="#0d9488"/>
  <!-- legs -->
  <g id="leg-l"><rect x="17" y="46" width="8" height="12" rx="2" fill="#14b8a6"/>
    <rect x="15" y="56" width="4" height="3" rx="1" fill="#0d9488"/>
    <rect x="20" y="56" width="4" height="3" rx="1" fill="#0d9488"/>
  </g>
  <g id="leg-r"><rect x="28" y="46" width="8" height="12" rx="2" fill="#14b8a6"/>
    <rect x="26" y="56" width="4" height="3" rx="1" fill="#0d9488"/>
    <rect x="31" y="56" width="4" height="3" rx="1" fill="#0d9488"/>
  </g>
  <!-- spikes -->
  <polygon points="31,23 33,18 35,23" fill="#0d9488"/>
  <polygon points="34,20 36,15 38,20" fill="#0d9488"/>
  <polygon points="37,18 39,13 41,18" fill="#0d9488"/>
  <polygon points="40,20 42,15 44,20" fill="#0d9488"/>
  <polygon points="43,22 45,17 47,22" fill="#0d9488"/>
  <!-- eye white -->
  <circle cx="46" cy="23" r="2.5" fill="#fff"/>
  <!-- pupil -->
  <g id="pupil"><circle cx="47" cy="23" r="1.2" fill="#0f172a"/></g>
</svg>
</div>

<div class="name">Dinox</div>
<div class="tagline">Your local calendar</div>

<div class="bar-wrap"><div class="bar-fill"></div></div>
<div class="status" id="status">Starting…</div>

<div class="version">v0.1.0</div>

<script>
  const msgs = [
    "Starting…",
    "Loading database…",
    "Warming up server…",
    "Almost ready…"
  ];
  let i = 0;
  const el = document.getElementById("status");
  setInterval(() => {
    i = (i + 1) % msgs.length;
    el.style.animation = "none";
    el.offsetHeight; // reflow
    el.style.animation = "fadeStatus .4s ease";
    el.textContent = msgs[i];
  }, 1800);
</script>
</body>
</html>`;

  void splashWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(splashHtml)}`);
}

// ── Single-instance lock ───────────────────────────────────────────────────
// Prevent multiple Dinox windows from opening. If another instance is already
// running, focus its window and quit this one.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// ── Auto-update check ─────────────────────────────────────────────────────
// Checks GitHub releases for a newer version and prompts the user to update.
// Defaults to the project's GitHub releases feed; override with DINOX_UPDATE_URL.
const DEFAULT_UPDATE_URL = "https://github.com/JapanDino/Dinox/releases/latest/download/latest.yml";
const DEFAULT_RELEASE_URL = "https://github.com/JapanDino/Dinox/releases/latest";
const UPDATE_URL = process.env.DINOX_UPDATE_URL ?? DEFAULT_UPDATE_URL;
const RELEASE_PAGE_URL = process.env.DINOX_RELEASE_URL ?? DEFAULT_RELEASE_URL;

// Semantic-ish compare: returns 1 if a > b, -1 if a < b, 0 if equal.
function compareVersions(a, b) {
  const left = String(a).trim().replace(/^v/i, "").split(/[.-]/);
  const right = String(b).trim().replace(/^v/i, "").split(/[.-]/);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = left[index] ?? "0";
    const rightPart = right[index] ?? "0";
    const leftNumber = Number(leftPart);
    const rightNumber = Number(rightPart);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      if (leftNumber !== rightNumber) return leftNumber > rightNumber ? 1 : -1;
      continue;
    }
    const order = leftPart.localeCompare(rightPart, undefined, { numeric: true });
    if (order !== 0) return order > 0 ? 1 : -1;
  }
  return 0;
}

async function checkForUpdate() {
  if (!UPDATE_URL || isDev) return;
  try {
    const res = await fetch(UPDATE_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return;
    const text = await res.text();
    const match = text.match(/^version:\s*(.+)$/m);
    if (!match) return;
    const latestVersion = match[1].trim();
    const currentVersion = app.getVersion();
    // Only prompt when the published release is strictly newer than what's installed.
    if (compareVersions(latestVersion, currentVersion) > 0) {
      logRuntime(`Update available: ${currentVersion} → ${latestVersion}`);
      const { response } = await dialog.showMessageBox({
        type: "info",
        title: "Dinox Update Available",
        message: `A new version of Dinox is available (${latestVersion}).\nYou have ${currentVersion}.`,
        buttons: ["Download Update", "Later"],
        defaultId: 0,
      });
      if (response === 0) {
        void shell.openExternal(RELEASE_PAGE_URL);
      }
    }
  } catch {
    // Network unavailable or update check failed — continue silently
  }
}

// ── Pomodoro popup IPC ────────────────────────────────────────────────────────
let pomodoroWindow = null;

ipcMain.on("pomodoro:open", (_event, relativeUrl) => {
  // If already open, just focus it
  if (pomodoroWindow && !pomodoroWindow.isDestroyed()) {
    pomodoroWindow.focus();
    return;
  }

  // Build absolute URL from the running server
  const baseUrl = `http://${PROD_HOST}:${PROD_PORT}`;
  const fullUrl = `${baseUrl}${relativeUrl}`;

  pomodoroWindow = new BrowserWindow({
    width: 360,
    height: 500,
    minWidth: 320,
    minHeight: 440,
    maxWidth: 420,
    resizable: true,
    alwaysOnTop: true,
    frame: false,
    transparent: false,
    backgroundColor: "#0f172a",
    autoHideMenuBar: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  void pomodoroWindow.loadURL(fullUrl);

  pomodoroWindow.on("closed", () => {
    pomodoroWindow = null;
  });
});

// ── Backup IPC handlers ───────────────────────────────────────────────────────

ipcMain.handle("backup:list", () => {
  const dataDir = runtimeDataDir();
  return listBackups(dataDir);
});

ipcMain.handle("backup:create", () => {
  const dataDir = runtimeDataDir();
  const dbPath = path.join(dataDir, "dinox.db");
  const name = createBackup(dbPath, "manual");
  return { name };
});

ipcMain.handle("backup:restore", (_event, backupName) => {
  if (!/^dinox\.backup-.+\.db$/.test(String(backupName))) {
    throw new Error("Invalid backup filename");
  }
  const dataDir = runtimeDataDir();
  const dbPath = path.join(dataDir, "dinox.db");
  const backupPath = path.join(dataDir, String(backupName));
  if (!fs.existsSync(backupPath)) throw new Error("Backup file not found");
  // Save current state first so restore is always reversible
  createBackup(dbPath, "pre-restore");
  fs.copyFileSync(backupPath, dbPath);
  logRuntime(`Restored from backup: ${backupName}`);
  return { ok: true };
});

ipcMain.handle("backup:delete", (_event, backupName) => {
  if (!/^dinox\.backup-.+\.db$/.test(String(backupName))) {
    throw new Error("Invalid backup filename");
  }
  const dataDir = runtimeDataDir();
  const filePath = path.join(dataDir, String(backupName));
  if (!fs.existsSync(filePath)) throw new Error("Backup file not found");
  fs.rmSync(filePath, { force: true });
  logRuntime(`Deleted backup: ${backupName}`);
  return { ok: true };
});

ipcMain.handle("backup:open-dir", async () => {
  const dataDir = runtimeDataDir();
  await shell.openPath(dataDir);
  return { ok: true };
});

app.whenReady().then(async () => {
  createSplashWindow();

  try {
    const startUrl = await resolveStartUrl();
    logRuntime(`Resolved start URL ${startUrl}`);
    createMainWindow(startUrl);

    app.on("activate", async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        const resolvedUrl = await resolveStartUrl();
        createMainWindow(resolvedUrl);
      }
    });

    // Check for updates in the background after the app is ready
    void checkForUpdate();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown startup error.";
    console.error(message);
    logRuntime(`Startup failed: ${message}`);

    closeSplashWindow();
    dialog.showErrorBox("Dinox startup failed", message);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
