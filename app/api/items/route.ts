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
    const payload = await request.json();
    const item = await itemService.createItem(payload);

    revalidatePath("/");

    return jsonResponse({ data: item }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
