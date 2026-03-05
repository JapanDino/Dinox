import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { itemService } from "@/src/app-services/container";
import { handleRouteError, jsonResponse } from "../../_lib/http";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { id } = await context.params;
    const item = await itemService.getItemById(id);
    return jsonResponse({ data: item });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const item = await itemService.updateItem({ ...payload, id });

    revalidatePath("/");

    return jsonResponse({ data: item });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { id } = await context.params;
    await itemService.deleteItem({ id });

    revalidatePath("/");

    return jsonResponse({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
