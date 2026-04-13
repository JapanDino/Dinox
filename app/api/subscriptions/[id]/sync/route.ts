import { NextRequest } from "next/server";
import { prisma } from "@/src/data/prisma/client";
import { handleRouteError, jsonResponse } from "../../../_lib/http";
import { parseIcs } from "../../../_lib/ics";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  try {
    const sub = await prisma.calendarSubscription.findUnique({ where: { id } });
    if (!sub) {
      return jsonResponse({ error: { message: "Subscription not found." } }, 404);
    }

    // Fetch the ICS feed
    const fetchRes = await fetch(sub.url, {
      headers: { "User-Agent": "Dinox-Calendar/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!fetchRes.ok) {
      throw new Error(`Failed to fetch ICS: HTTP ${fetchRes.status}`);
    }
    const icsText = await fetchRes.text();

    const { events } = parseIcs(icsText);
    const externalSource = `ical:${id}`;
    const incomingUids = new Set(events.map((e) => e.uid));

    let created = 0;
    let updated = 0;

    for (const ev of events) {
      const existing = await prisma.item.findFirst({
        where: { externalSource, externalId: ev.uid },
      });

      const linksJson = ev.url ? JSON.stringify([{ url: ev.url }]) : null;

      if (existing) {
        await prisma.item.update({
          where: { id: existing.id },
          data: {
            title: ev.summary,
            description: ev.description,
            startAt: ev.dtstart,
            endAt: ev.dtend,
            allDay: ev.allDay,
            status: ev.status === "CANCELLED" ? "CANCELLED" : existing.status,
            links: linksJson,
          },
        });
        updated++;
      } else {
        await prisma.item.create({
          data: {
            title: ev.summary,
            description: ev.description,
            startAt: ev.dtstart,
            endAt: ev.dtend,
            allDay: ev.allDay,
            status: ev.status === "CANCELLED" ? "CANCELLED" : "TODO",
            kind: "EVENT",
            links: linksJson,
            externalSource,
            externalId: ev.uid,
          },
        });
        created++;
      }
    }

    // Delete events no longer in the feed
    const deleted = await prisma.item.deleteMany({
      where: {
        externalSource,
        externalId: { notIn: Array.from(incomingUids) },
      },
    });

    await prisma.calendarSubscription.update({
      where: { id },
      data: { lastSyncedAt: new Date(), errorMsg: null },
    });

    return jsonResponse({
      data: {
        synced: events.length,
        created,
        updated,
        deleted: deleted.count,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await prisma.calendarSubscription.update({
      where: { id },
      data: { errorMsg: msg },
    }).catch(() => {/* ignore if sub was deleted */});
    return handleRouteError(error);
  }
}
