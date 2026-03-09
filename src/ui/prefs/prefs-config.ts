export const PREFS_WEEK_START_KEY = "dinox:week-start";
export const PREFS_DEFAULT_VIEW_KEY = "dinox:default-view";

export type WeekStart = "monday" | "sunday";
export type DefaultView = "month" | "week" | "day" | "agenda";

export function loadPrefs(): { weekStart: WeekStart; defaultView: DefaultView } {
  if (typeof window === "undefined") {
    return { weekStart: "monday", defaultView: "month" };
  }

  const ws = localStorage.getItem(PREFS_WEEK_START_KEY);
  const dv = localStorage.getItem(PREFS_DEFAULT_VIEW_KEY);

  return {
    weekStart: ws === "sunday" ? "sunday" : "monday",
    defaultView: (["month", "week", "day", "agenda"].includes(dv ?? "")
      ? dv
      : "month") as DefaultView,
  };
}
