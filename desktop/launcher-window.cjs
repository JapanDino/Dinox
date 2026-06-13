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
    background:
      linear-gradient(90deg, transparent 0 48%, rgba(24,199,177,.16) 48% 52%, transparent 52%),
      rgba(4, 9, 12, .32);
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
          <svg width="88" height="88" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <polygon points="14,40 14,46 5,52 4,50 10,44 10,40" fill="#18c7b1"/>
            <rect x="14" y="30" width="28" height="18" rx="4" fill="#18c7b1"/>
            <rect x="30" y="18" width="14" height="16" rx="3" fill="#18c7b1"/>
            <rect x="40" y="22" width="10" height="8" rx="2" fill="#18c7b1"/>
            <rect x="32" y="37" width="5" height="3" rx="1" fill="#0b8f82"/>
            <rect x="17" y="46" width="8" height="12" rx="2" fill="#18c7b1"/>
            <rect x="28" y="46" width="8" height="12" rx="2" fill="#18c7b1"/>
            <polygon points="31,23 33,18 35,23" fill="#c4e85b"/>
            <polygon points="36,18 38,13 40,18" fill="#c4e85b"/>
            <polygon points="42,22 44,17 46,22" fill="#c4e85b"/>
            <circle cx="46" cy="23" r="2.5" fill="#fff"/>
            <circle cx="47" cy="23" r="1.2" fill="#081015"/>
          </svg>
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
  latestState = { ...(latestState || defaultState("0.1.0")), ...partial };
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
