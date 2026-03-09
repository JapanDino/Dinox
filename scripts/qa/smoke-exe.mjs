import { spawn } from "node:child_process";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const BASE_URL = process.env.DINOX_SMOKE_BASE_URL ?? "http://127.0.0.1:3131";
const START_TIMEOUT_MS = Number(process.env.DINOX_EXE_START_TIMEOUT_MS ?? 180000);
const EXE_PATH = process.env.DINOX_EXE_PATH ?? path.resolve("release/win-unpacked/Dinox.exe");

function log(message) {
  process.stdout.write(`[qa:smoke:exe] ${message}\n`);
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 || code === 128) {
        resolve();
        return;
      }

      reject(new Error(stderr || `${command} ${args.join(" ")} failed with ${code}`));
    });
  });
}

async function killProcessTree(pid) {
  if (!pid) {
    return;
  }

  await runCommand("taskkill", ["/PID", String(pid), "/T", "/F"]).catch(() => undefined);
}

async function killDinoxProcesses() {
  await runCommand("taskkill", ["/IM", "Dinox.exe", "/T", "/F"]).catch(() => undefined);
}

function startDinox() {
  return spawn(EXE_PATH, [], {
    stdio: ["ignore", "ignore", "ignore"],
    windowsHide: true,
  });
}

async function waitForServer(timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/api/projects`);
      if (response.ok) {
        return;
      }
    } catch {
      // keep polling
    }

    await delay(750);
  }

  throw new Error(`Timed out waiting for packaged server at ${BASE_URL}`);
}

async function requestJson(method, endpoint, body, expectedStatuses = [200]) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `${method} ${endpoint} failed with ${response.status}. Body: ${JSON.stringify(parsed)}`
    );
  }

  return parsed;
}

async function requestDelete(endpoint, expectedStatuses = [200]) {
  const response = await fetch(`${BASE_URL}${endpoint}`, { method: "DELETE" });
  const text = await response.text();

  let parsed;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `DELETE ${endpoint} failed with ${response.status}. Body: ${JSON.stringify(parsed)}`
    );
  }

  return parsed;
}

async function runSmoke() {
  const suffix = Date.now();
  const startAt = new Date(Date.now() + 10 * 60 * 1000);
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

  /** @type {{ projectId?: string; tagId?: string; itemId?: string; itemTitle?: string }} */
  const cleanup = {};

  log(`Using executable: ${EXE_PATH}`);

  await killDinoxProcesses();

  let appProcess = null;

  try {
    appProcess = startDinox();
    await waitForServer(START_TIMEOUT_MS);
    log("Packaged server is ready (run #1)");

    const projectResponse = await requestJson(
      "POST",
      "/api/projects",
      { name: `SMOKE EXE Project ${suffix}`, color: "#0ea5e9" },
      [201]
    );
    cleanup.projectId = projectResponse?.data?.id;

    const tagResponse = await requestJson(
      "POST",
      "/api/tags",
      { name: `smoke-exe-${suffix}`, color: "#a855f7" },
      [201]
    );
    cleanup.tagId = tagResponse?.data?.id;

    cleanup.itemTitle = `SMOKE EXE Item ${suffix}`;
    const itemResponse = await requestJson(
      "POST",
      "/api/items",
      {
        title: cleanup.itemTitle,
        description: "Packaged runtime persistence check",
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        allDay: false,
        status: "TODO",
        projectId: cleanup.projectId ?? null,
        tagIds: cleanup.tagId ? [cleanup.tagId] : [],
      },
      [201]
    );
    cleanup.itemId = itemResponse?.data?.id;

    if (!cleanup.itemId) {
      throw new Error("Failed to create smoke item in packaged runtime.");
    }

    log(`Created item ${cleanup.itemId}; restarting executable`);

    await killProcessTree(appProcess.pid);
    appProcess = null;
    await delay(1500);

    appProcess = startDinox();
    await waitForServer(START_TIMEOUT_MS);
    log("Packaged server is ready (run #2)");

    const persisted = await requestJson("GET", `/api/items/${cleanup.itemId}`, undefined, [200]);
    if (persisted?.data?.title !== cleanup.itemTitle) {
      throw new Error(`Persistence check failed. Expected title '${cleanup.itemTitle}'.`);
    }

    log("Persistence across restart verified");

    await requestDelete(`/api/items/${cleanup.itemId}`, [200, 404]);
    await requestDelete(`/api/tags/${cleanup.tagId}`, [200, 404]);
    await requestDelete(`/api/projects/${cleanup.projectId}`, [200, 404]);

    log("Cleanup completed");
  } finally {
    if (appProcess) {
      await killProcessTree(appProcess.pid);
    }
    await killDinoxProcesses();
  }
}

try {
  await runSmoke();
  log("Packaged EXE smoke completed successfully");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  log(`FAILED: ${message}`);
  process.exitCode = 1;
}