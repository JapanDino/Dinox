import {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from "@/src/domain/models";
import { ProjectRepository } from "@/src/domain/repositories";
import { prisma } from "../client";
import { mapProject } from "../mappers";

export class PrismaProjectRepository implements ProjectRepository {
  async list(): Promise<Project[]> {
    const projects = await prisma.project.findMany({
      orderBy: [{ archived: "asc" }, { name: "asc" }],
    });

    return projects.map(mapProject);
  }

  async getById(id: string): Promise<Project | null> {
    const project = await prisma.project.findUnique({ where: { id } });
    return project ? mapProject(project) : null;
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const project = await prisma.project.create({
      data: {
        name: input.name,
        color: input.color,
        archived: input.archived ?? false,
        externalSource: input.externalSource ?? null,
        externalId: input.externalId ?? null,
      },
    });

    return mapProject(project);
  }

  async update(input: UpdateProjectInput): Promise<Project> {
    const project = await prisma.project.update({
      where: { id: input.id },
      data: {
        name: input.name,
        color: input.color,
        archived: input.archived,
        externalSource: input.externalSource,
        externalId: input.externalId,
      },
    });

    return mapProject(project);
  }

  async delete(id: string): Promise<void> {
    await prisma.project.delete({ where: { id } });
  }

  async archiveToggle(id: string, archived: boolean): Promise<Project> {
    const project = await prisma.project.update({
      where: { id },
      data: { archived },
    });

    return mapProject(project);
  }
}
