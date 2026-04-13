export type RFreq = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type RDay = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";

export interface ParsedRule {
  freq: RFreq;
  interval: number;
  byDay: RDay[];     // for WEEKLY: which days
  count: number;     // max occurrences (default 52)
}

// Serialize to stored string
export function serializeRule(r: ParsedRule): string {
  const parts = [`FREQ=${r.freq}`, `INTERVAL=${r.interval}`];
  if (r.byDay.length > 0) parts.push(`BYDAY=${r.byDay.join(",")}`);
  parts.push(`COUNT=${r.count}`);
  return parts.join(";");
}

// Parse from stored string — returns null if invalid
export function parseRule(raw: string | null | undefined): ParsedRule | null {
  if (!raw) return null;
  const map: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const [k, v] = part.split("=");
    if (k && v !== undefined) map[k] = v;
  }
  const freq = map["FREQ"] as RFreq;
  if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) return null;
  return {
    freq,
    interval: parseInt(map["INTERVAL"] ?? "1", 10) || 1,
    byDay: map["BYDAY"] ? (map["BYDAY"].split(",") as RDay[]) : [],
    count: parseInt(map["COUNT"] ?? "52", 10) || 52,
  };
}

// Generate { startAt, endAt } pairs for each occurrence
export function expandRule(
  start: Date,
  end: Date,
  rule: ParsedRule
): Array<{ startAt: Date; endAt: Date }> {
  const duration = end.getTime() - start.getTime();
  const results: Array<{ startAt: Date; endAt: Date }> = [];
  const max = Math.min(rule.count, 730); // hard cap 2 years of daily

  if (rule.freq === "WEEKLY" && rule.byDay.length > 0) {
    const DAY_MAP: Record<RDay, number> = {
      SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
    };
    const targetDays = rule.byDay.map((d) => DAY_MAP[d]).sort((a, b) => a - b);
    const weekStart = new Date(start);
    // go back to Sunday of start week
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(start.getHours(), start.getMinutes(), 0, 0);

    let weekOffset = 0;
    while (results.length < max) {
      for (const day of targetDays) {
        const candidate = new Date(weekStart);
        candidate.setDate(weekStart.getDate() + weekOffset * 7 * rule.interval + day);
        if (candidate < start) continue; // skip days before original start
        if (results.length >= max) break;
        const s = new Date(candidate);
        s.setHours(start.getHours(), start.getMinutes(), 0, 0);
        results.push({ startAt: s, endAt: new Date(s.getTime() + duration) });
      }
      weekOffset++;
      if (weekOffset > 500) break; // safety
    }
  } else {
    const cursor = new Date(start);
    while (results.length < max) {
      results.push({ startAt: new Date(cursor), endAt: new Date(cursor.getTime() + duration) });
      if (rule.freq === "DAILY") {
        cursor.setDate(cursor.getDate() + rule.interval);
      } else if (rule.freq === "WEEKLY") {
        cursor.setDate(cursor.getDate() + 7 * rule.interval);
      } else if (rule.freq === "MONTHLY") {
        cursor.setMonth(cursor.getMonth() + rule.interval);
      } else if (rule.freq === "YEARLY") {
        cursor.setFullYear(cursor.getFullYear() + rule.interval);
      }
    }
  }
  return results;
}

// Human-readable label
export function ruleLabel(raw: string | null | undefined): string {
  const r = parseRule(raw);
  if (!r) return "Does not repeat";
  const dayNames: Record<RDay, string> = {
    MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat", SU: "Sun",
  };
  if (r.freq === "DAILY" && r.interval === 1) return "Every day";
  if (r.freq === "DAILY") return `Every ${r.interval} days`;
  if (r.freq === "WEEKLY" && r.interval === 1 && r.byDay.length === 0) return "Every week";
  if (r.freq === "WEEKLY" && r.byDay.length > 0) {
    const days = r.byDay.map((d) => dayNames[d]).join(", ");
    return r.interval === 1 ? `Weekly on ${days}` : `Every ${r.interval} weeks on ${days}`;
  }
  if (r.freq === "MONTHLY" && r.interval === 1) return "Every month";
  if (r.freq === "MONTHLY") return `Every ${r.interval} months`;
  if (r.freq === "YEARLY") return "Every year";
  return "Custom";
}
