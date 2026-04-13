"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiItem } from "@/src/ui/api/types";
import { PomodoroTimer } from "./pomodoro-timer";

export function PomodoroProvider() {
  const [tasks, setTasks] = useState<ApiItem[]>([]);

  // Fetch tasks for the selector
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/items", { cache: "no-store" });
        const json = await res.json() as { data: ApiItem[] };
        setTasks(json.data ?? []);
      } catch {
        // silently ignore
      }
    }
    void load();
    // Refresh every 60s so new tasks appear
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const handleTrackedUpdated = useCallback((taskId: string, newSeconds: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, trackedSeconds: newSeconds } : t))
    );
  }, []);

  return (
    <PomodoroTimer
      tasks={tasks}
      onTrackedUpdated={handleTrackedUpdated}
    />
  );
}
