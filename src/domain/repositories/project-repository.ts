import {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from "../models/types";

export interface ProjectRepository {
  list(): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
  create(input: CreateProjectInput): Promise<Project>;
  update(input: UpdateProjectInput): Promise<Project>;
  delete(id: string): Promise<void>;
  archiveToggle(id: string, archived: boolean): Promise<Project>;
}
