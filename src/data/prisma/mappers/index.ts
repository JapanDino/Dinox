import { Item as PrismaItem, ItemStatus, Project as PrismaProject, Tag as PrismaTag } from "@prisma/client";
import { Item, ItemWithRelations, Project, Tag } from "@/src/domain/models";

export function mapProject(project: PrismaProject): Project {
  return {
    id: project.id,
    name: project.name,
    color: project.color,
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

export function mapItem(item: PrismaItem): Item {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    color: item.color,
    startAt: item.startAt,
    endAt: item.endAt,
    allDay: item.allDay,
    status: item.status as ItemStatus,
    projectId: item.projectId,
    recurrenceRule: item.recurrenceRule,
    seriesId: item.seriesId,
    parentId: item.parentId,
    externalSource: item.externalSource,
    externalId: item.externalId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
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
