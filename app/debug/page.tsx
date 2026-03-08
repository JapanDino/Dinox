"use client";

import Link from "next/link";
import { useEffect } from "react";
import { applyThemeTokens, loadStoredThemeState, resolveTheme } from "@/src/ui/theme/theme-config";
import { LoadDemoButton } from "./load-demo-button";

export default function DebugPage() {
  useEffect(() => {
    const stored = loadStoredThemeState();
    applyThemeTokens(resolveTheme(stored.mode, stored.customTheme));
  }, []);

  return (
    <main className="flex min-h-screen flex-col bg-[var(--app-bg)] p-8 text-[var(--app-text)]">
      <div className="mx-auto w-full max-w-lg">
        {/* Header */}
        <div className="mb-8">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--app-muted)]">
            Dinox
          </p>
          <h1 className="text-2xl font-semibold">Debug tools</h1>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Developer utilities for the local SQLite database.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
          <h2 className="mb-1 text-sm font-semibold text-[var(--app-text)]">Demo data</h2>
          <p className="mb-4 text-xs text-[var(--app-muted)]">
            Seeds the database with a fixed set of projects, tags, and events so you can explore the
            UI without creating data manually. Safe to run multiple times (idempotent).
          </p>
          <LoadDemoButton />
        </div>

        {/* Nav */}
        <div className="mt-6 flex gap-3">
          <Link
            href="/"
            className="rounded-xl border border-[var(--app-border-strong)] px-4 py-2 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
          >
            Calendar
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-[var(--app-border-strong)] px-4 py-2 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className="rounded-xl border border-[var(--app-border-strong)] px-4 py-2 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
          >
            Settings
          </Link>
        </div>
      </div>
    </main>
  );
}
