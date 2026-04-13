"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = "work" | "short" | "long";

interface Settings {
  workMin: number;
  shortMin: number;
  longMin: number;
  rounds: number;
}

interface Task {
  id: string;
  title: string;
  trackedSeconds: number;
  kind: string;
  status: string;
}

const DEFAULT_SETTINGS: Settings = { workMin: 25, shortMin: 5, longMin: 15, rounds: 4 };
const SETTINGS_KEY = "dinox-pomodoro-settings";

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as Settings;
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

function saveSettings(s: Settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

function phaseDuration(p: Phase, s: Settings) {
  return (p === "work" ? s.workMin : p === "short" ? s.shortMin : s.longMin) * 60;
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function fmtTracked(s: number) {
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

async function addTracked(taskId: string, addSec: number) {
  const res = await fetch(`/api/items/${taskId}`, { cache: "no-store" });
  const json = await res.json() as { data: { trackedSeconds: number } };
  const next = (json.data?.trackedSeconds ?? 0) + addSec;
  await fetch(`/api/items/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackedSeconds: next }),
  });
  return next;
}

// ── SVG Ring ─────────────────────────────────────────────────────────────────

function Ring({ progress, phase, size = 160 }: { progress: number; phase: Phase; size?: number }) {
  const r = (size - 16) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const gradId = `grad-${phase}`;

  const colors: Record<Phase, [string, string]> = {
    work:  ["#f43f5e", "#ef4444"],
    short: ["#10b981", "#34d399"],
    long:  ["#3b82f6", "#60a5fa"],
  };
  const [c1, c2] = colors[phase];

  return (
    <svg width={size} height={size} className="-rotate-90" style={{ filter: "drop-shadow(0 0 12px " + c1 + "55)" }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
      {/* Progress */}
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - progress)}
        style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1)" }}
      />
    </svg>
  );
}

// ── Round Dots ───────────────────────────────────────────────────────────────

function RoundDots({ total, current, phase }: { total: number; current: number; phase: Phase }) {
  const active = phase === "work" ? current - 1 : current - 1;
  const colors: Record<Phase, string> = { work: "#f43f5e", short: "#10b981", long: "#3b82f6" };
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-2 w-2 rounded-full transition-all"
          style={{
            backgroundColor: i < active ? colors[phase] : i === active ? colors[phase] : "#334155",
            opacity: i < active ? 0.5 : 1,
            transform: i === active ? "scale(1.3)" : "scale(1)",
          }}
        />
      ))}
    </div>
  );
}

// ── Settings Panel ────────────────────────────────────────────────────────────

function SettingsPanel({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  function field(label: string, key: keyof Settings, min: number, max: number, suffix: string) {
    return (
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</span>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={min}
            max={max}
            value={settings[key]}
            onChange={(e) => {
              const v = Math.max(min, Math.min(max, parseInt(e.target.value) || min));
              onChange({ ...settings, [key]: v });
            }}
            className="w-14 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-center text-sm font-mono font-bold text-white focus:border-slate-500 focus:outline-none"
          />
          <span className="text-xs text-slate-500">{suffix}</span>
        </div>
      </label>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-3">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Timer settings</p>
      <div className="grid grid-cols-3 gap-3">
        {field("Work", "workMin", 1, 90, "min")}
        {field("Short break", "shortMin", 1, 30, "min")}
        {field("Long break", "longMin", 5, 60, "min")}
      </div>
      <div className="mt-3">
        {field("Rounds before long break", "rounds", 2, 10, "rounds")}
      </div>
    </div>
  );
}

// ── Main Popup ────────────────────────────────────────────────────────────────

function PopupInner() {
  const params = useSearchParams();

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<Phase>((params.get("phase") ?? "work") as Phase);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [round, setRound] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskId, setTaskId] = useState(params.get("taskId") ?? "");
  const [sessionTracked, setSessionTracked] = useState(0);

  const sessionStartRef = useRef(0);
  const accumulatedRef = useRef(0);
  const settingsRef = useRef(settings);

  // Load settings & tasks on mount
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    settingsRef.current = s;
    const initSec = parseInt(params.get("secondsLeft") ?? "0");
    setSecondsLeft(initSec > 0 ? initSec : phaseDuration((params.get("phase") ?? "work") as Phase, s));

    fetch("/api/items", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { data: Task[] }) => setTasks(j.data ?? []))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update settings ref and reset timer when settings change
  const handleSettingsChange = useCallback((s: Settings) => {
    setSettings(s);
    settingsRef.current = s;
    saveSettings(s);
    if (!running) {
      setSecondsLeft(phaseDuration(phase, s));
    }
  }, [running, phase]);

  // Switch phase
  const switchPhase = useCallback((p: Phase) => {
    setRunning(false);
    accumulatedRef.current = 0;
    setPhase(p);
    setSecondsLeft(phaseDuration(p, settingsRef.current));
  }, []);

  // Timer tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setRunning(false);
          void onSessionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  async function onSessionComplete() {
    // Save tracked time
    if (phase === "work" && taskId) {
      const worked = Math.round(accumulatedRef.current + (Date.now() - sessionStartRef.current) / 1000);
      if (worked > 0) {
        const next = await addTracked(taskId, worked);
        setSessionTracked(next);
        setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, trackedSeconds: next } : t));
      }
      accumulatedRef.current = 0;
    }

    const s = settingsRef.current;
    if (phase === "work") {
      const nextRound = round + 1;
      if (nextRound > s.rounds) {
        setPhase("long"); setSecondsLeft(phaseDuration("long", s)); setRound(1);
      } else {
        setPhase("short"); setSecondsLeft(phaseDuration("short", s)); setRound(nextRound);
      }
    } else {
      setPhase("work"); setSecondsLeft(phaseDuration("work", s));
    }
  }

  const handleStartPause = useCallback(() => {
    if (running) {
      accumulatedRef.current += (Date.now() - sessionStartRef.current) / 1000;
      setRunning(false);
    } else {
      sessionStartRef.current = Date.now();
      setRunning(true);
    }
  }, [running]);

  const handleReset = useCallback(() => {
    setRunning(false);
    accumulatedRef.current = 0;
    setSecondsLeft(phaseDuration(phase, settingsRef.current));
  }, [phase]);

  // Save on close
  useEffect(() => {
    const onUnload = () => {
      if (running && phase === "work" && taskId) {
        const worked = Math.round(accumulatedRef.current + (Date.now() - sessionStartRef.current) / 1000);
        if (worked > 0) void addTracked(taskId, worked);
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [running, phase, taskId]);

  const dur = phaseDuration(phase, settings);
  const progress = dur > 0 ? 1 - secondsLeft / dur : 0;

  const phaseColors: Record<Phase, string> = {
    work: "#f43f5e",
    short: "#10b981",
    long: "#3b82f6",
  };
  const phaseNames: Record<Phase, string> = {
    work: "Focus",
    short: "Short break",
    long: "Long break",
  };

  const selectedTask = tasks.find((t) => t.id === taskId);
  const availableTasks = tasks.filter((t) => t.kind === "TASK" && t.status !== "DONE" && t.status !== "CANCELLED");

  const noSelect: React.CSSProperties = { WebkitAppRegion: "no-drag" } as React.CSSProperties;

  return (
    <div
      className="flex h-screen select-none flex-col bg-slate-900 text-slate-100"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif", WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="text-[11px] font-semibold tracking-wider text-slate-500">🍅 POMODORO</span>
        <button
          type="button"
          style={noSelect}
          onClick={() => setShowSettings((v) => !v)}
          className={`rounded-md p-1 text-xs transition ${showSettings ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
          title="Settings"
        >
          ⚙
        </button>
      </div>

      {/* Phase tabs */}
      <div className="flex items-center gap-1 px-4" style={noSelect}>
        {(["work", "short", "long"] as Phase[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => switchPhase(p)}
            className="rounded-lg px-3 py-1.5 text-[11px] font-semibold transition"
            style={{
              backgroundColor: phase === p ? phaseColors[p] + "22" : "transparent",
              color: phase === p ? phaseColors[p] : "#475569",
              border: `1px solid ${phase === p ? phaseColors[p] + "55" : "transparent"}`,
            }}
          >
            {phaseNames[p]}
          </button>
        ))}
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        {/* Ring */}
        <div className="relative flex items-center justify-center" style={noSelect}>
          <Ring progress={progress} phase={phase} size={160} />
          <div className="absolute flex flex-col items-center gap-0.5">
            <span
              className="font-mono text-4xl font-bold tabular-nums tracking-tight"
              style={{ color: phaseColors[phase] }}
            >
              {fmtTime(secondsLeft)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {running ? phaseNames[phase] : "paused"}
            </span>
          </div>
        </div>

        {/* Round dots */}
        <div style={noSelect}>
          <RoundDots total={settings.rounds} current={round} phase={phase} />
        </div>

        {/* Task selector */}
        <div className="w-full" style={noSelect}>
          <select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            className="w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-slate-500 focus:outline-none"
          >
            <option value="">— No task —</option>
            {availableTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          {selectedTask && (
            <p className="mt-1.5 text-center text-[11px] text-slate-500">
              {selectedTask.trackedSeconds > 0
                ? `⏱ ${fmtTracked(selectedTask.trackedSeconds)} tracked`
                : "No time tracked yet"}
              {sessionTracked > 0 && phase !== "work" && ` · +${fmtTracked(sessionTracked)} this session`}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3" style={noSelect}>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
          >
            ⟳ Reset
          </button>
          <button
            type="button"
            onClick={handleStartPause}
            className="rounded-xl px-6 py-2 text-sm font-bold text-white transition active:scale-95"
            style={{
              background: running
                ? "linear-gradient(135deg, #475569, #334155)"
                : `linear-gradient(135deg, ${phaseColors[phase]}, ${phaseColors[phase]}cc)`,
              boxShadow: running ? "none" : `0 4px 20px ${phaseColors[phase]}44`,
            }}
          >
            {running ? "⏸ Pause" : "▶ Start"}
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="border-t border-slate-700/60 p-4" style={noSelect}>
          <SettingsPanel settings={settings} onChange={handleSettingsChange} />
        </div>
      )}

      {/* Bottom padding */}
      <div className="h-3" />
    </div>
  );
}

export function PomodoroPopup() {
  return (
    <Suspense>
      <PopupInner />
    </Suspense>
  );
}
