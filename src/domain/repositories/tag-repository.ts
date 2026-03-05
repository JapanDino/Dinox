import { CreateTagInput, Tag, UpdateTagInput } from "../models/types";

export interface TagRepository {
  list(): Promise<Tag[]>;
  getById(id: string): Promise<Tag | null>;
  getByIds(ids: string[]): Promise<Tag[]>;
  create(input: CreateTagInput): Promise<Tag>;
  update(input: UpdateTagInput): Promise<Tag>;
  delete(id: string): Promise<void>;
}
