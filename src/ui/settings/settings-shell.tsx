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
import {
  loadPrefs,
  PREFS_DEFAULT_VIEW_KEY,
  PREFS_WEEK_START_KEY,
  type DefaultView,
  type WeekStart,
} from "@/src/ui/prefs/prefs-config";
import { fetchItems, fetchProjects, fetchTags } from "@/src/ui/api/client";

type Section = "appearance" | "calendar" | "shortcuts" | "about";

const SECTION_LABELS: Record<Section, string> = {
  appearance: "Appearance",
  calendar: "Calendar",
  shortcuts: "Shortcuts",
  about: "About",
};

const KEYBOARD_SHORTCUTS = [
  { key: "N", description: "New event" },
  { key: "T", description: "Go to today" },
  { key: "F", description: "Toggle focus work project" },
  { key: "Ctrl + 1", description: "Month view + today" },
  { key: "← →", description: "Previous / next period" },
  { key: "Esc", description: "Close modal" },
];

// ─── Root shell ──────────────────────────────────────────────────────────────

export function SettingsShell() {
  const [activeSection, setActiveSection] = useState<Section>("appearance");

  // Theme
  const storedTheme = useMemo(() => loadStoredThemeState(), []);
  const [themeMode, setThemeMode] = useState<ThemeMode>(storedTheme.mode);
  const [customTheme, setCustomTheme] = useState<ThemeTokens>(storedTheme.customTheme);
  const activeTheme = useMemo(
    () => resolveTheme(themeMode, customTheme),
    [themeMode, customTheme]
  );

  useEffect(() => {
    applyThemeTokens(activeTheme);
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(customTheme));
  }, [activeTheme, customTheme, themeMode]);

  function handleCustomTokenChange(token: keyof ThemeTokens, value: string) {
    setThemeMode("custom");
    setCustomTheme((prev) => ({ ...prev, [token]: value }));
  }

  // Calendar prefs
  const storedPrefs = useMemo(() => loadPrefs(), []);
  const [weekStart, setWeekStart] = useState<WeekStart>(storedPrefs.weekStart);
  const [defaultView, setDefaultView] = useState<DefaultView>(storedPrefs.defaultView);

  useEffect(() => {
    localStorage.setItem(PREFS_WEEK_START_KEY, weekStart);
  }, [weekStart]);

  useEffect(() => {
    localStorage.setItem(PREFS_DEFAULT_VIEW_KEY, defaultView);
  }, [defaultView]);

  // Export
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  async function handleExport() {
    setExporting(true);
    setExportDone(false);
    try {
      const [items, projects, tags] = await Promise.all([
        fetchItems(),
        fetchProjects(),
        fetchTags(),
      ]);
      const blob = new Blob(
        [JSON.stringify({ exportedAt: new Date().toISOString(), items, projects, tags }, null, 2)],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dinox-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)]">
      {/* Sidebar */}
      <aside className="flex w-52 flex-shrink-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-5">
        <div className="mb-6 px-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--app-muted)]">
            Dinox
          </p>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>

        <nav className="flex flex-col gap-0.5">
          {(Object.keys(SECTION_LABELS) as Section[]).map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                activeSection === section
                  ? "bg-[var(--app-surface-2)] text-[var(--app-text)]"
                  : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
              }`}
            >
              {SECTION_LABELS[section]}
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t border-[var(--app-border)] pt-4">
          <div className="grid gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-between rounded-xl border border-[var(--app-border-strong)] px-3 py-2 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
            >
              <span>Calendar</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-between rounded-xl border border-[var(--app-border-strong)] px-3 py-2 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
            >
              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-2xl">
          {activeSection === "appearance" && (
            <AppearanceSection
              themeMode={themeMode}
              customTheme={customTheme}
              activeTheme={activeTheme}
              onThemeModeChange={setThemeMode}
              onTokenChange={handleCustomTokenChange}
              onReset={() => {
                setThemeMode("custom");
                setCustomTheme({ ...DARK_THEME });
              }}
            />
          )}
          {activeSection === "calendar" && (
            <CalendarSection
              weekStart={weekStart}
              defaultView={defaultView}
              exporting={exporting}
              exportDone={exportDone}
              onWeekStartChange={setWeekStart}
              onDefaultViewChange={setDefaultView}
              onExport={() => void handleExport()}
            />
          )}
          {activeSection === "shortcuts" && <ShortcutsSection />}
          {activeSection === "about" && <AboutSection />}
        </div>
      </main>
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-0.5 text-sm text-[var(--app-muted)]">{description}</p>
    </div>
  );
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-3 gap-4">
      <div className="min-w-0">
        <p className="text-sm text-[var(--app-text)]">{label}</p>
        {hint && <p className="text-xs text-[var(--app-muted)]">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="inline-flex rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-lg px-3 py-1.5 text-xs capitalize tracking-wide transition ${
            value === option
              ? "bg-[var(--app-accent)] text-[var(--app-bg)] font-medium"
              : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
          }`}
        >
          {labels?.[option] ?? option}
        </button>
      ))}
    </div>
  );
}

// ─── Appearance section ───────────────────────────────────────────────────────

function AppearanceSection({
  themeMode,
  customTheme,
  activeTheme,
  onThemeModeChange,
  onTokenChange,
  onReset,
}: {
  themeMode: ThemeMode;
  customTheme: ThemeTokens;
  activeTheme: ThemeTokens;
  onThemeModeChange: (m: ThemeMode) => void;
  onTokenChange: (token: keyof ThemeTokens, value: string) => void;
  onReset: () => void;
}) {
  return (
    <div>
      <SectionHeader
        title="Appearance"
        description="Choose a built-in theme or build your own color scheme."
      />

      <div className="mb-6 flex flex-col gap-3">
        <SettingRow label="Theme" hint="Sets the base color palette">
          <SegmentedControl
            options={["dark", "light", "custom"] as const}
            value={themeMode}
            onChange={onThemeModeChange}
            labels={{ dark: "Dark", light: "Light", custom: "Custom" }}
          />
        </SettingRow>
      </div>

      {themeMode === "custom" && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">
            Custom colors
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(Object.keys(TOKEN_LABELS) as Array<keyof ThemeTokens>).map((token) => (
              <label
                key={token}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-2.5 transition hover:border-[var(--app-border-strong)]"
              >
                <div>
                  <p className="text-sm text-[var(--app-text)]">{TOKEN_LABELS[token]}</p>
                  <p className="font-mono text-[11px] text-[var(--app-muted)]">
                    {customTheme[token]}
                  </p>
                </div>
                <div className="relative flex items-center gap-2">
                  <div
                    className="h-7 w-7 rounded-lg border border-[var(--app-border-strong)]"
                    style={{ backgroundColor: customTheme[token] }}
                  />
                  <input
                    type="color"
                    value={customTheme[token]}
                    onChange={(e) => onTokenChange(token, e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </div>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={onReset}
            className="mt-4 rounded-xl border border-[var(--app-border-strong)] px-4 py-2 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
          >
            Reset to dark defaults
          </button>
        </div>
      )}

      {themeMode !== "custom" && (
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">
            Color preview
          </p>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                "appBg",
                "appSurface",
                "appSurface2",
                "appBorder",
                "appText",
                "appMuted",
                "appAccent",
                "appDanger",
              ] as Array<keyof ThemeTokens>
            ).map((token) => (
              <div key={token} className="flex flex-col items-center gap-1">
                <div
                  className="h-8 w-full rounded-lg border border-[var(--app-border)]"
                  style={{ backgroundColor: activeTheme[token] }}
                />
                <p className="text-center text-[10px] text-[var(--app-muted)]">
                  {TOKEN_LABELS[token]}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Calendar section ─────────────────────────────────────────────────────────

function CalendarSection({
  weekStart,
  defaultView,
  exporting,
  exportDone,
  onWeekStartChange,
  onDefaultViewChange,
  onExport,
}: {
  weekStart: WeekStart;
  defaultView: DefaultView;
  exporting: boolean;
  exportDone: boolean;
  onWeekStartChange: (v: WeekStart) => void;
  onDefaultViewChange: (v: DefaultView) => void;
  onExport: () => void;
}) {
  return (
    <div>
      <SectionHeader
        title="Calendar"
        description="Configure how the calendar looks and behaves."
      />

      <div className="mb-8 flex flex-col gap-3">
        <SettingRow label="Week starts on" hint="First day shown in week and month views">
          <SegmentedControl
            options={["monday", "sunday"] as const}
            value={weekStart}
            onChange={onWeekStartChange}
            labels={{ monday: "Monday", sunday: "Sunday" }}
          />
        </SettingRow>

        <SettingRow label="Default view" hint="View shown when opening the calendar">
          <SegmentedControl
            options={["month", "week", "day", "agenda"] as const}
            value={defaultView}
            onChange={onDefaultViewChange}
            labels={{ month: "Month", week: "Week", day: "Day", agenda: "Agenda" }}
          />
        </SettingRow>
      </div>

      <div className="border-t border-[var(--app-border)] pt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">
          Data
        </p>
        <div className="flex flex-col gap-3">
          <SettingRow
            label="Export data"
            hint="Download all events, projects, and tags as JSON"
          >
            <button
              type="button"
              onClick={onExport}
              disabled={exporting}
              className={`rounded-xl border px-4 py-2 text-sm transition disabled:opacity-50 ${
                exportDone
                  ? "border-[var(--app-accent)] text-[var(--app-accent)]"
                  : "border-[var(--app-border-strong)] text-[var(--app-muted)] hover:text-[var(--app-text)]"
              }`}
            >
              {exporting ? "Exporting…" : exportDone ? "Exported ✓" : "Export JSON"}
            </button>
          </SettingRow>
        </div>
      </div>
    </div>
  );
}

// ─── Shortcuts section ────────────────────────────────────────────────────────

function ShortcutsSection() {
  return (
    <div>
      <SectionHeader
        title="Keyboard shortcuts"
        description="Quick actions available in the calendar view."
      />
      <div className="flex flex-col gap-2">
        {KEYBOARD_SHORTCUTS.map(({ key, description }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-3"
          >
            <span className="text-sm text-[var(--app-text)]">{description}</span>
            <kbd className="rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-2.5 py-1 font-mono text-xs text-[var(--app-muted)]">
              {key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── About section ────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <div>
      <SectionHeader
        title="About"
        description="Dinox — local-first calendar for focused work."
      />
      <div className="flex flex-col gap-3">
        <SettingRow label="Version" hint="Current build">
          <span className="font-mono text-sm text-[var(--app-muted)]">0.1.0</span>
        </SettingRow>
        <SettingRow label="Storage" hint="All data is stored locally on this device">
          <span className="text-sm text-[var(--app-muted)]">Local SQLite</span>
        </SettingRow>
        <SettingRow label="Stack" hint="Core technologies">
          <span className="text-sm text-[var(--app-muted)]">Electron · Next.js · Prisma</span>
        </SettingRow>
        <SettingRow label="Architecture" hint="Data model">
          <span className="text-sm text-[var(--app-muted)]">Local-first, offline</span>
        </SettingRow>
      </div>
    </div>
  );
}
