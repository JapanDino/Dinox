export const PREFS_WEEK_START_KEY = "dinox:week-start";
export const PREFS_DEFAULT_VIEW_KEY = "dinox:default-view";
export const PREFS_TIME_FORMAT_KEY = "dinox:time-format";

export type WeekStart = "monday" | "sunday";
export type DefaultView = "month" | "week" | "day" | "agenda";
export type TimeFormat = "24h" | "12h";

export function loadPrefs(): { weekStart: WeekStart; defaultView: DefaultView; timeFormat: TimeFormat } {
  if (typeof window === "undefined") {
    return { weekStart: "monday", defaultView: "month", timeFormat: "24h" };
  }

  const ws = localStorage.getItem(PREFS_WEEK_START_KEY);
  const dv = localStorage.getItem(PREFS_DEFAULT_VIEW_KEY);
  const tf = localStorage.getItem(PREFS_TIME_FORMAT_KEY);

  return {
    weekStart: ws === "sunday" ? "sunday" : "monday",
    defaultView: (["month", "week", "day", "agenda"].includes(dv ?? "")
      ? dv
      : "month") as DefaultView,
    timeFormat: tf === "12h" ? "12h" : "24h",
  };
}
