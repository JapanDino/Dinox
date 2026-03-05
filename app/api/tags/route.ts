import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { tagService } from "@/src/app-services/container";
import { handleRouteError, jsonResponse } from "../_lib/http";

export async function GET(): Promise<Response> {
  try {
    const tags = await tagService.listTags();
    return jsonResponse({ data: tags });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const payload = await request.json();
    const tag = await tagService.createTag(payload);

    revalidatePath("/");

    return jsonResponse({ data: tag }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
