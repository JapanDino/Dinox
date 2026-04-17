import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/src/data/prisma/client";
import { handleRouteError, jsonResponse } from "../../../_lib/http";

interface RouteContext {
  params: Promise<{ seriesId: string }>;
}

export async function DELETE(_req: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { seriesId } = await context.params;
    await prisma.item.deleteMany({ where: { seriesId } });
    revalidatePath("/");
    return jsonResponse({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { seriesId } = await context.params;
    const body = (await req.json()) as Record<string, unknown>;
    // Only allow updating safe scalar fields across the series
    const allowed = ["title", "description", "color", "allDay", "kind", "status", "projectId", "recurrenceRule"] as const;
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }

    // Wrap all series mutations in a transaction so a partial failure
    // (e.g. crash mid-loop while updating tags) never leaves the series
    // in an inconsistent state where some items have new tags and others don't.
    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.item.updateMany({ where: { seriesId }, data });
      }
      // Handle tags if provided
      if (Array.isArray(body.tagIds)) {
        const seriesItems = await tx.item.findMany({ where: { seriesId }, select: { id: true } });
        for (const item of seriesItems) {
          await tx.itemTag.deleteMany({ where: { itemId: item.id } });
          if ((body.tagIds as string[]).length > 0) {
            await tx.itemTag.createMany({
              data: (body.tagIds as string[]).map((tagId: string) => ({ itemId: item.id, tagId })),
            });
          }
        }
      }
    });

    revalidatePath("/");
    return jsonResponse({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
