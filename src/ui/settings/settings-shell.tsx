"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  applyThemeTokens,
  CUSTOM_THEME_STORAGE_KEY,
  DARK_THEME,
  loadStoredThemeState,
  resolveTheme,
  THEME_STORAGE_KEY,
  TOKEN_LABELS,
  type ThemeMode,
  type ThemeTokens,
} from "@/src/ui/theme/theme-config";

export function SettingsShell() {
  const storedTheme = useMemo(() => loadStoredThemeState(), []);
  const [themeMode, setThemeMode] = useState<ThemeMode>(storedTheme.mode);
  const [customTheme, setCustomTheme] = useState<ThemeTokens>(storedTheme.customTheme);

  const activeTheme = useMemo(() => resolveTheme(themeMode, customTheme), [themeMode, customTheme]);

  useEffect(() => {
    applyThemeTokens(activeTheme);
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(customTheme));
  }, [activeTheme, customTheme, themeMode]);

  function handleCustomTokenChange(token: keyof ThemeTokens, value: string) {
    setThemeMode("custom");
    setCustomTheme((current) => ({ ...current, [token]: value }));
  }

  return (
    <main className="mx-auto min-h-screen max-w-[1200px] p-4 text-[var(--app-text)] md:p-6">
      <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[0_26px_80px_rgba(3,7,18,0.2)]">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--app-muted)]">Dinox</p>
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-[var(--app-muted)]">Theme and color customization for the whole app.</p>
          </div>
          <Link
            href="/"
            className="rounded-xl border border-[var(--app-border-strong)] px-3 py-2 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
          >
            Back to calendar
          </Link>
        </div>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">Theme mode</h2>
          <div className="mb-4 inline-flex rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] p-1">
            {(["dark", "light", "custom"] as ThemeMode[]).map((modeOption) => (
              <button
                key={modeOption}
                type="button"
                onClick={() => setThemeMode(modeOption)}
                className={`rounded-lg px-3 py-1.5 text-xs uppercase tracking-wide transition ${
                  themeMode === modeOption
                    ? "bg-[var(--app-accent)] text-[var(--app-bg)]"
                    : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
                }`}
              >
                {modeOption}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {(Object.keys(TOKEN_LABELS) as Array<keyof ThemeTokens>).map((token) => (
              <label
                key={token}
                className="flex items-center justify-between rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2"
              >
                <span className="text-xs text-[var(--app-muted)]">{TOKEN_LABELS[token]}</span>
                <input
                  type="color"
                  value={customTheme[token]}
                  onChange={(event) => handleCustomTokenChange(token, event.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-[var(--app-border-strong)]"
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setThemeMode("custom");
              setCustomTheme({ ...DARK_THEME });
            }}
            className="mt-4 rounded-xl border border-[var(--app-border-strong)] px-3 py-2 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
          >
            Reset custom theme
          </button>
        </section>
      </div>
    </main>
  );
}