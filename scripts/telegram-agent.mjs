#!/usr/bin/env node
/**
 * Dinox Telegram Agent — бесплатная версия
 * Парсит даты через chrono-node (локально, без API).
 *
 * Требуется только: TELEGRAM_BOT_TOKEN
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import * as chrono from "chrono-node";

// ── Load .env.local ──────────────────────────────────────────────────────────
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const lines = readFileSync(resolve(process.cwd(), file), "utf8").split("\n");
      for (const line of lines) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"#\n]*)"?\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
      }
    } catch { /* ok */ }
  }
}
loadEnv();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DINOX_URL = (process.env.DINOX_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

if (!BOT_TOKEN) { console.error("❌  TELEGRAM_BOT_TOKEN not set"); process.exit(1); }

const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ── Telegram helpers ─────────────────────────────────────────────────────────
async function tgCall(method, body = {}) {
  const res = await fetch(`${TG}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sendMsg(chatId, text, extra = {}) {
  return tgCall("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });
}

// ── Local NLP parser ─────────────────────────────────────────────────────────

// Task keywords (Russian + English)
const TASK_RE = /\b(задач[аи]?|задание|todo|to-do|сделать|сделай|напомни|напоминание|дедлайн|deadline|таск|task|reminder|выполнить|не забыть)\b/i;

// Duration patterns  (русский + english)
const DURATION_PATTERNS = [
  [/на\s+(\d+(?:[.,]\d+)?)\s*час(а|ов)?/i,       (m) => parseFloat(m[1].replace(",", ".")) * 60],
  [/на\s+полчаса/i,                                () => 30],
  [/на\s+(\d+)\s*мин(ут[уы]?)?/i,                 (m) => parseInt(m[1])],
  [/(\d+(?:[.,]\d+)?)\s*h(our[s]?)?/i,            (m) => parseFloat(m[1].replace(",", ".")) * 60],
  [/(\d+)\s*min(ute[s]?)?/i,                       (m) => parseInt(m[1])],
  [/for\s+(\d+(?:[.,]\d+)?)\s*h(our[s]?)?/i,      (m) => parseFloat(m[1].replace(",", ".")) * 60],
  [/for\s+(\d+)\s*min(ute[s]?)?/i,                (m) => parseInt(m[1])],
  [/[–-]\s*до\s+(\d{1,2})[:.:](\d{2})/,           null], // "до 15:00" handled separately
];

function extractDurationMinutes(text) {
  for (const [re, fn] of DURATION_PATTERNS) {
    if (fn === null) continue;
    const m = text.match(re);
    if (m) return Math.round(fn(m));
  }
  // "до HH:MM" — compute from parsed start time below
  return null;
}

function extractEndByUntil(text, startDate) {
  const m = text.match(/до\s+(\d{1,2})[:.:](\d{2})/i);
  if (!m || !startDate) return null;
  const end = new Date(startDate);
  end.setHours(parseInt(m[1]), parseInt(m[2]), 0, 0);
  if (end <= startDate) end.setDate(end.getDate() + 1);
  return end;
}

// Strips command-like prefixes and common noise words
function cleanTitle(text) {
  return text
    .replace(/^(задач[аи]?:?\s*|задание:?\s*|напомни\s+(мне\s+)?|сделай\s+|todo:?\s*|task:?\s*)/i, "")
    .replace(/\b(завтра|сегодня|послезавтра|вчера|в\s+\d+:\d+|в\s+\d+\s+(утра|вечера|дня)|через\s+\d+\s+час[аов]*|на\s+час|на\s+\d+\s+мин[утых]*|на\s+полчаса|до\s+\d+:\d+)\b/gi, "")
    .replace(/\b(завтра|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+\w+|in\s+\d+\s+\w+|at\s+\d+[:.]\d*\s*(am|pm)?|for\s+\d+\s+\w+)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[,.:;-]+$/, "")
    .trim();
}

function parseMessage(text) {
  const now = new Date();

  // chrono-node: try Russian first, then casual
  let parsed = chrono.ru.parse(text, now, { forwardDate: true })[0]
    ?? chrono.parse(text, now, { forwardDate: true })[0];

  const isTask = TASK_RE.test(text);

  if (!parsed) {
    // No date found — create as all-day task today
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end   = new Date(now); end.setHours(23, 59, 59, 0);
    return {
      title: cleanTitle(text) || text,
      startAt: start.toISOString(),
      endAt:   end.toISOString(),
      allDay:  true,
      kind:    "TASK",
    };
  }

  const startDate = parsed.date();

  // If chrono gave us just a date with no time → all-day
  const hasExplicitTime = parsed.start.isCertain("hour");

  if (!hasExplicitTime) {
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end   = new Date(startDate); end.setHours(23, 59, 59, 0);
    return {
      title:   cleanTitle(text) || text,
      startAt: start.toISOString(),
      endAt:   end.toISOString(),
      allDay:  true,
      kind:    isTask ? "TASK" : "EVENT",
    };
  }

  // Has explicit time → timed event
  let endDate = null;

  // Check if chrono gave us an end time (range: "from X to Y")
  if (parsed.end) {
    endDate = parsed.end.date();
  }

  // Try "до HH:MM"
  if (!endDate) endDate = extractEndByUntil(text, startDate);

  // Try duration keywords
  if (!endDate) {
    const mins = extractDurationMinutes(text);
    if (mins) {
      endDate = new Date(startDate.getTime() + mins * 60_000);
    }
  }

  // Default: 1 hour for events, 30 min for tasks
  if (!endDate) {
    endDate = new Date(startDate.getTime() + (isTask ? 30 : 60) * 60_000);
  }

  return {
    title:   cleanTitle(text) || text,
    startAt: startDate.toISOString(),
    endAt:   endDate.toISOString(),
    allDay:  false,
    kind:    isTask ? "TASK" : "EVENT",
  };
}

// ── Dinox API ────────────────────────────────────────────────────────────────
async function createDinoxItem(item) {
  const res = await fetch(`${DINOX_URL}/api/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Dinox API error: ${res.status}`);
  }
  return (await res.json()).data;
}

async function listTodayItems() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);
  const url = `${DINOX_URL}/api/items?rangeStart=${start.toISOString()}&rangeEnd=${end.toISOString()}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return (await res.json()).data ?? [];
}

// ── Formatters ───────────────────────────────────────────────────────────────
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow",
  });
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    weekday: "short", day: "numeric", month: "long", timeZone: "Europe/Moscow",
  });
}

function itemLine(item) {
  const icon = item.kind === "TASK" ? (item.status === "DONE" ? "✅" : "☐") : "📅";
  const time = item.allDay ? "весь день" : fmtTime(item.startAt);
  return `${icon} <b>${escHtml(item.title)}</b> — ${time}`;
}

function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ── Help ─────────────────────────────────────────────────────────────────────
const HELP_TEXT = `<b>Dinox Calendar Bot 🗓</b>

Просто напиши что нужно добавить:

<i>Встреча с командой завтра в 14:00 на час</i>
<i>Задача: сделать PR до пятницы</i>
<i>Звонок с клиентом послезавтра в 11:30 на 30 мин</i>
<i>Meeting with Alex on Monday at 3pm for 1 hour</i>
<i>Напомни купить продукты сегодня</i>

Команды:
/today — события на сегодня
/help  — эта справка

<i>Работает без внешних API, парсинг локальный.</i>`;

// ── Message handler ──────────────────────────────────────────────────────────
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text   = (msg.text ?? "").trim();
  if (!text) return;

  console.log(`[${new Date().toLocaleTimeString()}] chat=${chatId} → "${text}"`);

  if (text === "/start" || text === "/help") {
    await sendMsg(chatId, HELP_TEXT);
    return;
  }

  if (text === "/today" || text === "/list") {
    const items = await listTodayItems();
    if (!items.length) {
      await sendMsg(chatId, `📭 Сегодня пусто.`);
    } else {
      const lines = items.map(itemLine).join("\n");
      await sendMsg(chatId, `<b>Сегодня, ${fmtDate(new Date().toISOString())}:</b>\n${lines}`);
    }
    return;
  }

  // Parse & create
  let item;
  try {
    item = parseMessage(text);
  } catch (err) {
    await sendMsg(chatId, `⚠️ Не удалось разобрать запрос: ${err.message}`);
    return;
  }

  try {
    const created = await createDinoxItem(item);
    const icon    = created.kind === "TASK" ? "✅" : "📅";
    const dateStr = created.allDay
      ? fmtDate(created.startAt)
      : `${fmtDate(created.startAt)}, ${fmtTime(created.startAt)}–${fmtTime(created.endAt)}`;

    await sendMsg(chatId,
      `${icon} <b>${escHtml(created.title)}</b>\n📆 ${dateStr}\n\n<i>Добавлено в Dinox!</i>`
    );
    console.log(`  ✓ Created: "${created.title}" [${created.kind}]`);
  } catch (err) {
    console.error("  ✗ Dinox error:", err.message);
    await sendMsg(chatId, `⚠️ Не удалось добавить в Dinox: ${err.message}`);
  }
}

// ── Long-polling loop ────────────────────────────────────────────────────────
async function poll() {
  let offset = 0;
  console.log(`🤖 Dinox Telegram Agent (free mode) started`);
  console.log(`   Dinox API: ${DINOX_URL}`);
  console.log(`   Date parsing: chrono-node (local, no API key needed)\n`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(
        `${TG}/getUpdates?offset=${offset}&timeout=30&allowed_updates=["message"]`,
        { signal: AbortSignal.timeout(35_000) }
      );
      const data = await res.json();
      if (!data.ok) { console.error("TG error:", data.description); await sleep(5000); continue; }

      for (const upd of data.result ?? []) {
        offset = upd.update_id + 1;
        if (upd.message) handleMessage(upd.message).catch((e) => console.error(e));
      }
    } catch (err) {
      if (err.name !== "TimeoutError") { console.error("Poll error:", err.message); await sleep(3000); }
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
poll();
