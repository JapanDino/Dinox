export type ApiItemStatus = "TODO" | "DONE" | "CANCELLED";

export interface ApiProject {
  id: string;
  name: string;
  color: string;
  archived: boolean;
  externalSource: string | null;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTag {
  id: string;
  name: string;
  color: string;
  externalSource: string | null;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiItem {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  status: ApiItemStatus;
  projectId: string | null;
  recurrenceRule: string | null;
  seriesId: string | null;
  parentId: string | null;
  externalSource: string | null;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
  project: ApiProject | null;
  tags: ApiTag[];
}

export interface ApiItemMutationInput {
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  status?: ApiItemStatus;
  projectId?: string | null;
  tagIds?: string[];
}

export interface ApiResponse<TData> {
  data: TData;
}
