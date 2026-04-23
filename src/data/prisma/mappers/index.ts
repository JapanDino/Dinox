import {
  CalendarSubscription as PrismaCalendarSubscription,
  Item as PrismaItem,
  ItemKind,
  ItemStatus,
  Project as PrismaProject,
  Tag as PrismaTag,
} from "@prisma/client";
import { CalendarSubscription, Item, ItemLink, ItemWithRelations, Project, Tag } from "@/src/domain/models";

export function mapProject(project: PrismaProject): Project {
  return {
    id: project.id,
    name: project.name,
    color: project.color,
    emoji: project.emoji,
    description: project.description,
    notes: project.notes,
    archived: project.archived,
    externalSource: project.externalSource,
    externalId: project.externalId,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export function mapTag(tag: PrismaTag): Tag {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    externalSource: tag.externalSource,
    externalId: tag.externalId,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
}

function parseLinks(raw: string | null): ItemLink[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ItemLink[];
    return null;
  } catch {
    return null;
  }
}

export function mapItem(item: PrismaItem): Item {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    color: item.color,
    startAt: item.startAt,
    endAt: item.endAt,
    allDay: item.allDay,
    kind: item.kind as ItemKind,
    status: item.status as ItemStatus,
    projectId: item.projectId,
    links: parseLinks(item.links),
    recurrenceRule: item.recurrenceRule,
    seriesId: item.seriesId,
    parentId: item.parentId,
    externalSource: item.externalSource,
    externalId: item.externalId,
    trackedSeconds: item.trackedSeconds,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function mapCalendarSubscription(sub: PrismaCalendarSubscription): CalendarSubscription {
  return {
    id: sub.id,
    name: sub.name,
    url: sub.url,
    color: sub.color,
    enabled: sub.enabled,
    lastSyncedAt: sub.lastSyncedAt,
    errorMsg: sub.errorMsg,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  };
}

type PrismaItemWithRelations = PrismaItem & {
  project: PrismaProject | null;
  itemTags: { tag: PrismaTag }[];
};

export function mapItemWithRelations(item: PrismaItemWithRelations): ItemWithRelations {
  return {
    ...mapItem(item),
    project: item.project ? mapProject(item.project) : null,
    tags: item.itemTags.map((itemTag) => mapTag(itemTag.tag)),
  };
}
