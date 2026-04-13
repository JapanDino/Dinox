import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { itemService } from "@/src/app-services/container";
import { handleRouteError, jsonResponse } from "../_lib/http";
import { readMultiValue, readOptionalString } from "../_lib/parsers";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams;

    const items = await itemService.listItems({
      projectIds: readMultiValue(searchParams, "projectId"),
      tagIds: readMultiValue(searchParams, "tagId"),
      statuses: readMultiValue(searchParams, "status"),
      query: readOptionalString(searchParams, "query"),
      rangeStart: readOptionalString(searchParams, "rangeStart"),
      rangeEnd: readOptionalString(searchParams, "rangeEnd"),
    });

    return jsonResponse({ data: items });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const payload = (await request.json()) as Record<string, unknown>;

    if (payload.recurrenceRule && typeof payload.recurrenceRule === "string") {
      // Expand and create all instances
      const { expandRule, parseRule } = await import("@/src/ui/calendar/recurrence-utils");
      const rule = parseRule(payload.recurrenceRule);
      if (!rule) {
        return jsonResponse({ error: { message: "Invalid recurrenceRule" } }, 400);
      }
      const start = new Date(payload.startAt as string);
      const end = new Date(payload.endAt as string);
      const occurrences = expandRule(start, end, rule);
      const seriesId = crypto.randomUUID();

      const items = await Promise.all(
        occurrences.map((occ) =>
          itemService.createItem({
            ...payload,
            startAt: occ.startAt,
            endAt: occ.endAt,
            seriesId,
            recurrenceRule: payload.recurrenceRule as string,
          })
        )
      );

      revalidatePath("/");
      return jsonResponse({ data: items[0] }, 201);
    }

    const item = await itemService.createItem(payload);

    revalidatePath("/");

    return jsonResponse({ data: item }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
