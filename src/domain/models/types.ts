export const ITEM_STATUS_VALUES = ["TODO", "DONE", "CANCELLED"] as const;
export type ItemStatus = (typeof ITEM_STATUS_VALUES)[number];

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project extends BaseEntity {
  name: string;
  color: string;
  archived: boolean;
  externalSource: string | null;
  externalId: string | null;
}

export interface Tag extends BaseEntity {
  name: string;
  color: string;
  externalSource: string | null;
  externalId: string | null;
}

export interface Item extends BaseEntity {
  title: string;
  description: string | null;
  color: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  status: ItemStatus;
  projectId: string | null;
  recurrenceRule: string | null;
  seriesId: string | null;
  parentId: string | null;
  externalSource: string | null;
  externalId: string | null;
}

export interface ItemWithRelations extends Item {
  project: Project | null;
  tags: Tag[];
}

export interface ItemListFilters {
  projectIds?: string[];
  tagIds?: string[];
  query?: string;
  rangeStart?: Date;
  rangeEnd?: Date;
  statuses?: ItemStatus[];
}

export interface CreateProjectInput {
  name: string;
  color: string;
  archived?: boolean;
  externalSource?: string | null;
  externalId?: string | null;
}

export interface UpdateProjectInput {
  id: string;
  name?: string;
  color?: string;
  archived?: boolean;
  externalSource?: string | null;
  externalId?: string | null;
}

export interface CreateTagInput {
  name: string;
  color: string;
  externalSource?: string | null;
  externalId?: string | null;
}

export interface UpdateTagInput {
  id: string;
  name?: string;
  color?: string;
  externalSource?: string | null;
  externalId?: string | null;
}

export interface CreateItemInput {
  title: string;
  description?: string | null;
  color?: string | null;
  startAt: Date;
  endAt: Date;
  allDay?: boolean;
  status?: ItemStatus;
  projectId?: string | null;
  tagIds?: string[];
  recurrenceRule?: string | null;
  seriesId?: string | null;
  parentId?: string | null;
  externalSource?: string | null;
  externalId?: string | null;
}

export interface UpdateItemInput {
  id: string;
  title?: string;
  description?: string | null;
  color?: string | null;
  startAt?: Date;
  endAt?: Date;
  allDay?: boolean;
  status?: ItemStatus;
  projectId?: string | null;
  tagIds?: string[];
  recurrenceRule?: string | null;
  seriesId?: string | null;
  parentId?: string | null;
  externalSource?: string | null;
  externalId?: string | null;
}
