import { PrismaClient, ItemStatus } from "@prisma/client";

const prisma = new PrismaClient();

const projectSeeds = [
  { name: "Dinox Core", color: "#2563eb", archived: false },
  { name: "Marketing Site", color: "#16a34a", archived: false },
  { name: "Research", color: "#db2777", archived: false },
];

const tagSeeds = [
  { name: "urgent", color: "#dc2626" },
  { name: "deep-work", color: "#7c3aed" },
  { name: "meeting", color: "#0284c7" },
  { name: "personal", color: "#f59e0b" },
];

async function main() {
  for (const project of projectSeeds) {
    await prisma.project.upsert({
      where: { name: project.name },
      update: project,
      create: project,
    });
  }

  for (const tag of tagSeeds) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: tag,
      create: tag,
    });
  }

  await prisma.itemTag.deleteMany();
  await prisma.item.deleteMany();

  const projects = await prisma.project.findMany();
  const tags = await prisma.tag.findMany();

  const projectByName = new Map(projects.map((project) => [project.name, project.id]));
  const tagByName = new Map(tags.map((tag) => [tag.name, tag.id]));

  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(9, 0, 0, 0);

  const plusHours = (base: Date, hours: number) => new Date(base.getTime() + hours * 60 * 60 * 1000);
  const plusDays = (base: Date, days: number) => new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  const itemSeeds = [
    {
      title: "Plan MVP milestones",
      description: "Break backend and UI milestones into shippable phases.",
      startAt: startToday,
      endAt: plusHours(startToday, 1),
      allDay: false,
      status: ItemStatus.TODO,
      projectName: "Dinox Core",
      tagNames: ["urgent", "deep-work"],
    },
    {
      title: "Team sync",
      description: "Weekly product sync with design and engineering.",
      startAt: plusDays(plusHours(startToday, 2), 1),
      endAt: plusDays(plusHours(startToday, 3), 1),
      allDay: false,
      status: ItemStatus.TODO,
      projectName: "Marketing Site",
      tagNames: ["meeting"],
    },
    {
      title: "Read papers on local-first sync",
      description: "Collect implementation notes for a future sync engine.",
      startAt: plusDays(startToday, 2),
      endAt: plusDays(plusHours(startToday, 2), 2),
      allDay: false,
      status: ItemStatus.DONE,
      projectName: "Research",
      tagNames: ["deep-work"],
    },
    {
      title: "Personal planning",
      description: "Review personal week agenda and errands.",
      startAt: plusDays(startToday, 3),
      endAt: plusDays(plusHours(startToday, 1), 3),
      allDay: false,
      status: ItemStatus.TODO,
      projectName: null,
      tagNames: ["personal"],
    },
  ];

  for (const item of itemSeeds) {
    const projectId = item.projectName ? projectByName.get(item.projectName) ?? null : null;
    const tagIds = item.tagNames.map((name) => tagByName.get(name)).filter((id): id is string => Boolean(id));

    await prisma.item.create({
      data: {
        title: item.title,
        description: item.description,
        startAt: item.startAt,
        endAt: item.endAt,
        allDay: item.allDay,
        status: item.status,
        projectId,
        recurrenceRule: null,
        seriesId: null,
        parentId: null,
        externalSource: null,
        externalId: null,
        itemTags: {
          create: tagIds.map((tagId) => ({
            tagId,
          })),
        },
      },
    });
  }

  console.log("Seed complete: projects, tags and items loaded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
