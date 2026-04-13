"use client";

import { useState } from "react";

export function LoadDemoButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleLoadDemo() {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/debug/load-demo", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Failed to load demo data.");
      }

      setStatus("done");
      setMessage("Demo data loaded. Head to the calendar to see it.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unexpected error.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleLoadDemo}
        disabled={status === "loading" || status === "done"}
        className="h-10 w-fit rounded-xl bg-[var(--app-accent)] px-5 text-sm font-semibold text-[var(--app-bg)] transition hover:bg-[var(--app-accent-strong)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "Loading…" : status === "done" ? "Done ✓" : "Load demo data"}
      </button>
      {message && (
        <p
          className="text-sm"
          style={{ color: status === "error" ? "var(--app-danger)" : "var(--app-muted)" }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
