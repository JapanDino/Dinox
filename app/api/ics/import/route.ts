import { NextRequest } from "next/server";
import { itemService } from "@/src/app-services/container";
import { handleRouteError, jsonResponse } from "../../_lib/http";
import { parseIcs } from "../../_lib/ics";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const payload = (await request.json()) as { icsText?: unknown };

    if (typeof payload.icsText !== "string" || !payload.icsText.trim()) {
      return jsonResponse({ error: { code: "VALIDATION_ERROR", message: "icsText must be a non-empty string." } }, 400);
    }

    const { events, errors } = parseIcs(payload.icsText);
    let created = 0;

    for (const ev of events) {
      try {
        await itemService.createItem({
          title: ev.summary,
          description: ev.description ?? null,
          startAt: ev.dtstart.toISOString(),
          endAt: ev.dtend.toISOString(),
          allDay: ev.allDay,
          status: ev.status === "CANCELLED" ? "CANCELLED" : "TODO",
          links: ev.url ? [{ url: ev.url }] : null,
          externalSource: "ics-import",
          externalId: ev.uid,
        });
        created++;
      } catch (err) {
        errors.push(
          `Failed to create item uid=${ev.uid}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return jsonResponse({ data: { created, errors } });
  } catch (error) {
    return handleRouteError(error);
  }
}
