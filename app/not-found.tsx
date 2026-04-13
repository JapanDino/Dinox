"use client";

import Link from "next/link";
import { useEffect } from "react";
import { applyThemeTokens, loadStoredThemeState, resolveTheme } from "@/src/ui/theme/theme-config";

export default function NotFound() {
  useEffect(() => {
    const stored = loadStoredThemeState();
    applyThemeTokens(resolveTheme(stored.mode, stored.customTheme));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="text-center">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--app-muted)]">
          Dinox
        </p>
        <h1 className="mb-1 text-[6rem] font-bold leading-none tracking-tight text-[var(--app-accent)]">
          404
        </h1>
        <p className="mb-8 text-[var(--app-muted)]">Page not found</p>
        <Link
          href="/"
          className="rounded-xl border border-[var(--app-border-strong)] px-5 py-2.5 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
        >
          Back to calendar
        </Link>
      </div>
    </div>
  );
}
