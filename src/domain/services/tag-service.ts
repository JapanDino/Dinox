import { z } from "zod";
import { CreateTagInput, Tag, UpdateTagInput } from "../models";
import { TagRepository } from "../repositories";
import { createTagSchema, updateTagSchema } from "../schemas";
import { NotFoundError, ValidationError } from "./errors";

interface TagServiceDeps {
  tagRepository: TagRepository;
}

export class TagService {
  private readonly tagRepository: TagRepository;

  constructor(deps: TagServiceDeps) {
    this.tagRepository = deps.tagRepository;
  }

  async listTags(): Promise<Tag[]> {
    return this.tagRepository.list();
  }

  async createTag(rawInput: unknown): Promise<Tag> {
    const input = this.parseOrThrow(createTagSchema, rawInput) as CreateTagInput;
    return this.tagRepository.create(input);
  }

  async updateTag(rawInput: unknown): Promise<Tag> {
    const input = this.parseOrThrow(updateTagSchema, rawInput) as UpdateTagInput;
    await this.ensureExists(input.id);
    return this.tagRepository.update(input);
  }

  async deleteTag(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.tagRepository.delete(id);
  }

  private async ensureExists(id: string): Promise<void> {
    const tag = await this.tagRepository.getById(id);
    if (!tag) {
      throw new NotFoundError("Tag", id);
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
