import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { tagService } from "@/src/app-services/container";
import { handleRouteError, jsonResponse } from "../../_lib/http";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { id } = await context.params;
    const tags = await tagService.listTags();
    const tag = tags.find((entry) => entry.id === id);

    if (!tag) {
      return jsonResponse({ error: { code: "NOT_FOUND", message: "Tag not found." } }, 404);
    }

    return jsonResponse({ data: tag });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const tag = await tagService.updateTag({ ...payload, id });

    revalidatePath("/");

    return jsonResponse({ data: tag });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { id } = await context.params;
    await tagService.deleteTag(id);

    revalidatePath("/");

    return jsonResponse({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
