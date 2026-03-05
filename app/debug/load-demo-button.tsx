"use client";

import { useState } from "react";

export function LoadDemoButton() {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleLoadDemo() {
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/debug/load-demo", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Failed to load demo data.");
      }

      setStatus("Demo data loaded successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleLoadDemo}
        disabled={loading}
        className="w-fit rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Loading..." : "Load demo data"}
      </button>
      {status ? <p className="text-sm text-zinc-700">{status}</p> : null}
    </div>
  );
}
