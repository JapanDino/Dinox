"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  loadReminderSettings,
  saveReminderSettings,
  type ReminderSettings,
} from "@/src/ui/components/reminder-scheduler";
import {
  applyAccentColor,
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
  DEFAULT_ACCENT,
  PREFS_ACCENT_COLOR_KEY,
  PREFS_DEFAULT_VIEW_KEY,
  PREFS_LOCALE_KEY,
  PREFS_TIME_FORMAT_KEY,
  PREFS_WEEK_START_KEY,
  type AppLocale,
  type DefaultView,
  type TimeFormat,
  type WeekStart,
} from "@/src/ui/prefs/prefs-config";
import {
  exportIcs,
  fetchItems,
  fetchProjects,
  fetchSubscriptions,
  fetchTags,
  createSubscription,
  deleteSubscription,
  updateSubscription,
  syncSubscription,
  importIcs,
} from "@/src/ui/api/client";
import type { ApiCalendarSubscription } from "@/src/ui/api/types";

type Section = "appearance" | "calendar" | "reminders" | "integrations" | "shortcuts" | "about";

const SECTION_LABELS: Record<Section, string> = {
  appearance: "Appearance",
  calendar: "Calendar",
  reminders: "Reminders",
  integrations: "Integrations",
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

// Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ Root shell Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ

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

  // Accent color (independent of theme mode)
  const [accentColor, setAccentColor] = useState<string>(() => loadPrefs().accentColor);

  useEffect(() => {
    applyThemeTokens(activeTheme);
    // Re-apply accent on top after every theme change (theme reset would overwrite it)
    applyAccentColor(accentColor);
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(customTheme));
  }, [activeTheme, accentColor, customTheme, themeMode]);

  useEffect(() => {
    localStorage.setItem(PREFS_ACCENT_COLOR_KEY, accentColor);
    applyAccentColor(accentColor);
  }, [accentColor]);

  function handleCustomTokenChange(token: keyof ThemeTokens, value: string) {
    setThemeMode("custom");
    setCustomTheme((prev) => ({ ...prev, [token]: value }));
  }

  // Calendar prefs
  const storedPrefs = useMemo(() => loadPrefs(), []);
  const [weekStart, setWeekStart] = useState<WeekStart>(storedPrefs.weekStart);
  const [defaultView, setDefaultView] = useState<DefaultView>(storedPrefs.defaultView);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(storedPrefs.timeFormat);
  const [appLocale, setAppLocale] = useState<AppLocale>(storedPrefs.appLocale);

  useEffect(() => {
    localStorage.setItem(PREFS_WEEK_START_KEY, weekStart);
  }, [weekStart]);

  useEffect(() => {
    localStorage.setItem(PREFS_DEFAULT_VIEW_KEY, defaultView);
  }, [defaultView]);

  useEffect(() => {
    localStorage.setItem(PREFS_TIME_FORMAT_KEY, timeFormat);
  }, [timeFormat]);

  useEffect(() => {
    localStorage.setItem(PREFS_LOCALE_KEY, appLocale);
  }, [appLocale]);

  // Reminder settings
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(() => {
    if (typeof window !== "undefined") return loadReminderSettings();
    return { enabled: true, minutesBefore: [5, 15] };
  });
  const handleReminderSettingsChange = useCallback((s: ReminderSettings) => {
    setReminderSettings(s);
    saveReminderSettings(s);
  }, []);

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
      <aside className="flex w-[280px] flex-shrink-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-5">
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

        <nav className="mt-auto border-t border-[var(--app-border)] pt-3">
          <div className="flex items-center gap-1.5">
            <Link
              href="/"
              title="Calendar"
              className="flex h-9 flex-1 items-center justify-center rounded-lg border border-[var(--app-border-strong)] text-base text-[var(--app-muted)] transition hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]"
            >
              📅
            </Link>
            <Link
              href="/dashboard"
              title="Dashboard"
              className="flex h-9 flex-1 items-center justify-center rounded-lg border border-[var(--app-border-strong)] text-base text-[var(--app-muted)] transition hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]"
            >
              📊
            </Link>
            <Link
              href="/settings"
              title="Settings"
              className="flex h-9 flex-1 items-center justify-center rounded-lg border border-[var(--app-accent)] bg-[var(--app-surface-2)] text-base text-[var(--app-accent)] transition hover:opacity-80"
            >
              ⚙️
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-2xl">
          {activeSection === "appearance" && (
            <AppearanceSection
              themeMode={themeMode}
              customTheme={customTheme}
              activeTheme={activeTheme}
              accentColor={accentColor}
              onThemeModeChange={setThemeMode}
              onTokenChange={handleCustomTokenChange}
              onAccentColorChange={setAccentColor}
              onReset={() => {
                setThemeMode("custom");
                setCustomTheme({ ...DARK_THEME });
                setAccentColor(DEFAULT_ACCENT);
              }}
            />
          )}
          {activeSection === "calendar" && (
            <CalendarSection
              weekStart={weekStart}
              defaultView={defaultView}
              timeFormat={timeFormat}
              appLocale={appLocale}
              exporting={exporting}
              exportDone={exportDone}
              onWeekStartChange={setWeekStart}
              onDefaultViewChange={setDefaultView}
              onTimeFormatChange={setTimeFormat}
              onAppLocaleChange={setAppLocale}
              onExport={() => void handleExport()}
            />
          )}
          {activeSection === "reminders" && (
            <RemindersSection
              settings={reminderSettings}
              onChange={handleReminderSettingsChange}
            />
          )}
          {activeSection === "integrations" && <IntegrationsSection />}
          {activeSection === "shortcuts" && <ShortcutsSection />}
          {activeSection === "about" && <AboutSection />}
        </div>
      </main>
    </div>
  );
}

// Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ Shared primitives Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ

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

// Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ Appearance section Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ

const ACCENT_PRESETS = [
  { color: "#14b8a6", label: "Teal" },
  { color: "#3b82f6", label: "Blue" },
  { color: "#8b5cf6", label: "Violet" },
  { color: "#ec4899", label: "Pink" },
  { color: "#f97316", label: "Orange" },
  { color: "#eab308", label: "Yellow" },
  { color: "#22c55e", label: "Green" },
  { color: "#ef4444", label: "Red" },
  { color: "#06b6d4", label: "Cyan" },
  { color: "#a78bfa", label: "Purple" },
];

function AppearanceSection({
  themeMode,
  customTheme,
  activeTheme,
  accentColor,
  onThemeModeChange,
  onTokenChange,
  onAccentColorChange,
  onReset,
}: {
  themeMode: ThemeMode;
  customTheme: ThemeTokens;
  activeTheme: ThemeTokens;
  accentColor: string;
  onThemeModeChange: (m: ThemeMode) => void;
  onTokenChange: (token: keyof ThemeTokens, value: string) => void;
  onAccentColorChange: (color: string) => void;
  onReset: () => void;
}) {
  const isCustomAccent = !ACCENT_PRESETS.some((p) => p.color === accentColor);

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

        <SettingRow label="Accent color" hint="Used for buttons, highlights, and indicators">
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.color}
                type="button"
                title={p.label}
                onClick={() => onAccentColorChange(p.color)}
                className="h-6 w-6 rounded-full border-2 transition"
                style={{
                  backgroundColor: p.color,
                  borderColor: accentColor === p.color ? "white" : "transparent",
                  boxShadow: accentColor === p.color ? "0 0 0 1px " + p.color : "none",
                }}
              />
            ))}
            {/* Custom color picker */}
            <label
              title="Custom color"
              className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 transition"
              style={{
                background: isCustomAccent
                  ? accentColor
                  : "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
                borderColor: isCustomAccent ? "white" : "transparent",
                boxShadow: isCustomAccent ? "0 0 0 1px " + accentColor : "none",
              }}
            >
              {!isCustomAccent && (
                <span className="text-[10px] leading-none text-white font-bold select-none">+</span>
              )}
              <input
                type="color"
                value={accentColor}
                onChange={(e) => onAccentColorChange(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
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

    </div>
  );
}

// Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ Calendar section Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ

function CalendarSection({
  weekStart,
  defaultView,
  timeFormat,
  appLocale,
  exporting,
  exportDone,
  onWeekStartChange,
  onDefaultViewChange,
  onTimeFormatChange,
  onAppLocaleChange,
  onExport,
}: {
  weekStart: WeekStart;
  defaultView: DefaultView;
  timeFormat: TimeFormat;
  appLocale: AppLocale;
  exporting: boolean;
  exportDone: boolean;
  onWeekStartChange: (v: WeekStart) => void;
  onDefaultViewChange: (v: DefaultView) => void;
  onTimeFormatChange: (v: TimeFormat) => void;
  onAppLocaleChange: (v: AppLocale) => void;
  onExport: () => void;
}) {
  return (
    <div>
      <SectionHeader
        title="Calendar"
        description="Configure how the calendar looks and behaves."
      />

      <div className="mb-8 flex flex-col gap-3">
        <SettingRow label="Language" hint="Affects date names, month names and UI labels">
          <SegmentedControl
            options={["en", "ru"] as const}
            value={appLocale}
            onChange={onAppLocaleChange}
            labels={{ en: "English", ru: "Русский" }}
          />
        </SettingRow>

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

        <SettingRow label="Time format" hint="24h — Russian style (14:00), 12h — English style (2:00 PM)">
          <SegmentedControl
            options={["24h", "12h"] as const}
            value={timeFormat}
            onChange={onTimeFormatChange}
            labels={{ "24h": "24h (14:00)", "12h": "12h (2:00 PM)" }}
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

// Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ Shortcuts section Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ

// ── Integrations section ───────────────────────────────────────────────────────

const EXAMPLE_COMMANDS = [
  { msg: "Встреча с командой завтра в 14:00 на час", result: "EVENT, завтра 14:00–15:00" },
  { msg: "Задача: сделать PR до пятницы", result: "TASK, пятница, весь день" },
  { msg: "Звонок с клиентом послезавтра в 11:30, 30 мин", result: "EVENT, послезавтра 11:30–12:00" },
  { msg: "/today", result: "Список событий на сегодня" },
];

function IntegrationsSection() {
  const [botToken, setBotToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<{ running: boolean; pid: number | null; logs: string[]; hasBotToken: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function fetchStatus() {
    try {
      const res = await fetch("/api/integrations/telegram");
      const data = await res.json() as typeof status;
      setStatus(data);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    void fetchStatus();
    const interval = setInterval(() => { void fetchStatus(); }, 3000);
    return () => clearInterval(interval);
  }, []);

  async function handleStart() {
    if (!botToken.trim()) {
      setError("Enter the bot token before starting.");
      return;
    }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/integrations/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", botToken: botToken.trim() }),
      });
      const data = await res.json() as { ok?: boolean; error?: { message?: string } };
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to start bot");
      await fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setBusy(true); setError("");
    try {
      await fetch("/api/integrations/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      await fetchStatus();
    } finally {
      setBusy(false);
    }
  }

  const running = status?.running ?? false;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="Integrations"
        description="Connect external services to Dinox."
      />

      {/* Telegram bot card */}
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-5">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <span className="text-2xl">✈️</span>
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--app-text)]">Telegram Bot</h3>
            <p className="text-xs text-[var(--app-muted)]">Create events by sending text messages to your personal bot</p>
          </div>
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            running
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-[var(--app-surface)] text-[var(--app-muted)]"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${running ? "bg-emerald-400 animate-pulse" : "bg-[var(--app-muted)]"}`} />
            {running ? `Running${status?.pid ? ` · PID ${status.pid}` : ""}` : "Stopped"}
          </span>
        </div>

        {/* Step-by-step setup */}
        <div className="mb-5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">Setup guide</p>
          <ol className="flex flex-col gap-2.5">
            {[
              { n: 1, text: "Open Telegram and find", link: "@BotFather", href: "https://t.me/BotFather" },
              { n: 2, text: 'Send the command', code: "/newbot", after: "and follow instructions" },
              { n: 3, text: "Copy the bot token and paste it below" },
              { n: 4, text: "Click Start Bot and open your bot in Telegram" },
            ].map(({ n, text, link, href, code, after }) => (
              <li key={n} className="flex items-start gap-2.5 text-sm text-[var(--app-text)]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--app-accent)] text-[10px] font-bold text-[var(--app-bg)]">{n}</span>
                <span>
                  {text}{" "}
                  {link && href && (
                    <a href={href} target="_blank" rel="noreferrer" className="text-[var(--app-accent)] underline underline-offset-2">{link}</a>
                  )}
                  {code && <code className="mx-1 rounded bg-[var(--app-surface-2)] px-1.5 py-0.5 font-mono text-xs text-[var(--app-accent)]">{code}</code>}
                  {after && ` ${after}`}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Token inputs */}
        <div className="mb-4 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">Bot Token <span className="text-[var(--app-danger)]">*</span></label>
            <div className="flex gap-2">
              <input
                type={showToken ? "text" : "password"}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="1234567890:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="h-10 flex-1 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-3 font-mono text-xs text-[var(--app-text)] placeholder:text-[var(--app-muted)] placeholder:font-sans"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="h-10 w-10 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
              >
                {showToken ? "🙈" : "👁"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-[var(--app-danger)]/10 px-3 py-2 text-xs text-[var(--app-danger)]">{error}</p>
        )}

        {/* Start / Stop */}
        <div className="flex gap-2">
          {!running ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleStart()}
              className="flex-1 rounded-xl bg-[var(--app-accent)] py-2.5 text-sm font-semibold text-[var(--app-bg)] transition hover:bg-[var(--app-accent-strong)] disabled:opacity-50"
            >
              {busy ? "Starting…" : "▶ Start Bot"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleStop()}
              className="flex-1 rounded-xl border border-[var(--app-border-strong)] py-2.5 text-sm font-semibold text-[var(--app-danger)] transition hover:bg-[var(--app-danger)]/10 disabled:opacity-50"
            >
              {busy ? "Stopping…" : "⏹ Stop Bot"}
            </button>
          )}
        </div>

        {/* Log output */}
        {(status?.logs?.length ?? 0) > 0 && (
          <div className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">Bot log</p>
            <div className="max-h-32 overflow-y-auto font-mono text-[10px] leading-relaxed text-[var(--app-muted)]">
              {(status?.logs ?? []).map((line, i) => (
                <div key={i} className={line.startsWith("ERR") ? "text-[var(--app-danger)]" : ""}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* How to use */}
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">How to use</p>
        <p className="mb-3 text-sm text-[var(--app-muted)]">Just send a message to your bot — it will parse the date and add the event to Dinox:</p>
        <div className="flex flex-col gap-2">
          {EXAMPLE_COMMANDS.map(({ msg, result }) => (
            <div key={msg} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5">
              <span className="font-mono text-xs text-[var(--app-text)]">{msg}</span>
              <span className="shrink-0 text-xs text-[var(--app-muted)]">→ {result}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl bg-[var(--app-accent)]/8 p-3 text-xs text-[var(--app-muted)]">
          💡 Works in English and Russian. Date parsing runs locally — no external APIs or paid keys required.
        </div>
      </div>

      {/* ICS Import / Export */}
      <IcsSection />

      {/* Calendar Subscriptions */}
      <SubscriptionsSection />
    </div>
  );
}

// ── ICS Import / Export ──────────────────────────────────────────────────────

function IcsSection() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; errors: string[] } | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleExportIcs() {
    setExporting(true);
    try { await exportIcs(); } finally { setExporting(false); }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const result = await importIcs(text);
      setImportResult(result);
    } catch (err) {
      setImportResult({ created: 0, errors: [err instanceof Error ? err.message : "Import failed"] });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-2xl">📅</span>
        <div>
          <h3 className="font-semibold text-[var(--app-text)]">ICS / iCalendar</h3>
          <p className="text-xs text-[var(--app-muted)]">Compatible with Google, Apple, Yandex and other calendar apps</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={exporting}
          onClick={() => void handleExportIcs()}
          className="flex-1 rounded-xl border border-[var(--app-border-strong)] py-2.5 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)] disabled:opacity-50"
        >
          {exporting ? "Exporting…" : "⬇ Export .ics"}
        </button>
        <label className={`flex-1 cursor-pointer rounded-xl border border-[var(--app-border-strong)] py-2.5 text-center text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)] ${importing ? "opacity-50 pointer-events-none" : ""}`}>
          {importing ? "Importing…" : "⬆ Import .ics"}
          <input type="file" accept=".ics,text/calendar" className="hidden" onChange={handleImportFile} />
        </label>
      </div>

      {importResult && (
        <div className={`mt-3 rounded-xl p-3 text-xs ${importResult.errors.length > 0 ? "bg-[var(--app-danger)]/10 text-[var(--app-danger)]" : "bg-emerald-500/10 text-emerald-400"}`}>
          {importResult.created > 0 && <p>✓ Imported {importResult.created} event{importResult.created !== 1 ? "s" : ""}</p>}
          {importResult.errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}
    </div>
  );
}

// ── Calendar Subscriptions ───────────────────────────────────────────────────

const SUB_COLOR_PRESETS = ["#14b8a6","#3b82f6","#8b5cf6","#ec4899","#f97316","#22c55e","#ef4444","#06b6d4"];

function SubscriptionsSection() {
  const [subs, setSubs] = useState<ApiCalendarSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [addBusy, setAddBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions().then(setSubs).catch(() => setSubs([])).finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!newName.trim() || !newUrl.trim()) return;
    setAddBusy(true);
    try {
      const sub = await createSubscription({ name: newName.trim(), url: newUrl.trim(), color: newColor });
      setSubs((prev) => [...prev, sub]);
      setNewName(""); setNewUrl(""); setNewColor("#3b82f6"); setShowAdd(false);
    } finally { setAddBusy(false); }
  }

  async function handleSync(id: string) {
    setSyncBusy(id);
    try {
      await syncSubscription(id);
      const updated = await fetchSubscriptions();
      setSubs(updated);
    } finally { setSyncBusy(null); }
  }

  async function handleToggle(sub: ApiCalendarSubscription) {
    const updated = await updateSubscription(sub.id, { enabled: !sub.enabled });
    setSubs((prev) => prev.map((s) => s.id === sub.id ? updated : s));
  }

  async function handleDelete(id: string) {
    await deleteSubscription(id);
    setSubs((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔄</span>
          <div>
            <h3 className="font-semibold text-[var(--app-text)]">Calendar subscriptions</h3>
            <p className="text-xs text-[var(--app-muted)]">Subscribe to external ICS feeds (Google, Yandex, corporate)</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-xl border border-[var(--app-border-strong)] px-3 py-1.5 text-xs text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
        >
          + Add
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] p-4">
          <div className="flex flex-col gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name (e.g. Work calendar)"
              className="h-9 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)]"
            />
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="ICS URL (webcal:// or https://...)"
              className="h-9 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 text-sm font-mono text-[var(--app-text)] placeholder:text-[var(--app-muted)] placeholder:font-sans"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--app-muted)]">Color</span>
              <div className="flex gap-1.5">
                {SUB_COLOR_PRESETS.map((c) => (
                  <button
                    key={c} type="button"
                    onClick={() => setNewColor(c)}
                    className="h-5 w-5 rounded-full border-2 transition"
                    style={{ backgroundColor: c, borderColor: newColor === c ? "white" : "transparent" }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={addBusy || !newName.trim() || !newUrl.trim()}
                onClick={() => void handleAdd()}
                className="flex-1 rounded-xl bg-[var(--app-accent)] py-2 text-sm font-semibold text-[var(--app-bg)] disabled:opacity-50"
              >
                {addBusy ? "Adding…" : "Add subscription"}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded-xl border border-[var(--app-border-strong)] px-4 py-2 text-sm text-[var(--app-muted)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-[var(--app-muted)]">Loading…</p>
      ) : subs.length === 0 ? (
        <p className="text-xs text-[var(--app-muted)]">No subscriptions yet. Add a Google/Yandex/corporate ICS feed.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {subs.map((sub) => (
            <div key={sub.id} className="flex items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: sub.color }} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-[var(--app-text)]">{sub.name}</p>
                <p className="truncate text-[10px] text-[var(--app-muted)]">{sub.url}</p>
                {sub.errorMsg && <p className="truncate text-[10px] text-[var(--app-danger)]">{sub.errorMsg}</p>}
                {sub.lastSyncedAt && !sub.errorMsg && (
                  <p className="text-[10px] text-[var(--app-muted)]">
                    Last synced {new Date(sub.lastSyncedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void handleSync(sub.id)}
                disabled={syncBusy === sub.id}
                title="Sync now"
                className="shrink-0 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-accent)] disabled:opacity-50"
              >
                {syncBusy === sub.id ? "⏳" : "↻"}
              </button>
              <button
                type="button"
                onClick={() => void handleToggle(sub)}
                title={sub.enabled ? "Disable" : "Enable"}
                className={`shrink-0 text-xs transition ${sub.enabled ? "text-emerald-400" : "text-[var(--app-muted)]"}`}
              >
                {sub.enabled ? "●" : "○"}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(sub.id)}
                title="Delete"
                className="shrink-0 text-[var(--app-muted)] transition hover:text-[var(--app-danger)] text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

// Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ About section Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ

// ── Reminders section ─────────────────────────────────────────────────────────

const REMINDER_OPTIONS = [1, 5, 10, 15, 30, 60] as const;

function RemindersSection({
  settings,
  onChange,
}: {
  settings: ReminderSettings;
  onChange: (s: ReminderSettings) => void;
}) {
  const [permStatus, setPermStatus] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof Notification === "undefined") { setPermStatus("unsupported"); return; }
    setPermStatus(Notification.permission);
  }, []);

  function requestPermission() {
    void Notification.requestPermission().then((p) => setPermStatus(p));
  }

  function toggleThreshold(min: number) {
    const cur = settings.minutesBefore;
    const next = cur.includes(min) ? cur.filter((m) => m !== min) : [...cur, min].sort((a, b) => a - b);
    onChange({ ...settings, minutesBefore: next });
  }

  const permBadge =
    permStatus === "granted"
      ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">Allowed</span>
      : permStatus === "denied"
      ? <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">Blocked</span>
      : permStatus === "unsupported"
      ? <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-xs font-medium text-[var(--app-muted)]">Not supported</span>
      : <button type="button" onClick={requestPermission}
          className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400 hover:bg-amber-500/25 transition">
          Click to allow
        </button>;

  return (
    <div>
      <SectionHeader
        title="Reminders"
        description="Get desktop notifications before events and tasks start."
      />

      <div className="flex flex-col gap-3">
        {/* Enable toggle */}
        <SettingRow
          label="Desktop notifications"
          hint="Show a system notification before events begin"
        >
          <div className="flex items-center gap-2">
            {permBadge}
            <button
              type="button"
              onClick={() => onChange({ ...settings, enabled: !settings.enabled })}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                settings.enabled ? "bg-[var(--app-accent)]" : "bg-[var(--app-border-strong)]"
              }`}
              role="switch"
              aria-checked={settings.enabled}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ${
                  settings.enabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </SettingRow>

        {/* Threshold chips */}
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-3">
          <p className="mb-2 text-sm text-[var(--app-text)]">Notify me before</p>
          <p className="mb-3 text-xs text-[var(--app-muted)]">Select one or more time offsets</p>
          <div className="flex flex-wrap gap-2">
            {REMINDER_OPTIONS.map((min) => {
              const active = settings.minutesBefore.includes(min);
              const label = min < 60 ? `${min} min` : `${min / 60}h`;
              return (
                <button
                  key={min}
                  type="button"
                  onClick={() => toggleThreshold(min)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                  style={{
                    backgroundColor: active ? "var(--app-accent)" : "var(--app-surface)",
                    color: active ? "var(--app-bg)" : "var(--app-muted)",
                    border: `1px solid ${active ? "var(--app-accent)" : "var(--app-border-strong)"}`,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {settings.minutesBefore.length === 0 && (
            <p className="mt-2 text-[11px] text-amber-400">Select at least one time offset to receive reminders.</p>
          )}
        </div>

        {/* Status */}
        {permStatus === "denied" && (
          <div className="rounded-xl border border-red-800/40 bg-red-950/20 px-4 py-3">
            <p className="text-xs text-red-400">
              Notifications are blocked in your browser or OS settings. To enable them, open your system notification settings and allow Dinox.
            </p>
          </div>
        )}

        {permStatus === "granted" && settings.enabled && settings.minutesBefore.length > 0 && (
          <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/10 px-4 py-3 flex items-center gap-2">
            <span className="text-base">🔔</span>
            <p className="text-xs text-emerald-400">
              Reminders active — you&apos;ll be notified {settings.minutesBefore.map((m) => m < 60 ? `${m} min` : `${m / 60}h`).join(", ")} before events.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

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

      <div className="mt-6 border-t border-[var(--app-border)] pt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">
          Developer
        </p>
        <div className="flex flex-col gap-3">
          <SettingRow label="Author" hint="Creator of Dinox">
            <span className="text-sm text-[var(--app-text)]">JapanDino</span>
          </SettingRow>
          <SettingRow label="Telegram" hint="Reach out or follow updates">
            <a
              href="https://t.me/JapanDino"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--app-accent)] hover:underline"
            >
              t.me/JapanDino
            </a>
          </SettingRow>
        </div>
      </div>
    </div>
  );
}
