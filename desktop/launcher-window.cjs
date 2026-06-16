const LOGO_DATA_URI = "data:image/png;base64,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";
let launcherWindow = null;
let latestState = null;
let currentShell = null;
let updateUrl = null;
let updateResolver = null;
let ipcRegistered = false;
let lastOptions = null;

const defaultSteps = [
  { label: "Check install", state: "active" },
  { label: "Prepare database", state: "idle" },
  { label: "Start calendar", state: "idle" },
];

function defaultState(version) {
  return {
    mode: "boot",
    eyebrow: "Dinox Launcher",
    title: "Preparing your calendar",
    message: "Checking local files and starting the desktop workspace.",
    detail: "Starting...",
    progress: 18,
    currentVersion: version,
    latestVersion: null,
    primaryLabel: null,
    secondaryLabel: null,
    steps: defaultSteps,
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderLauncherHtml(version) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-inline';" />
<style>
  :root {
    --bg: #0a0d12;
    --panel: rgba(18, 24, 33, .86);
    --panel-strong: #151d28;
    --line: rgba(148, 163, 184, .18);
    --text: #eef6f4;
    --muted: #8ea09d;
    --quiet: #53615f;
    --teal: #18c7b1;
    --lime: #c4e85b;
    --amber: #f4b942;
    --coral: #ff7a66;
    --ink: #05070a;
  }

  * { box-sizing: border-box; }
  html, body { width: 100%; height: 100%; }
  body {
    margin: 0;
    overflow: hidden;
    color: var(--text);
    font-family: "Segoe UI Variable Display", "Aptos", "Segoe UI", sans-serif;
    background:
      linear-gradient(135deg, rgba(24, 199, 177, .12), transparent 34%),
      linear-gradient(315deg, rgba(244, 185, 66, .10), transparent 38%),
      var(--bg);
    user-select: none;
    -webkit-app-region: drag;
  }

  body::before {
    content: "";
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
    background-size: 34px 34px;
    opacity: .72;
    pointer-events: none;
  }

  .shell {
    position: relative;
    width: 640px;
    height: 420px;
    padding: 22px;
  }

  .chrome {
    position: absolute;
    inset: 12px;
    border: 1px solid var(--line);
    background: var(--panel-strong);
    box-shadow: 0 28px 90px rgba(0, 0, 0, .46);
    overflow: hidden;
  }

  .chrome::after {
    content: "";
    position: absolute;
    inset: 0;
    border-top: 1px solid rgba(255, 255, 255, .18);
    pointer-events: none;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 46px;
    padding: 0 16px;
    border-bottom: 1px solid var(--line);
    color: var(--muted);
    font-size: 11px;
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .mark {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border: 1px solid rgba(24, 199, 177, .45);
    background: rgba(24, 199, 177, .12);
    color: var(--teal);
    font-weight: 800;
  }

  .version {
    color: var(--quiet);
    font-family: "Cascadia Code", Consolas, monospace;
  }

  .content {
    display: grid;
    grid-template-columns: 1.08fr .92fr;
    gap: 18px;
    padding: 22px;
  }

  .hero {
    min-width: 0;
  }

  .eyebrow {
    margin: 0 0 12px;
    color: var(--lime);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .12em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    max-width: 320px;
    color: var(--text);
    font-size: 34px;
    line-height: 1.02;
    font-weight: 760;
    letter-spacing: 0;
  }

  .message {
    margin: 14px 0 0;
    max-width: 300px;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.55;
  }

  .meter {
    margin-top: 26px;
    width: 100%;
  }

  .meter-row {
    display: flex;
    justify-content: space-between;
    color: var(--quiet);
    font-family: "Cascadia Code", Consolas, monospace;
    font-size: 11px;
  }

  .track {
    position: relative;
    height: 10px;
    margin-top: 10px;
    border: 1px solid rgba(255,255,255,.08);
    background: rgba(255,255,255,.045);
    overflow: hidden;
  }

  .fill {
    width: 18%;
    height: 100%;
    background: linear-gradient(90deg, var(--teal), var(--lime));
    transition: width .42s cubic-bezier(.2, .8, .2, 1);
  }

  .detail {
    margin-top: 11px;
    color: var(--muted);
    font-size: 12px;
  }

  .panel {
    min-height: 260px;
    border: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.018));
    padding: 16px;
  }

  .dino {
    display: grid;
    place-items: center;
    height: 92px;
    margin-bottom: 12px;
    border: 1px solid rgba(24, 199, 177, .24);
    background: rgba(4, 9, 12, .32);
  }

  .dino svg {
    filter: drop-shadow(0 10px 24px rgba(24, 199, 177, .26));
  }

  .steps {
    display: grid;
    gap: 8px;
  }

  .step {
    display: grid;
    grid-template-columns: 18px 1fr auto;
    align-items: center;
    gap: 9px;
    min-height: 28px;
    color: var(--muted);
    font-size: 12px;
  }

  .dot {
    width: 10px;
    height: 10px;
    border: 1px solid var(--quiet);
    background: transparent;
  }

  .step[data-state="active"] .dot {
    border-color: var(--teal);
    background: var(--teal);
    box-shadow: 0 0 0 4px rgba(24, 199, 177, .12);
  }

  .step[data-state="done"] .dot {
    border-color: var(--lime);
    background: var(--lime);
  }

  .step[data-state="warn"] .dot {
    border-color: var(--amber);
    background: var(--amber);
  }

  .step-code {
    color: var(--quiet);
    font-family: "Cascadia Code", Consolas, monospace;
    font-size: 10px;
  }

  .actions {
    display: none;
    gap: 10px;
    margin-top: 16px;
    -webkit-app-region: no-drag;
  }

  .actions.is-visible { display: flex; }

  button {
    height: 36px;
    border: 1px solid rgba(255,255,255,.13);
    padding: 0 14px;
    color: var(--text);
    background: rgba(255,255,255,.06);
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  button.primary {
    border-color: rgba(196, 232, 91, .58);
    background: var(--lime);
    color: var(--ink);
  }

  button:hover {
    filter: brightness(1.08);
  }

  .close {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    color: var(--quiet);
    background: transparent;
    font-size: 18px;
    -webkit-app-region: no-drag;
  }

  .close:hover {
    color: var(--text);
    background: rgba(255,255,255,.06);
  }

  .update-tag {
    display: none;
    margin-top: 14px;
    width: max-content;
    border: 1px solid rgba(255, 122, 102, .34);
    background: rgba(255, 122, 102, .09);
    color: #ffd3cc;
    padding: 6px 9px;
    font-family: "Cascadia Code", Consolas, monospace;
    font-size: 11px;
  }

  .update-tag.is-visible { display: block; }
</style>
</head>
<body>
<main class="shell">
  <section class="chrome">
    <header class="topbar">
      <div class="brand"><span class="mark">D</span><span id="eyebrow">Dinox Launcher</span></div>
      <div><span class="version" id="version">v${escapeHtml(version)}</span><button class="close" id="close" aria-label="Close">x</button></div>
    </header>
    <section class="content">
      <div class="hero">
        <p class="eyebrow" id="mode">Desktop setup</p>
        <h1 id="title">Preparing your calendar</h1>
        <p class="message" id="message">Checking local files and starting the desktop workspace.</p>
        <div class="update-tag" id="updateTag"></div>
        <div class="meter">
          <div class="meter-row"><span id="detailCode">BOOT</span><span id="percent">18%</span></div>
          <div class="track"><div class="fill" id="fill"></div></div>
          <div class="detail" id="detail">Starting...</div>
        </div>
        <div class="actions" id="actions">
          <button class="primary" id="primary">Update now</button>
          <button id="secondary">Later</button>
        </div>
      </div>
      <aside class="panel">
        <div class="dino" aria-hidden="true">
          <img src="${LOGO_DATA_URI}" width="88" height="88" alt="Dinox" style="display:block" />
        </div>
        <div class="steps" id="steps"></div>
      </aside>
    </section>
  </section>
</main>
<script>
  const state = ${JSON.stringify(defaultState(version))};

  function applyState(next) {
    Object.assign(state, next || {});
    const progress = Math.max(0, Math.min(100, Number(state.progress || 0)));
    document.getElementById("eyebrow").textContent = state.eyebrow || "Dinox Launcher";
    document.getElementById("mode").textContent = state.mode === "update" ? "Update available" : "Desktop setup";
    document.getElementById("title").textContent = state.title || "";
    document.getElementById("message").textContent = state.message || "";
    document.getElementById("detail").textContent = state.detail || "";
    document.getElementById("detailCode").textContent = state.mode === "update" ? "UPDATE" : "BOOT";
    document.getElementById("percent").textContent = progress + "%";
    document.getElementById("fill").style.width = progress + "%";
    document.getElementById("version").textContent = "v" + (state.currentVersion || "${escapeHtml(version)}");

    const updateTag = document.getElementById("updateTag");
    if (state.latestVersion) {
      updateTag.textContent = "Current " + state.currentVersion + " -> Latest " + state.latestVersion;
      updateTag.classList.add("is-visible");
    } else {
      updateTag.classList.remove("is-visible");
    }

    const steps = document.getElementById("steps");
    steps.innerHTML = "";
    (state.steps || []).forEach((step, index) => {
      const row = document.createElement("div");
      row.className = "step";
      row.dataset.state = step.state || "idle";
      row.innerHTML = "<span class='dot'></span><span></span><span class='step-code'></span>";
      row.children[1].textContent = step.label || "";
      row.children[2].textContent = String(index + 1).padStart(2, "0");
      steps.appendChild(row);
    });

    const actions = document.getElementById("actions");
    if (state.primaryLabel || state.secondaryLabel) {
      actions.classList.add("is-visible");
      document.getElementById("primary").textContent = state.primaryLabel || "Open";
      document.getElementById("secondary").textContent = state.secondaryLabel || "Later";
    } else {
      actions.classList.remove("is-visible");
    }
  }

  document.getElementById("primary").addEventListener("click", () => window.dinoxLauncher.action("primary"));
  document.getElementById("secondary").addEventListener("click", () => window.dinoxLauncher.action("secondary"));
  document.getElementById("close").addEventListener("click", () => window.dinoxLauncher.action("close"));

  window.dinoxLauncher.onState(applyState);
  applyState(state);
  window.dinoxLauncher.ready();
</script>
</body>
</html>`;
}

function registerIpc(ipcMain, shell) {
  currentShell = shell;

  if (ipcRegistered) return;
  ipcRegistered = true;

  ipcMain.on("launcher:ready", (event) => {
    event.sender.send("launcher:state", latestState);
  });

  ipcMain.on("launcher:action", (_event, action) => {
    if (action === "primary") {
      if (updateUrl && currentShell) {
        void currentShell.openExternal(updateUrl);
      }
      if (updateResolver) {
        updateResolver("primary");
        updateResolver = null;
      }
      setLauncherState({
        detail: "Opening release download...",
        progress: 100,
        primaryLabel: null,
        secondaryLabel: null,
      });
      setTimeout(() => closeLauncherWindow(), 850);
      return;
    }

    if (updateResolver) {
      updateResolver(action === "secondary" ? "secondary" : "close");
      updateResolver = null;
    }

    closeLauncherWindow();
  });
}

function createLauncherWindow(options) {
  lastOptions = options;
  registerIpc(options.ipcMain, options.shell);

  if (!latestState) {
    latestState = defaultState(options.version);
  }

  if (launcherWindow && !launcherWindow.isDestroyed()) {
    launcherWindow.show();
    return launcherWindow;
  }

  launcherWindow = new options.BrowserWindow({
    width: 640,
    height: 420,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    movable: true,
    alwaysOnTop: true,
    backgroundColor: "#0a0d12",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: options.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  launcherWindow.once("ready-to-show", () => {
    if (launcherWindow && !launcherWindow.isDestroyed()) {
      launcherWindow.show();
    }
  });

  launcherWindow.on("closed", () => {
    launcherWindow = null;
  });

  void launcherWindow.loadURL(
    `data:text/html;charset=UTF-8,${encodeURIComponent(renderLauncherHtml(options.version))}`
  );

  return launcherWindow;
}

function setLauncherState(partial) {
  latestState = { ...(latestState || defaultState(lastOptions?.version || "0.1.4")), ...partial };
  if (launcherWindow && !launcherWindow.isDestroyed()) {
    launcherWindow.webContents.send("launcher:state", latestState);
  }
}

function closeLauncherWindow() {
  if (launcherWindow && !launcherWindow.isDestroyed()) {
    launcherWindow.close();
  }
  launcherWindow = null;
}

function showLauncherUpdate(info) {
  if (lastOptions) {
    createLauncherWindow(lastOptions);
  }

  updateUrl = info.releaseUrl;

  setLauncherState({
    mode: "update",
    eyebrow: "Dinox Launcher",
    title: "A newer Dinox is ready",
    message: "Install the latest build to get fixes, smoother startup, and the newest desktop improvements.",
    detail: "Release package found.",
    progress: 100,
    currentVersion: info.currentVersion,
    latestVersion: info.latestVersion,
    primaryLabel: "Update now",
    secondaryLabel: "Later",
    steps: [
      { label: "Current build scanned", state: "done" },
      { label: "Release metadata loaded", state: "done" },
      { label: "Installer ready to open", state: "active" },
    ],
  });

  return new Promise((resolve) => {
    updateResolver = resolve;
  });
}

module.exports = {
  closeLauncherWindow,
  createLauncherWindow,
  setLauncherState,
  showLauncherUpdate,
};
