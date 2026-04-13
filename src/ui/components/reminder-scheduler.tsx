"use client";

import { useEffect, useRef, useCallback } from "react";
import type { ApiItem } from "@/src/ui/api/types";

// ── Constants ─────────────────────────────────────────────────────────────────

export const REMINDER_SETTINGS_KEY = "dinox-reminder-settings";
const CHECK_INTERVAL_MS = 30_000; // check every 30 seconds
const FETCH_INTERVAL_MS = 60_000; // refresh items every 60 seconds

export interface ReminderSettings {
  enabled: boolean;
  minutesBefore: number[]; // e.g. [5, 15]
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  minutesBefore: [5, 15],
};

export function loadReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(REMINDER_SETTINGS_KEY);
    if (raw) return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) } as ReminderSettings;
  } catch { /* ignore */ }
  return DEFAULT_REMINDER_SETTINGS;
}

export function saveReminderSettings(s: ReminderSettings) {
  try { localStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMin(m: number) {
  if (m < 60) return `${m} min`;
  return `${m / 60}h`;
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

export function ReminderScheduler() {
  const itemsRef = useRef<ApiItem[]>([]);
  // key = `${itemId}-${minutesBefore}` so each threshold fires once per item
  const notifiedRef = useRef<Set<string>>(new Set());

  // ── Fetch items ──────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/items", { cache: "no-store" });
      const json = (await res.json()) as { data: ApiItem[] };
      itemsRef.current = json.data ?? [];
    } catch { /* ignore */ }
  }, []);

  // ── Check upcoming ───────────────────────────────────────────────────────
  const checkUpcoming = useCallback(() => {
    const settings = loadReminderSettings();
    if (!settings.enabled) return;
    if (Notification.permission !== "granted") return;

    const now = Date.now();
    const items = itemsRef.current;

    for (const item of items) {
      if (!item.startAt) continue;
      // Only notify for events and tasks
      if (item.kind !== "TASK" && item.kind !== "EVENT") continue;
      // Skip done / cancelled
      if (item.status === "DONE" || item.status === "CANCELLED") continue;

      const startMs = new Date(item.startAt).getTime();
      // Only future events (within next 2 hours, not already past)
      if (startMs <= now) continue;
      const diffMin = (startMs - now) / 60_000;
      if (diffMin > 120) continue;

      for (const threshold of settings.minutesBefore) {
        const key = `${item.id}-${threshold}`;
        if (notifiedRef.current.has(key)) continue;

        // Fire when we're within [threshold-0.5, threshold+0.5] minutes window
        if (Math.abs(diffMin - threshold) <= 0.5) {
          notifiedRef.current.add(key);

          const kindLabel = item.kind === "TASK" ? "Task" : "Event";
          const body =
            threshold === 0
              ? `${kindLabel} is starting now!`
              : `${kindLabel} starts in ${fmtMin(threshold)}`;

          try {
            const n = new Notification(`🔔 ${item.title}`, {
              body,
              icon: "/favicon.ico",
              tag: key, // dedup OS-level
              requireInteraction: false,
            });
            // Auto-close after 8 s on platforms that don't auto-close
            setTimeout(() => n.close(), 8_000);
          } catch { /* ignore */ }
        }
      }
    }
  }, []);

  // ── Request permission & start loops ────────────────────────────────────
  useEffect(() => {
    // Request permission (no-op if already granted/denied)
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }

    // Initial fetch
    void fetchItems();

    const fetchId = setInterval(() => void fetchItems(), FETCH_INTERVAL_MS);
    const checkId = setInterval(checkUpcoming, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(fetchId);
      clearInterval(checkId);
    };
  }, [fetchItems, checkUpcoming]);

  // Invisible — renders nothing
  return null;
}
