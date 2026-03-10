import { z } from "zod";
import {
  CreateItemInput,
  ItemListFilters,
  ItemWithRelations,
  UpdateItemInput,
} from "../models/types";
import {
  ItemRepository,
  ProjectRepository,
  TagRepository,
} from "../repositories";
import {
  createItemSchema,
  deleteItemSchema,
  listItemsSchema,
  updateItemSchema,
} from "../schemas";
import { NotFoundError, ValidationError } from "./errors";

interface ItemServiceDeps {
  itemRepository: ItemRepository;
  projectRepository: ProjectRepository;
  tagRepository: TagRepository;
}

export class ItemService {
  private readonly itemRepository: ItemRepository;
  private readonly projectRepository: ProjectRepository;
  private readonly tagRepository: TagRepository;

  constructor(deps: ItemServiceDeps) {
    this.itemRepository = deps.itemRepository;
    this.projectRepository = deps.projectRepository;
    this.tagRepository = deps.tagRepository;
  }

  async listItems(rawFilters: unknown): Promise<ItemWithRelations[]> {
    const filters = this.parseOrThrow(listItemsSchema, rawFilters ?? {}) as ItemListFilters;
    return this.itemRepository.list(filters);
  }

  async getItemById(id: string): Promise<ItemWithRelations> {
    const item = await this.itemRepository.getById(id);

    if (!item) {
      throw new NotFoundError("Item", id);
    }

    return item;
  }

  async createItem(rawInput: unknown): Promise<ItemWithRelations> {
    const parsed = this.parseOrThrow(createItemSchema, rawInput);

    this.ensureDateRange(parsed.startAt, parsed.endAt);
    await this.validateProject(parsed.projectId ?? null);
    await this.validateTags(parsed.tagIds ?? []);

    const input: CreateItemInput = this.prepareSyncMetadata({
      title: parsed.title,
      description: parsed.description ?? null,
      color: parsed.color ?? null,
      startAt: parsed.startAt,
      endAt: parsed.endAt,
      allDay: parsed.allDay ?? false,
      status: parsed.status ?? "TODO",
      projectId: parsed.projectId ?? null,
      tagIds: parsed.tagIds ?? [],
      recurrenceRule: parsed.recurrenceRule ?? null,
      seriesId: parsed.seriesId ?? null,
      parentId: parsed.parentId ?? null,
      externalSource: parsed.externalSource ?? null,
      externalId: parsed.externalId ?? null,
    });

    await this.validateConflict(input);
    this.handleRecurrenceStub(input);

    let item = await this.itemRepository.create(input);

    if (input.tagIds && input.tagIds.length > 0) {
      item = await this.itemRepository.setTags(item.id, input.tagIds);
    }

    return item;
  }

  async updateItem(rawInput: unknown): Promise<ItemWithRelations> {
    const parsed = this.parseOrThrow(updateItemSchema, rawInput);

    const existing = await this.itemRepository.getRawById(parsed.id);
    if (!existing) {
      throw new NotFoundError("Item", parsed.id);
    }

    const nextStart = parsed.startAt ?? existing.startAt;
    const nextEnd = parsed.endAt ?? existing.endAt;
    this.ensureDateRange(nextStart, nextEnd);

    if (parsed.projectId !== undefined) {
      await this.validateProject(parsed.projectId ?? null);
    }

    if (parsed.tagIds !== undefined) {
      await this.validateTags(parsed.tagIds);
    }

    const input: UpdateItemInput = this.prepareSyncMetadata({
      id: parsed.id,
      title: parsed.title,
      description: parsed.description,
      color: parsed.color,
      startAt: parsed.startAt,
      endAt: parsed.endAt,
      allDay: parsed.allDay,
      status: parsed.status,
      projectId: parsed.projectId,
      tagIds: parsed.tagIds,
      recurrenceRule: parsed.recurrenceRule,
      seriesId: parsed.seriesId,
      parentId: parsed.parentId,
      externalSource: parsed.externalSource,
      externalId: parsed.externalId,
    });

    await this.validateConflict(input, existing.id);
    this.handleRecurrenceStub(input);

    let item = await this.itemRepository.update(input);

    if (parsed.tagIds !== undefined) {
      item = await this.itemRepository.setTags(parsed.id, parsed.tagIds);
    }

    return item;
  }

  async deleteItem(rawInput: unknown): Promise<void> {
    const parsed = this.parseOrThrow(deleteItemSchema, rawInput);
    const exists = await this.itemRepository.exists(parsed.id);

    if (!exists) {
      throw new NotFoundError("Item", parsed.id);
    }

    await this.itemRepository.delete(parsed.id);
  }

  private ensureDateRange(startAt: Date, endAt: Date): void {
    if (endAt.getTime() <= startAt.getTime()) {
      throw new ValidationError("endAt must be greater than startAt.");
    }
  }

  private async validateProject(projectId: string | null): Promise<void> {
    if (!projectId) {
      return;
    }

    const project = await this.projectRepository.getById(projectId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }
  }

  private async validateTags(tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) {
      return;
    }

    const uniqueTagIds = Array.from(new Set(tagIds));
    const tags = await this.tagRepository.getByIds(uniqueTagIds);

    if (tags.length !== uniqueTagIds.length) {
      throw new ValidationError("One or more tags do not exist.");
    }
  }

  private async validateConflict(input: CreateItemInput | UpdateItemInput, itemId?: string): Promise<void> {
    // Future extension point: conflict detection against overlapping items.
    void input;
    void itemId;
  }

  private prepareSyncMetadata<T extends CreateItemInput | UpdateItemInput>(input: T): T {
    // Future extension point: normalize metadata before sync subsystem is introduced.
    return input;
  }

  private handleRecurrenceStub(input: CreateItemInput | UpdateItemInput): void {
    // Future extension point: recurrence expansion/series exception handling.
    void input;
  }

  private parseOrThrow<TSchema extends z.ZodTypeAny>(schema: TSchema, value: unknown): z.infer<TSchema> {
    const parsed = schema.safeParse(value);

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join("; "));
    }

    return parsed.data;
  }
}

