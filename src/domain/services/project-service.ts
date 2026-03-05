import { z } from "zod";
import { CreateProjectInput, Project, UpdateProjectInput } from "../models";
import { ProjectRepository } from "../repositories";
import {
  archiveProjectSchema,
  createProjectSchema,
  updateProjectSchema,
} from "../schemas";
import { NotFoundError, ValidationError } from "./errors";

interface ProjectServiceDeps {
  projectRepository: ProjectRepository;
}

export class ProjectService {
  private readonly projectRepository: ProjectRepository;

  constructor(deps: ProjectServiceDeps) {
    this.projectRepository = deps.projectRepository;
  }

  async listProjects(): Promise<Project[]> {
    return this.projectRepository.list();
  }

  async createProject(rawInput: unknown): Promise<Project> {
    const input = this.parseOrThrow(createProjectSchema, rawInput) as CreateProjectInput;
    return this.projectRepository.create(input);
  }

  async updateProject(rawInput: unknown): Promise<Project> {
    const input = this.parseOrThrow(updateProjectSchema, rawInput) as UpdateProjectInput;
    await this.ensureExists(input.id);
    return this.projectRepository.update(input);
  }

  async deleteProject(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.projectRepository.delete(id);
  }

  async toggleArchive(rawInput: unknown): Promise<Project> {
    const input = this.parseOrThrow(archiveProjectSchema, rawInput);
    await this.ensureExists(input.id);
    return this.projectRepository.archiveToggle(input.id, input.archived);
  }

  private async ensureExists(id: string): Promise<void> {
    const project = await this.projectRepository.getById(id);
    if (!project) {
      throw new NotFoundError("Project", id);
    }
  }

  private parseOrThrow<TSchema extends z.ZodTypeAny>(schema: TSchema, value: unknown): z.infer<TSchema> {
    const parsed = schema.safeParse(value);

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join("; "));
    }

    return parsed.data;
  }
}
