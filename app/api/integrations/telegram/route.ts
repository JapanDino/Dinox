import { NextRequest } from "next/server";
import { spawn, type ChildProcess } from "child_process";
import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { jsonResponse, handleRouteError } from "../../_lib/http";

// ── Singleton bot process ─────────────────────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __dinoxBot: ChildProcess | null;
  // eslint-disable-next-line no-var
  var __dinoxBotLogs: string[];
}
global.__dinoxBot ??= null;
global.__dinoxBotLogs ??= [];

const MAX_LOG_LINES = 40;

function appendLog(line: string) {
  global.__dinoxBotLogs.push(line);
  if (global.__dinoxBotLogs.length > MAX_LOG_LINES) {
    global.__dinoxBotLogs = global.__dinoxBotLogs.slice(-MAX_LOG_LINES);
  }
}

// ── Config file ───────────────────────────────────────────────────────────────
const RUNTIME_DIR = resolve(process.cwd(), ".dinox-runtime");
const CONFIG_FILE = resolve(RUNTIME_DIR, "telegram-config.json");

interface TelegramConfig {
  botToken: string;
}

function saveConfig(cfg: TelegramConfig) {
  mkdirSync(RUNTIME_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf8");
}

function loadConfig(): TelegramConfig | null {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as TelegramConfig;
  } catch {
    return null;
  }
}

// ── Start / stop ─────────────────────────────────────────────────────────────
function startBot(cfg: TelegramConfig): void {
  if (global.__dinoxBot) return; // already running

  global.__dinoxBotLogs = [];
  appendLog(`[${ts()}] Starting bot...`);

  const script = resolve(process.cwd(), "scripts/telegram-agent.mjs");
  const env = {
    ...process.env,
    TELEGRAM_BOT_TOKEN: cfg.botToken,
    DINOX_API_URL: "http://localhost:3000",
  };

  const child = spawn(process.execPath, [script], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  child.stdout?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString().split("\n")) {
      if (line.trim()) appendLog(line.trim());
    }
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString().split("\n")) {
      if (line.trim()) appendLog(`ERR: ${line.trim()}`);
    }
  });
  child.on("exit", (code) => {
    appendLog(`[${ts()}] Bot stopped (exit ${code ?? "?"}).`);
    global.__dinoxBot = null;
  });

  global.__dinoxBot = child;
}

function stopBot(): void {
  const bot = global.__dinoxBot;
  if (!bot) return;
  appendLog(`[${ts()}] Stopping bot...`);
  bot.kill("SIGTERM");
  global.__dinoxBot = null;
}

function ts() {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Route handlers ────────────────────────────────────────────────────────────
export async function GET(): Promise<Response> {
  try {
    const cfg = loadConfig();
    const running = !!global.__dinoxBot;
    return jsonResponse({
      running,
      pid: global.__dinoxBot?.pid ?? null,
      logs: global.__dinoxBotLogs,
      hasBotToken: !!(cfg?.botToken),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json() as {
      action: "start" | "stop" | "save";
      botToken?: string;
    };

    if (body.action === "save" || body.action === "start") {
      const existing = loadConfig() ?? { botToken: "" };
      const cfg: TelegramConfig = {
        botToken: body.botToken ?? existing.botToken,
      };
      if (!cfg.botToken) {
        return jsonResponse({ error: { message: "Bot token is required." } }, 400);
      }
      saveConfig(cfg);

      if (body.action === "start") {
        if (global.__dinoxBot) stopBot();
        startBot(cfg);
      }

      return jsonResponse({ ok: true, running: !!global.__dinoxBot });
    }

    if (body.action === "stop") {
      stopBot();
      return jsonResponse({ ok: true, running: false });
    }

    return jsonResponse({ error: { message: "Unknown action." } }, 400);
  } catch (error) {
    return handleRouteError(error);
  }
}
