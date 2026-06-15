"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiItem } from "@/src/ui/api/types";
import { PomodoroTimer, type Phase } from "./pomodoro-timer";

// ── Context ───────────────────────────────────────────────────────────────────

export interface PomodoroLiveState {
  open: boolean;
  setOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  running: boolean;
  phase: Phase;
  secondsLeft: number;
}

const PomodoroContext = createContext<PomodoroLiveState | null>(null);

/** Use this hook in any component inside the layout to read/control the timer. */
export function usePomodoroContext(): PomodoroLiveState | null {
  return useContext(PomodoroContext);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function PomodoroProvider({ children }: { children?: React.ReactNode }) {
  const [tasks, setTasks] = useState<ApiItem[]>([]);
  const [open, setOpen] = useState(false);

  // Live timer state surfaced up for the topbar button to show
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPhase, setTimerPhase] = useState<Phase>("work");
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60);

  // Fetch tasks for the selector
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/items", { cache: "no-store" });
        const json = (await res.json()) as { data: ApiItem[] };
        setTasks(json.data ?? []);
      } catch {
        // silently ignore
      }
    }
    void load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const handleTrackedUpdated = useCallback((taskId: string, newSeconds: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, trackedSeconds: newSeconds } : t))
    );
  }, []);

  const handleStateChange = useCallback(
    (state: { running: boolean; phase: Phase; secondsLeft: number }) => {
      setTimerRunning(state.running);
      setTimerPhase(state.phase);
      setTimerSecondsLeft(state.secondsLeft);
    },
    []
  );

  const ctx: PomodoroLiveState = {
    open,
    setOpen,
    running: timerRunning,
    phase: timerPhase,
    secondsLeft: timerSecondsLeft,
  };

  return (
    <PomodoroContext.Provider value={ctx}>
      {children}
      <PomodoroTimer
        tasks={tasks}
        open={open}
        onOpenChange={setOpen}
        onStateChange={handleStateChange}
        onTrackedUpdated={handleTrackedUpdated}
      />
    </PomodoroContext.Provider>
  );
}
