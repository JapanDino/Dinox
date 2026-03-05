import {
  CreateItemInput,
  Item,
  ItemListFilters,
  ItemWithRelations,
  UpdateItemInput,
} from "../models/types";

export interface ItemRepository {
  list(filters: ItemListFilters): Promise<ItemWithRelations[]>;
  getById(id: string): Promise<ItemWithRelations | null>;
  create(input: CreateItemInput): Promise<ItemWithRelations>;
  update(input: UpdateItemInput): Promise<ItemWithRelations>;
  delete(id: string): Promise<void>;
  setTags(itemId: string, tagIds: string[]): Promise<ItemWithRelations>;
  exists(id: string): Promise<boolean>;
  getRawById(id: string): Promise<Item | null>;
}
