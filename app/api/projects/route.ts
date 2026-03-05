import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { projectService } from "@/src/app-services/container";
import { handleRouteError, jsonResponse } from "../_lib/http";

export async function GET(): Promise<Response> {
  try {
    const projects = await projectService.listProjects();
    return jsonResponse({ data: projects });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const payload = await request.json();
    const project = await projectService.createProject(payload);

    revalidatePath("/");

    return jsonResponse({ data: project }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
