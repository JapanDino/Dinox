import { Prisma } from "@prisma/client";
import {
  CreateItemInput,
  Item,
  ItemListFilters,
  ItemWithRelations,
  UpdateItemInput,
} from "@/src/domain/models";
import { ItemRepository } from "@/src/domain/repositories";
import { prisma } from "../client";
import { mapItem, mapItemWithRelations } from "../mappers";

const itemInclude = {
  project: true,
  itemTags: {
    include: {
      tag: true,
    },
  },
} satisfies Prisma.ItemInclude;

export class PrismaItemRepository implements ItemRepository {
  async list(filters: ItemListFilters): Promise<ItemWithRelations[]> {
    const where: Prisma.ItemWhereInput = {
      ...(filters.projectIds && filters.projectIds.length > 0
        ? {
            projectId: {
              in: filters.projectIds,
            },
          }
        : {}),
      ...(filters.tagIds && filters.tagIds.length > 0
        ? {
            itemTags: {
              some: {
                tagId: {
                  in: filters.tagIds,
                },
              },
            },
          }
        : {}),
      ...(filters.query
        ? {
            OR: [
              { title: { contains: filters.query } },
              { description: { contains: filters.query } },
            ],
          }
        : {}),
      ...(filters.rangeStart || filters.rangeEnd
        ? {
            AND: [
              filters.rangeStart ? { endAt: { gte: filters.rangeStart } } : {},
              filters.rangeEnd ? { startAt: { lte: filters.rangeEnd } } : {},
            ],
          }
        : {}),
      ...(filters.statuses && filters.statuses.length > 0
        ? {
            status: {
              in: filters.statuses,
            },
          }
        : {}),
    };

    const items = await prisma.item.findMany({
      where,
      include: itemInclude,
      orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
    });

    return items.map(mapItemWithRelations);
  }

  async getById(id: string): Promise<ItemWithRelations | null> {
    const item = await prisma.item.findUnique({
      where: { id },
      include: itemInclude,
    });

    return item ? mapItemWithRelations(item) : null;
  }

  async create(input: CreateItemInput): Promise<ItemWithRelations> {
    const item = await prisma.item.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        startAt: input.startAt,
        endAt: input.endAt,
        allDay: input.allDay ?? false,
        status: input.status ?? "TODO",
        projectId: input.projectId ?? null,
        recurrenceRule: input.recurrenceRule ?? null,
        seriesId: input.seriesId ?? null,
        parentId: input.parentId ?? null,
        externalSource: input.externalSource ?? null,
        externalId: input.externalId ?? null,
      },
      include: itemInclude,
    });

    return mapItemWithRelations(item);
  }

  async update(input: UpdateItemInput): Promise<ItemWithRelations> {
    const item = await prisma.item.update({
      where: { id: input.id },
      data: {
        title: input.title,
        description: input.description,
        startAt: input.startAt,
        endAt: input.endAt,
        allDay: input.allDay,
        status: input.status,
        projectId: input.projectId,
        recurrenceRule: input.recurrenceRule,
        seriesId: input.seriesId,
        parentId: input.parentId,
        externalSource: input.externalSource,
        externalId: input.externalId,
      },
      include: itemInclude,
    });

    return mapItemWithRelations(item);
  }

  async delete(id: string): Promise<void> {
    await prisma.item.delete({ where: { id } });
  }

  async setTags(itemId: string, tagIds: string[]): Promise<ItemWithRelations> {
    await prisma.$transaction(async (tx) => {
      await tx.itemTag.deleteMany({ where: { itemId } });

      if (tagIds.length > 0) {
        await tx.itemTag.createMany({
          data: tagIds.map((tagId) => ({ itemId, tagId })),
        });
      }
    });

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: itemInclude,
    });

    if (!item) {
      throw new Error(`Item with id ${itemId} was not found after setting tags.`);
    }

    return mapItemWithRelations(item);
  }

  async exists(id: string): Promise<boolean> {
    const count = await prisma.item.count({ where: { id } });
    return count > 0;
  }

  async getRawById(id: string): Promise<Item | null> {
    const item = await prisma.item.findUnique({ where: { id } });
    return item ? mapItem(item) : null;
  }
}

