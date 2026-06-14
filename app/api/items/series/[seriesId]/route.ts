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
    const from = _req.nextUrl.searchParams.get("from");
    const fromDate = from ? new Date(from) : null;
    await prisma.item.deleteMany({
      where: {
        seriesId,
        ...(fromDate && !Number.isNaN(fromDate.getTime()) ? { startAt: { gte: fromDate } } : {}),
      },
    });
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
    const editScope = body.editScope === "following" ? "following" : "all";
    const anchorId = typeof body.seriesAnchorId === "string" ? body.seriesAnchorId : null;
    const editFrom = typeof body.seriesEditFrom === "string" ? new Date(body.seriesEditFrom) : null;
    const anchorItem = anchorId
      ? await prisma.item.findFirst({ where: { id: anchorId, seriesId } })
      : null;
    const where = {
      seriesId,
      ...(editScope === "following" && editFrom && !Number.isNaN(editFrom.getTime())
        ? { startAt: { gte: editFrom } }
        : {}),
    };

    // Only allow updating safe scalar fields across the series
    const allowed = ["title", "description", "color", "allDay", "kind", "status", "projectId", "links", "recurrenceRule"] as const;
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }
    if (Object.keys(data).length > 0) {
      await prisma.item.updateMany({ where, data });
    }

    if (anchorItem && typeof body.startAt === "string" && typeof body.endAt === "string") {
      const nextStart = new Date(body.startAt);
      const nextEnd = new Date(body.endAt);
      if (!Number.isNaN(nextStart.getTime()) && !Number.isNaN(nextEnd.getTime())) {
        const deltaStart = nextStart.getTime() - anchorItem.startAt.getTime();
        const deltaEnd = nextEnd.getTime() - anchorItem.endAt.getTime();
        const futureItems = await prisma.item.findMany({
          where,
          select: { id: true, startAt: true, endAt: true },
        });
        await prisma.$transaction(
          futureItems.map((item) =>
            prisma.item.update({
              where: { id: item.id },
              data: {
                startAt: new Date(item.startAt.getTime() + deltaStart),
                endAt: new Date(item.endAt.getTime() + deltaEnd),
              },
            })
          )
        );
      }
    }

    // Handle tags if provided
    if (Array.isArray(body.tagIds)) {
      const items = await prisma.item.findMany({ where, select: { id: true } });
      for (const item of items) {
        await prisma.itemTag.deleteMany({ where: { itemId: item.id } });
        if ((body.tagIds as string[]).length > 0) {
          await prisma.itemTag.createMany({
            data: (body.tagIds as string[]).map((tagId: string) => ({ itemId: item.id, tagId })),
          });
        }
      }
    }
    revalidatePath("/");
    return jsonResponse({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
