import { revalidatePath } from "next/cache";
import { loadDemoData } from "@/src/data/prisma/demo-seed";
import { prisma } from "@/src/data/prisma";
import { handleRouteError, jsonResponse } from "../../_lib/http";

export async function POST(): Promise<Response> {
  try {
    await loadDemoData(prisma);

    revalidatePath("/");
    revalidatePath("/debug");

    return jsonResponse({ ok: true, message: "Demo data loaded." }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
