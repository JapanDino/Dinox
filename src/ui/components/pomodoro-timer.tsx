"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiItem } from "@/src/ui/api/types";

// ── Types & constants ─────────────────────────────────────────────────────────

export type Phase = "work" | "short" | "long";

interface Settings {
  workMin: number;
  shortMin: number;
  longMin: number;
  rounds: number;
}

const DEFAULT_SETTINGS: Settings = { workMin: 25, shortMin: 5, longMin: 15, rounds: 4 };
const SETTINGS_KEY = "dinox-pomodoro-settings";

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

function phaseLabel(p: Phase) {
  return p === "work" ? "Focus" : p === "short" ? "Short break" : "Long break";
}

export function fmtTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function fmtTracked(s: number) {
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

async function addTracked(taskId: string, currentTracked: number, addSeconds: number) {
  const next = currentTracked + addSeconds;
  await fetch(`/api/items/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackedSeconds: next }),
    cache: "no-store",
  });
  return next;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface PomodoroTimerProps {
  tasks: ApiItem[];
  open: boolean;
  onOpenChange: (v: boolean | ((prev: boolean) => boolean)) => void;
  onStateChange: (state: { running: boolean; phase: Phase; secondsLeft: number }) => void;
  onTrackedUpdated?: (taskId: string, newTrackedSeconds: number) => void;
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function PomodoroTimer({
  tasks,
  open,
  onOpenChange,
  onStateChange,
  onTrackedUpdated,
}: PomodoroTimerProps) {
  const [minimized, setMinimized] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);

  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [phase, setPhase] = useState<Phase>("work");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SETTINGS.workMin * 60);
  const [running, setRunning] = useState(false);
  const [round, setRound] = useState(1);

  const sessionStartRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  // Load settings once on mount
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    settingsRef.current = s;
    setSecondsLeft(phaseDuration("work", s));
  }, []);

  // Surface live state to parent (for the topbar badge)
  useEffect(() => {
    onStateChange({ running, phase, secondsLeft });
  }, [running, phase, secondsLeft, onStateChange]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  // Timer tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setRunning(false);
          void handleSessionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  async function handleSessionComplete() {
    if (phase === "work" && selectedTaskId) {
      const worked = Math.round(
        accumulatedRef.current + (Date.now() - sessionStartRef.current) / 1000
      );
      if (worked > 0) {
        const task = tasks.find((t) => t.id === selectedTaskId);
        const next = await addTracked(selectedTaskId, task?.trackedSeconds ?? 0, worked);
        accumulatedRef.current = 0;
        onTrackedUpdated?.(selectedTaskId, next);
      }
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

  const handlePopOut = useCallback(() => {
    const p = new URLSearchParams({
      taskId: selectedTaskId,
      taskTitle: selectedTask?.title ?? "",
      phase,
      secondsLeft: String(secondsLeft),
      running: String(running),
    });
    if (running) {
      accumulatedRef.current += (Date.now() - sessionStartRef.current) / 1000;
      setRunning(false);
    }
    const dinox = (window as unknown as { dinox?: { openPomodoroPopup?: (url: string) => void } }).dinox;
    if (dinox?.openPomodoroPopup) {
      dinox.openPomodoroPopup(`/pomodoro?${p.toString()}`);
    } else {
      window.open(`/pomodoro?${p.toString()}`, "_blank", "width=360,height=500");
    }
    onOpenChange(false);
  }, [selectedTaskId, selectedTask, phase, secondsLeft, running, onOpenChange]);

  const phaseColor = phase === "work" ? "#f43f5e" : phase === "short" ? "#10b981" : "#3b82f6";
  const progress = secondsLeft / phaseDuration(phase, settings);

  // Nothing rendered when closed — trigger lives in the topbar
  if (!open) return null;

  // ── Panel ──────────────────────────────────────────────────────────────────
  // Positioned top-right, just below the topbar (~52px from top)
  return (
    <div className="fixed right-3 top-[52px] z-50 w-72 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--app-border)] px-3 py-2">
        <span className="text-xs font-bold tracking-wider text-[var(--app-muted)]">🍅 POMODORO</span>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={handlePopOut} title="Pin always-on-top"
            className="rounded px-1.5 py-1 text-[11px] text-[var(--app-muted)] transition hover:bg-[var(--app-surface-2)] hover:text-[var(--app-text)]">
            📌
          </button>
          <button
            type="button"
            onClick={() => setMinimized((v) => !v)}
            title={minimized ? "Expand" : "Collapse"}
            className="rounded px-1.5 py-1 text-[11px] text-[var(--app-muted)] transition hover:bg-[var(--app-surface-2)] hover:text-[var(--app-text)]"
          >
            {minimized ? "▲" : "▼"}
          </button>
          <button
            type="button"
            onClick={() => { onOpenChange(false); setRunning(false); }}
            title="Close"
            className="rounded px-1.5 py-1 text-[11px] text-[var(--app-muted)] transition hover:bg-[var(--app-surface-2)] hover:text-red-400"
          >
            ✕
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="space-y-3 p-3">

          {/* Phase tabs */}
          <div className="flex gap-1">
            {(["work", "short", "long"] as Phase[]).map((p) => (
              <button key={p} type="button"
                onClick={() => {
                  setRunning(false);
                  accumulatedRef.current = 0;
                  setPhase(p);
                  setSecondsLeft(phaseDuration(p, settings));
                }}
                className="flex-1 rounded-lg py-1 text-[10px] font-semibold transition"
                style={{
                  backgroundColor: phase === p ? phaseColor + "22" : "transparent",
                  color: phase === p ? phaseColor : "var(--app-muted)",
                  border: `1px solid ${phase === p ? phaseColor + "55" : "var(--app-border)"}`,
                }}
              >
                {p === "work" ? "Focus" : p === "short" ? "Short" : "Long"}
              </button>
            ))}
          </div>

          {/* Timer ring + digits */}
          <div className="flex items-center justify-center gap-4">
            <div className="relative flex items-center justify-center flex-shrink-0">
              <svg width="72" height="72" className="-rotate-90">
                <circle cx="36" cy="36" r="28" fill="none" stroke="var(--app-border)" strokeWidth="5" />
                <circle
                  cx="36" cy="36" r="28" fill="none" stroke={phaseColor} strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={2 * Math.PI * 28 * progress}
                  style={{ transition: "stroke-dashoffset 0.6s ease", filter: `drop-shadow(0 0 6px ${phaseColor}66)` }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-mono text-[11px] font-bold" style={{ color: phaseColor }}>
                  {Math.ceil((1 - progress) * 100)}%
                </span>
              </div>
            </div>

            <div>
              <div className="font-mono text-3xl font-bold tabular-nums" style={{ color: phaseColor }}>
                {fmtTime(secondsLeft)}
              </div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">
                {running ? phaseLabel(phase) : "paused"}
              </div>
              <div className="mt-1.5 flex gap-1">
                {Array.from({ length: settings.rounds }).map((_, i) => (
                  <div key={i} className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        i < round - 1 ? phaseColor + "66"
                        : i === round - 1 ? phaseColor
                        : "var(--app-border-strong)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Task picker */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">
              Task
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2 py-1.5 text-xs text-[var(--app-text)] focus:outline-none focus:border-[var(--app-border-strong)]"
            >
              <option value="">— No task —</option>
              {tasks
                .filter((t) => t.kind === "TASK" && t.status !== "DONE" && t.status !== "CANCELLED")
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
            </select>
            {selectedTask?.trackedSeconds ? (
              <p className="mt-1 text-[10px] text-[var(--app-muted)]">
                ⏱ {fmtTracked(selectedTask.trackedSeconds)} tracked
              </p>
            ) : null}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 rounded-lg border border-[var(--app-border)] py-1.5 text-xs font-medium text-[var(--app-muted)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
            >
              ⟳ Reset
            </button>
            <button
              type="button"
              onClick={handleStartPause}
              className="flex-1 rounded-lg py-1.5 text-xs font-bold text-white transition active:scale-95"
              style={{
                background: running ? "#475569" : `linear-gradient(135deg, ${phaseColor}, ${phaseColor}cc)`,
                boxShadow: running ? "none" : `0 4px 14px ${phaseColor}44`,
              }}
            >
              {running ? "⏸ Pause" : "▶ Start"}
            </button>
          </div>

          {/* Pop-out link */}
          <button
            type="button"
            onClick={handlePopOut}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--app-border)] py-1.5 text-[11px] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
          >
            <span>📌 Open pinned window</span>
            <span className="text-[10px] text-[var(--app-muted)]">(always on top)</span>
          </button>

        </div>
      )}

      {/* Minimized bar */}
      {minimized && (
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-mono text-sm font-bold" style={{ color: phaseColor }}>
            {fmtTime(secondsLeft)}
          </span>
          <span className="text-[10px] uppercase" style={{ color: phaseColor }}>
            {phaseLabel(phase)}
          </span>
          <div className="flex gap-1">
            <button type="button" onClick={handleStartPause} className="text-sm" style={{ color: phaseColor }}>
              {running ? "⏸" : "▶"}
            </button>
            <button type="button" onClick={handleReset} className="text-sm text-[var(--app-muted)]">
              ⟳
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
