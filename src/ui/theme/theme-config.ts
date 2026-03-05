export type ThemeMode = "dark" | "light" | "custom";

export type ThemeTokens = {
  appBg: string;
  appSurface: string;
  appSurface2: string;
  appBorder: string;
  appBorderStrong: string;
  appText: string;
  appMuted: string;
  appAccent: string;
  appAccentStrong: string;
  appDanger: string;
  appWarning: string;
  appOffRangeBg: string;
  appOffRangeText: string;
  appSubtleText: string;
  appScrollbar: string;
  appTodayBg: string;
};

export const THEME_STORAGE_KEY = "dinox:theme-mode";
export const CUSTOM_THEME_STORAGE_KEY = "dinox:custom-theme";

export const DARK_THEME: ThemeTokens = {
  appBg: "#07090f",
  appSurface: "#10141e",
  appSurface2: "#141a27",
  appBorder: "#1d2434",
  appBorderStrong: "#2a3348",
  appText: "#e5e7eb",
  appMuted: "#9aa4b3",
  appAccent: "#14b8a6",
  appAccentStrong: "#0f766e",
  appDanger: "#f87171",
  appWarning: "#fbbf24",
  appOffRangeBg: "#0b0f17",
  appOffRangeText: "#5b6677",
  appSubtleText: "#6f7a8f",
  appScrollbar: "#334155",
  appTodayBg: "#143b3a",
};

export const LIGHT_THEME: ThemeTokens = {
  appBg: "#eef3fb",
  appSurface: "#f8fbff",
  appSurface2: "#ffffff",
  appBorder: "#d8e2f1",
  appBorderStrong: "#c2d0e3",
  appText: "#142033",
  appMuted: "#54627a",
  appAccent: "#0ea5a4",
  appAccentStrong: "#0b7f7d",
  appDanger: "#dc2626",
  appWarning: "#d97706",
  appOffRangeBg: "#e8eef8",
  appOffRangeText: "#8ca0bc",
  appSubtleText: "#7184a1",
  appScrollbar: "#a8b7cc",
  appTodayBg: "#d8f2ef",
};

export const TOKEN_LABELS: Record<keyof ThemeTokens, string> = {
  appBg: "Background",
  appSurface: "Surface",
  appSurface2: "Surface Alt",
  appBorder: "Border",
  appBorderStrong: "Border Strong",
  appText: "Text",
  appMuted: "Muted Text",
  appAccent: "Accent",
  appAccentStrong: "Accent Hover",
  appDanger: "Danger",
  appWarning: "Warning",
  appOffRangeBg: "Off Range Bg",
  appOffRangeText: "Off Range Text",
  appSubtleText: "Subtle Text",
  appScrollbar: "Scrollbar",
  appTodayBg: "Today Cell",
};

const TOKEN_CSS_VARS: Record<keyof ThemeTokens, string> = {
  appBg: "--app-bg",
  appSurface: "--app-surface",
  appSurface2: "--app-surface-2",
  appBorder: "--app-border",
  appBorderStrong: "--app-border-strong",
  appText: "--app-text",
  appMuted: "--app-muted",
  appAccent: "--app-accent",
  appAccentStrong: "--app-accent-strong",
  appDanger: "--app-danger",
  appWarning: "--app-warning",
  appOffRangeBg: "--app-off-range-bg",
  appOffRangeText: "--app-off-range-text",
  appSubtleText: "--app-subtle-text",
  appScrollbar: "--app-scrollbar",
  appTodayBg: "--app-today-bg",
};

export function applyThemeTokens(tokens: ThemeTokens) {
  const root = document.documentElement;
  (Object.keys(TOKEN_CSS_VARS) as Array<keyof ThemeTokens>).forEach((key) => {
    root.style.setProperty(TOKEN_CSS_VARS[key], tokens[key]);
  });
}

export function parseStoredTheme(raw: string | null): ThemeTokens {
  if (!raw) {
    return { ...DARK_THEME };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ThemeTokens>;
    return { ...DARK_THEME, ...parsed };
  } catch {
    return { ...DARK_THEME };
  }
}

export function resolveTheme(mode: ThemeMode, custom: ThemeTokens): ThemeTokens {
  if (mode === "light") {
    return LIGHT_THEME;
  }

  if (mode === "custom") {
    return custom;
  }

  return DARK_THEME;
}

export function loadStoredThemeState(): { mode: ThemeMode; customTheme: ThemeTokens } {
  if (typeof window === "undefined") {
    return { mode: "dark", customTheme: { ...DARK_THEME } };
  }

  const storedMode = localStorage.getItem(THEME_STORAGE_KEY);
  const mode: ThemeMode =
    storedMode === "light" || storedMode === "custom" || storedMode === "dark"
      ? storedMode
      : "dark";

  return {
    mode,
    customTheme: parseStoredTheme(localStorage.getItem(CUSTOM_THEME_STORAGE_KEY)),
  };
}