import { NextRequest } from "next/server";
import { prisma } from "@/src/data/prisma/client";
import { mapCalendarSubscription } from "@/src/data/prisma/mappers";
import { handleRouteError, jsonResponse } from "../../_lib/http";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    const payload = (await request.json()) as {
      name?: unknown;
      url?: unknown;
      color?: unknown;
      enabled?: unknown;
    };

    const sub = await prisma.calendarSubscription.update({
      where: { id },
      data: {
        ...(typeof payload.name === "string" && { name: payload.name.trim() }),
        ...(typeof payload.url === "string" && { url: payload.url.trim() }),
        ...(typeof payload.color === "string" && { color: payload.color }),
        ...(typeof payload.enabled === "boolean" && { enabled: payload.enabled }),
      },
    });

    return jsonResponse({ data: mapCalendarSubscription(sub) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;

    // Delete all synced items from this subscription
    await prisma.item.deleteMany({
      where: { externalSource: `ical:${id}` },
    });

    await prisma.calendarSubscription.delete({ where: { id } });

    return jsonResponse({ data: { ok: true } });
  } catch (error) {
    return handleRouteError(error);
  }
}
