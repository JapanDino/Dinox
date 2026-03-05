import { CreateTagInput, Tag, UpdateTagInput } from "@/src/domain/models";
import { TagRepository } from "@/src/domain/repositories";
import { prisma } from "../client";
import { mapTag } from "../mappers";

export class PrismaTagRepository implements TagRepository {
  async list(): Promise<Tag[]> {
    const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
    return tags.map(mapTag);
  }

  async getById(id: string): Promise<Tag | null> {
    const tag = await prisma.tag.findUnique({ where: { id } });
    return tag ? mapTag(tag) : null;
  }

  async getByIds(ids: string[]): Promise<Tag[]> {
    if (ids.length === 0) {
      return [];
    }

    const tags = await prisma.tag.findMany({
      where: { id: { in: ids } },
      orderBy: { name: "asc" },
    });

    return tags.map(mapTag);
  }

  async create(input: CreateTagInput): Promise<Tag> {
    const tag = await prisma.tag.create({
      data: {
        name: input.name,
        color: input.color,
        externalSource: input.externalSource ?? null,
        externalId: input.externalId ?? null,
      },
    });

    return mapTag(tag);
  }

  async update(input: UpdateTagInput): Promise<Tag> {
    const tag = await prisma.tag.update({
      where: { id: input.id },
      data: {
        name: input.name,
        color: input.color,
        externalSource: input.externalSource,
        externalId: input.externalId,
      },
    });

    return mapTag(tag);
  }

  async delete(id: string): Promise<void> {
    await prisma.tag.delete({ where: { id } });
  }
}
