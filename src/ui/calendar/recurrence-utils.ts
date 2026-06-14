export type RFreq = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type RDay = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";

export interface ParsedRule {
  freq: RFreq;
  interval: number;
  byDay: RDay[];
  byMonthDay?: number;
  count?: number;
  until?: string;
}

const VALID_FREQS: RFreq[] = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
const VALID_DAYS: RDay[] = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const DAY_TO_INDEX: Record<RDay, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const DAY_LABELS: Record<RDay, string> = {
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
  SU: "Sun",
};

function clampPositive(value: number, fallback: number, max = 999) {
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.min(max, Math.floor(value));
}

function parseUntil(value: string | undefined): Date | null {
  if (!value) return null;
  if (/^\d{8}$/.test(value)) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6)) - 1;
    const d = Number(value.slice(6, 8));
    const date = new Date(y, m, d, 23, 59, 59, 999);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatUntilForStorage(value: string) {
  return value.replaceAll("-", "");
}

function formatUntilForLabel(value: string) {
  const date = parseUntil(value);
  if (!date) return value;
  return date.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}

function isOnOrBeforeUntil(candidate: Date, until: Date | null) {
  return !until || candidate.getTime() <= until.getTime();
}

function addMonthsKeepingDay(date: Date, months: number, day: number) {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

export function serializeRule(r: ParsedRule): string {
  const parts = [`FREQ=${r.freq}`, `INTERVAL=${clampPositive(r.interval, 1)}`];
  if (r.byDay.length > 0) parts.push(`BYDAY=${r.byDay.join(",")}`);
  if (r.byMonthDay) parts.push(`BYMONTHDAY=${clampPositive(r.byMonthDay, 1, 31)}`);
  if (r.until) {
    parts.push(`UNTIL=${formatUntilForStorage(r.until)}`);
  } else if (r.count) {
    parts.push(`COUNT=${clampPositive(r.count, 1, 730)}`);
  }
  return parts.join(";");
}

export function parseRule(raw: string | null | undefined): ParsedRule | null {
  if (!raw) return null;
  const map: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const [k, v] = part.split("=");
    if (k && v !== undefined) map[k] = v;
  }

  const freq = map["FREQ"] as RFreq;
  if (!VALID_FREQS.includes(freq)) return null;

  const byDay = map["BYDAY"]
    ? map["BYDAY"].split(",").filter((day): day is RDay => VALID_DAYS.includes(day as RDay))
    : [];
  const count = map["COUNT"] ? clampPositive(parseInt(map["COUNT"], 10), 1, 730) : undefined;
  const byMonthDay = map["BYMONTHDAY"]
    ? clampPositive(parseInt(map["BYMONTHDAY"], 10), 1, 31)
    : undefined;

  return {
    freq,
    interval: clampPositive(parseInt(map["INTERVAL"] ?? "1", 10), 1),
    byDay,
    byMonthDay,
    count,
    until: map["UNTIL"],
  };
}

export function expandRule(
  start: Date,
  end: Date,
  rule: ParsedRule
): Array<{ startAt: Date; endAt: Date }> {
  const duration = Math.max(60_000, end.getTime() - start.getTime());
  const results: Array<{ startAt: Date; endAt: Date }> = [];
  const max = Math.min(rule.count ?? 730, 730);
  const until = parseUntil(rule.until);

  function pushCandidate(candidate: Date) {
    if (candidate < start || !isOnOrBeforeUntil(candidate, until) || results.length >= max) return;
    results.push({ startAt: new Date(candidate), endAt: new Date(candidate.getTime() + duration) });
  }

  if (rule.freq === "WEEKLY" && rule.byDay.length > 0) {
    const targetDays = rule.byDay.map((day) => DAY_TO_INDEX[day]).sort((a, b) => a - b);
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(start.getHours(), start.getMinutes(), 0, 0);

    let weekOffset = 0;
    while (results.length < max && weekOffset <= 500) {
      for (const day of targetDays) {
        const candidate = new Date(weekStart);
        candidate.setDate(weekStart.getDate() + weekOffset * 7 * rule.interval + day);
        pushCandidate(candidate);
      }
      const nextWeek = new Date(weekStart);
      nextWeek.setDate(weekStart.getDate() + (weekOffset + 1) * 7 * rule.interval);
      if (until && nextWeek > until && results.length > 0) break;
      weekOffset++;
    }
    return results;
  }

  const cursor = new Date(start);
  const monthDay = rule.byMonthDay ?? start.getDate();
  while (results.length < max && isOnOrBeforeUntil(cursor, until)) {
    pushCandidate(cursor);
    if (rule.freq === "DAILY") {
      cursor.setDate(cursor.getDate() + rule.interval);
    } else if (rule.freq === "WEEKLY") {
      cursor.setDate(cursor.getDate() + 7 * rule.interval);
    } else if (rule.freq === "MONTHLY") {
      const next = addMonthsKeepingDay(cursor, rule.interval, monthDay);
      cursor.setTime(next.getTime());
    } else if (rule.freq === "YEARLY") {
      const next = new Date(cursor);
      next.setFullYear(cursor.getFullYear() + rule.interval);
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(rule.byMonthDay ?? start.getDate(), lastDay));
      cursor.setTime(next.getTime());
    }
  }

  return results;
}

export function ruleLabel(raw: string | null | undefined): string {
  const r = parseRule(raw);
  if (!r) return "Does not repeat";

  const suffix = r.until
    ? `until ${formatUntilForLabel(r.until)}`
    : r.count
      ? `${r.count} ${r.count === 1 ? "time" : "times"}`
      : "forever";
  const withEnd = (label: string) => `${label} · ${suffix}`;

  if (r.freq === "DAILY" && r.interval === 1) return withEnd("Every day");
  if (r.freq === "DAILY") return withEnd(`Every ${r.interval} days`);

  if (r.freq === "WEEKLY" && r.byDay.length > 0) {
    const days = r.byDay.map((day) => DAY_LABELS[day]).join(", ");
    return withEnd(r.interval === 1 ? `Weekly on ${days}` : `Every ${r.interval} weeks on ${days}`);
  }
  if (r.freq === "WEEKLY") return withEnd(r.interval === 1 ? "Every week" : `Every ${r.interval} weeks`);

  if (r.freq === "MONTHLY") {
    const base = r.byMonthDay
      ? `${r.interval === 1 ? "Monthly" : `Every ${r.interval} months`} on day ${r.byMonthDay}`
      : r.interval === 1 ? "Every month" : `Every ${r.interval} months`;
    return withEnd(base);
  }

  if (r.freq === "YEARLY") {
    const base = r.byMonthDay
      ? `${r.interval === 1 ? "Yearly" : `Every ${r.interval} years`} on day ${r.byMonthDay}`
      : r.interval === 1 ? "Every year" : `Every ${r.interval} years`;
    return withEnd(base);
  }

  return "Custom";
}
