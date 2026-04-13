import { NextRequest } from "next/server";
import { prisma } from "@/src/data/prisma/client";
import { mapCalendarSubscription } from "@/src/data/prisma/mappers";
import { handleRouteError, jsonResponse } from "../_lib/http";

export async function GET(): Promise<Response> {
  try {
    const subs = await prisma.calendarSubscription.findMany({
      orderBy: { createdAt: "asc" },
    });

    return jsonResponse({ data: subs.map(mapCalendarSubscription) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const payload = (await request.json()) as {
      name?: unknown;
      url?: unknown;
      color?: unknown;
      enabled?: unknown;
    };

    if (typeof payload.name !== "string" || !payload.name.trim()) {
      return jsonResponse({ error: { code: "VALIDATION_ERROR", message: "name is required." } }, 400);
    }

    if (typeof payload.url !== "string" || !payload.url.trim()) {
      return jsonResponse({ error: { code: "VALIDATION_ERROR", message: "url is required." } }, 400);
    }

    const sub = await prisma.calendarSubscription.create({
      data: {
        name: payload.name.trim(),
        url: payload.url.trim(),
        color: typeof payload.color === "string" ? payload.color : "#14b8a6",
        enabled: typeof payload.enabled === "boolean" ? payload.enabled : true,
      },
    });

    return jsonResponse({ data: mapCalendarSubscription(sub) }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
