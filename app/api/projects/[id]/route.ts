import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { projectService } from "@/src/app-services/container";
import { handleRouteError, jsonResponse } from "../../_lib/http";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { id } = await context.params;
    const projects = await projectService.listProjects();
    const project = projects.find((entry) => entry.id === id);

    if (!project) {
      return jsonResponse({ error: { code: "NOT_FOUND", message: "Project not found." } }, 404);
    }

    return jsonResponse({ data: project });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { id } = await context.params;
    const payload = await request.json();

    const project = Object.prototype.hasOwnProperty.call(payload, "archived")
      ? await projectService.toggleArchive({ id, archived: payload.archived })
      : await projectService.updateProject({ ...payload, id });

    revalidatePath("/");

    return jsonResponse({ data: project });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { id } = await context.params;
    await projectService.deleteProject(id);

    revalidatePath("/");

    return jsonResponse({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
