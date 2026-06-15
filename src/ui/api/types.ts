export type ApiItemStatus = "TODO" | "DONE" | "CANCELLED";
export type ApiItemKind = "TASK" | "EVENT";

export interface ApiProject {
  id: string;
  name: string;
  color: string;
  emoji: string | null;
  description: string | null;
  notes: string | null;
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
  color: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  kind: ApiItemKind;
  status: ApiItemStatus;
  projectId: string | null;
  links: Array<{ url: string; title?: string }> | null;
  recurrenceRule: string | null;
  seriesId: string | null;
  parentId: string | null;
  externalSource: string | null;
  externalId: string | null;
  trackedSeconds: number;
  createdAt: string;
  updatedAt: string;
  project: ApiProject | null;
  tags: ApiTag[];
}

export interface ApiItemMutationInput {
  title: string;
  description?: string | null;
  color?: string | null;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  kind?: ApiItemKind;
  status?: ApiItemStatus;
  projectId?: string | null;
  links?: Array<{ url: string; title?: string }> | null;
  tagIds?: string[];
  recurrenceRule?: string | null;
  seriesId?: string | null;
  editScope?: "this" | "following" | "all";
  seriesAnchorId?: string;
  seriesEditFrom?: string;
}

export interface ApiCalendarSubscription {
  id: string;
  name: string;
  url: string;
  color: string;
  enabled: boolean;
  lastSyncedAt: string | null;
  errorMsg: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiProjectMutationInput {
  name: string;
  color: string;
  emoji?: string | null;
  description?: string | null;
  notes?: string | null;
  archived?: boolean;
}

export interface ApiTagMutationInput {
  name: string;
  color: string;
}

export interface ApiResponse<TData> {
  data: TData;
}
