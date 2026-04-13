/**
 * Shared ICS (iCalendar) helpers — parsing and generation.
 */

export interface IcsEvent {
  uid: string;
  summary: string;
  description: string | null;
  dtstart: Date;
  dtend: Date;
  allDay: boolean;
  url: string | null;
  status: "CONFIRMED" | "CANCELLED";
}

// ---------------------------------------------------------------------------
// Escaping
// ---------------------------------------------------------------------------

/** Escape a plain-text value for use inside an ICS property value. */
export function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Parse an ICS datetime value (DTSTART / DTEND) into a JS Date. */
function parseIcsDate(value: string, params: string): { date: Date; allDay: boolean } {
  // VALUE=DATE → YYYYMMDD
  if (params.includes("VALUE=DATE") || /^\d{8}$/.test(value)) {
    const y = parseInt(value.slice(0, 4), 10);
    const m = parseInt(value.slice(4, 6), 10) - 1;
    const d = parseInt(value.slice(6, 8), 10);
    return { date: new Date(y, m, d), allDay: true };
  }

  // UTC: YYYYMMDDTHHmmssZ
  if (value.endsWith("Z")) {
    return { date: new Date(value.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, "$1-$2-$3T$4:$5:$6Z")), allDay: false };
  }

  // Local: YYYYMMDDTHHmmss
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (match) {
    const [, yr, mo, dy, hr, min, sec] = match;
    return { date: new Date(+yr, +mo - 1, +dy, +hr, +min, +sec), allDay: false };
  }

  // Fallback
  return { date: new Date(value), allDay: false };
}

/** Extract VEVENTS from raw ICS text and return parsed IcsEvent objects. */
export function parseIcs(icsText: string): { events: IcsEvent[]; errors: string[] } {
  const events: IcsEvent[] = [];
  const errors: string[] = [];

  // Unfold lines (RFC 5545 §3.1)
  const unfolded = icsText.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  let inEvent = false;
  let props: Record<string, { value: string; params: string }> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      props = {};
      continue;
    }

    if (line === "END:VEVENT") {
      inEvent = false;

      try {
        const uid = props["UID"]?.value ?? "";
        if (!uid) {
          errors.push("Skipped VEVENT: missing UID");
          continue;
        }

        const summary = props["SUMMARY"]?.value ?? "(no title)";
        const description = props["DESCRIPTION"]?.value ?? null;
        const urlVal = props["URL"]?.value ?? null;

        const dtStartRaw = props["DTSTART"];
        const dtEndRaw = props["DTEND"];

        if (!dtStartRaw) {
          errors.push(`Skipped VEVENT uid=${uid}: missing DTSTART`);
          continue;
        }

        const { date: dtstart, allDay } = parseIcsDate(dtStartRaw.value, dtStartRaw.params);

        let dtend: Date;
        if (dtEndRaw) {
          dtend = parseIcsDate(dtEndRaw.value, dtEndRaw.params).date;
        } else if (allDay) {
          // Default duration 1 day for all-day events
          dtend = new Date(dtstart);
          dtend.setDate(dtend.getDate() + 1);
        } else {
          // Default duration 0 — set dtend = dtstart + 1 hour
          dtend = new Date(dtstart.getTime() + 60 * 60 * 1000);
        }

        // Ensure dtend > dtstart (avoid empty-range issues)
        if (dtend.getTime() <= dtstart.getTime()) {
          dtend = new Date(dtstart.getTime() + (allDay ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000));
        }

        const icsStatus = props["STATUS"]?.value?.toUpperCase() ?? "CONFIRMED";
        const status: "CONFIRMED" | "CANCELLED" = icsStatus === "CANCELLED" ? "CANCELLED" : "CONFIRMED";

        // Unescape ICS text fields
        const unescape = (s: string) =>
          s.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");

        events.push({
          uid,
          summary: unescape(summary),
          description: description ? unescape(description) : null,
          dtstart,
          dtend,
          allDay,
          url: urlVal,
          status,
        });
      } catch (err) {
        errors.push(`Failed to parse VEVENT: ${err instanceof Error ? err.message : String(err)}`);
      }
      continue;
    }

    if (inEvent) {
      // Parse property line: NAME;PARAMS:VALUE
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;

      const keyPart = line.slice(0, colonIdx);
      const value = line.slice(colonIdx + 1);
      const semicolonIdx = keyPart.indexOf(";");
      const name = semicolonIdx === -1 ? keyPart : keyPart.slice(0, semicolonIdx);
      const params = semicolonIdx === -1 ? "" : keyPart.slice(semicolonIdx + 1);

      props[name.toUpperCase()] = { value, params };
    }
  }

  return { events, errors };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

function formatIcsDate(date: Date, allDay: boolean): string {
  if (allDay) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  }
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Wrap long ICS lines at 75 octets (RFC 5545 §3.1). */
function foldLine(line: string): string {
  const maxLen = 75;
  if (line.length <= maxLen) return line;
  const parts: string[] = [];
  let pos = 0;
  parts.push(line.slice(0, maxLen));
  pos = maxLen;
  while (pos < line.length) {
    parts.push(" " + line.slice(pos, pos + maxLen - 1));
    pos += maxLen - 1;
  }
  return parts.join("\r\n");
}

export interface GenerateIcsOptions {
  events: Array<{
    uid: string;
    summary: string;
    description: string | null;
    dtstart: Date;
    dtend: Date;
    allDay: boolean;
    url: string | null;
    status: "CONFIRMED" | "CANCELLED";
  }>;
  prodId?: string;
}

export function generateIcs({ events, prodId = "-//Dinox//Dinox//EN" }: GenerateIcsOptions): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    foldLine(`PRODID:${prodId}`),
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(foldLine(`UID:${ev.uid}`));

    const now = formatIcsDate(new Date(), false);
    lines.push(`DTSTAMP:${now}`);

    if (ev.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(ev.dtstart, true)}`);
      // RFC 5545: DTEND for DATE is exclusive, so add 1 day
      const endPlusOne = new Date(ev.dtend);
      endPlusOne.setDate(endPlusOne.getDate() + 1);
      lines.push(`DTEND;VALUE=DATE:${formatIcsDate(endPlusOne, true)}`);
    } else {
      lines.push(`DTSTART:${formatIcsDate(ev.dtstart, false)}`);
      lines.push(`DTEND:${formatIcsDate(ev.dtend, false)}`);
    }

    lines.push(foldLine(`SUMMARY:${icsEscape(ev.summary)}`));

    if (ev.description) {
      lines.push(foldLine(`DESCRIPTION:${icsEscape(ev.description)}`));
    }

    lines.push(`STATUS:${ev.status}`);

    if (ev.url) {
      lines.push(foldLine(`URL:${ev.url}`));
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n") + "\r\n";
}
