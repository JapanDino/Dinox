import {
  PrismaItemRepository,
  PrismaProjectRepository,
  PrismaTagRepository,
} from "@/src/data/prisma";
import { ItemService, ProjectService, TagService } from "@/src/domain/services";

const projectRepository = new PrismaProjectRepository();
const tagRepository = new PrismaTagRepository();
const itemRepository = new PrismaItemRepository();

export const projectService = new ProjectService({ projectRepository });
export const tagService = new TagService({ tagRepository });
export const itemService = new ItemService({
  itemRepository,
  projectRepository,
  tagRepository,
});
