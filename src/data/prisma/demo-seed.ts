import { ItemKind, ItemStatus, PrismaClient } from "@prisma/client";

const projectSeeds = [
  { name: "Dinox Core", color: "#2563eb", emoji: "🚀", archived: false },
  { name: "Marketing Site", color: "#16a34a", emoji: "🌐", archived: false },
  { name: "Research", color: "#db2777", emoji: "🔬", archived: false },
  { name: "Design System", color: "#7c3aed", emoji: "🎨", archived: false },
  { name: "Infra & DevOps", color: "#ea580c", emoji: "⚙️", archived: false },
];

const tagSeeds = [
  { name: "urgent", color: "#dc2626" },
  { name: "deep-work", color: "#7c3aed" },
  { name: "meeting", color: "#0284c7" },
  { name: "personal", color: "#f59e0b" },
  { name: "review", color: "#059669" },
  { name: "blocked", color: "#9ca3af" },
];

function mondayFor(date: Date) {
  const dayOfWeek = date.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export async function loadDemoData(prisma: PrismaClient): Promise<void> {
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

  const projectByName = new Map(projects.map((p) => [p.name, p.id]));
  const tagByName = new Map(tags.map((t) => [t.name, t.id]));

  const monday = mondayFor(new Date());

  const day = (d: number, h: number, m = 0) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + d);
    dt.setHours(h, m, 0, 0);
    return dt;
  };

  const itemSeeds: Array<{
    title: string;
    description: string;
    startAt: Date;
    endAt: Date;
    allDay: boolean;
    kind: ItemKind;
    status: ItemStatus;
    projectName: string | null;
    tagNames: string[];
    color?: string;
  }> = [
    // ── Monday (d=0) ────────────────────────────────────────────────────────

    // All-day banner
    {
      title: "Design sprint week",
      description: "Full week dedicated to Dinox UI redesign.",
      startAt: day(0, 0),
      endAt: day(4, 23, 59),
      allDay: true,
      kind: ItemKind.EVENT,
      status: ItemStatus.TODO,
      projectName: "Design System",
      tagNames: [],
    },

    {
      title: "Daily standup",
      description: "What did you do yesterday, what will you do today, any blockers?",
      startAt: day(0, 9),
      endAt: day(0, 9, 20),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.DONE,
      projectName: "Dinox Core",
      tagNames: ["meeting"],
    },
    {
      title: "Plan MVP milestones",
      description: "Break backend and UI milestones into shippable phases.",
      startAt: day(0, 9, 30),
      endAt: day(0, 11),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.DONE,
      projectName: "Dinox Core",
      tagNames: ["urgent", "deep-work"],
    },
    {
      title: "Calendar week-view overflow",
      description: "Fix event truncation when 4+ events overlap in week view.",
      startAt: day(0, 10),
      endAt: day(0, 11, 30),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.DONE,
      projectName: "Design System",
      tagNames: ["deep-work"],
    },
    {
      title: "Investor pitch prep",
      description: "Gather metrics and build slide deck for seed round.",
      startAt: day(0, 11),
      endAt: day(0, 12),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.TODO,
      projectName: "Marketing Site",
      tagNames: ["urgent"],
    },
    {
      title: "Lunch with Alex",
      description: "",
      startAt: day(0, 12, 30),
      endAt: day(0, 13, 30),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.DONE,
      projectName: null,
      tagNames: ["personal"],
    },
    {
      title: "Design token audit",
      description: "Review all CSS variables across components for inconsistencies.",
      startAt: day(0, 14),
      endAt: day(0, 16),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.DONE,
      projectName: "Design System",
      tagNames: ["deep-work", "review"],
    },
    {
      title: "Write changelog v0.2",
      description: "Document all user-facing changes since last release.",
      startAt: day(0, 16),
      endAt: day(0, 17),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.TODO,
      projectName: "Marketing Site",
      tagNames: [],
    },
    {
      title: "Gym",
      description: "",
      startAt: day(0, 18),
      endAt: day(0, 19, 30),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.DONE,
      projectName: null,
      tagNames: ["personal"],
    },

    // ── Tuesday (d=1) ───────────────────────────────────────────────────────

    {
      title: "Daily standup",
      description: "What did you do yesterday, what will you do today, any blockers?",
      startAt: day(1, 9),
      endAt: day(1, 9, 20),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.DONE,
      projectName: "Dinox Core",
      tagNames: ["meeting"],
    },
    // 3 overlapping items at 10:00
    {
      title: "Prisma migration: item color field",
      description: "Add optional color column to items table.",
      startAt: day(1, 10),
      endAt: day(1, 11),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.DONE,
      projectName: "Dinox Core",
      tagNames: ["deep-work"],
    },
    {
      title: "SEO keyword research",
      description: "Research top keywords for landing page copy.",
      startAt: day(1, 10),
      endAt: day(1, 11, 30),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.DONE,
      projectName: "Marketing Site",
      tagNames: [],
    },
    {
      title: "Read: Local-First Software paper",
      description: "Collect implementation notes for future sync engine.",
      startAt: day(1, 10, 30),
      endAt: day(1, 12),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.DONE,
      projectName: "Research",
      tagNames: ["deep-work"],
    },
    {
      title: "UX review with designer",
      description: "Go through Figma mocks for month view redesign.",
      startAt: day(1, 13),
      endAt: day(1, 14),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.DONE,
      projectName: "Design System",
      tagNames: ["meeting", "review"],
    },
    {
      title: "Implement agenda view grouping",
      description: "Group items by date with sticky headers.",
      startAt: day(1, 14),
      endAt: day(1, 17),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.DONE,
      projectName: "Dinox Core",
      tagNames: ["deep-work"],
    },
    {
      title: "Write unit tests for date-utils",
      description: "",
      startAt: day(1, 16),
      endAt: day(1, 17, 30),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.CANCELLED,
      projectName: "Dinox Core",
      tagNames: ["blocked"],
    },

    // ── Wednesday (d=2) ─────────────────────────────────────────────────────

    {
      title: "Daily standup",
      description: "",
      startAt: day(2, 9),
      endAt: day(2, 9, 20),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.DONE,
      projectName: "Dinox Core",
      tagNames: ["meeting"],
    },
    {
      title: "Deep work: item modal redesign",
      description: "Build new searchable project picker and tag chips.",
      startAt: day(2, 9, 30),
      endAt: day(2, 12, 30),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.DONE,
      projectName: "Design System",
      tagNames: ["deep-work"],
    },
    {
      title: "1:1 with manager",
      description: "Career goals, blockers, feedback.",
      startAt: day(2, 12),
      endAt: day(2, 12, 45),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.DONE,
      projectName: null,
      tagNames: ["meeting"],
    },
    {
      title: "Lunch break",
      description: "",
      startAt: day(2, 13),
      endAt: day(2, 14),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.DONE,
      projectName: null,
      tagNames: ["personal"],
    },
    // 4 overlapping short meetings at 14:00-15:30
    {
      title: "Design review: sidebar",
      description: "",
      startAt: day(2, 14),
      endAt: day(2, 14, 45),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.DONE,
      projectName: "Design System",
      tagNames: ["meeting", "review"],
    },
    {
      title: "Infra incident post-mortem",
      description: "Review last week's outage and action items.",
      startAt: day(2, 14),
      endAt: day(2, 15),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.DONE,
      projectName: "Infra & DevOps",
      tagNames: ["meeting", "urgent"],
    },
    {
      title: "Marketing copy review",
      description: "Review homepage hero and feature descriptions.",
      startAt: day(2, 14, 15),
      endAt: day(2, 15),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.DONE,
      projectName: "Marketing Site",
      tagNames: ["review"],
    },
    {
      title: "Deploy staging environment",
      description: "",
      startAt: day(2, 14, 30),
      endAt: day(2, 15, 30),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.DONE,
      projectName: "Infra & DevOps",
      tagNames: [],
    },
    {
      title: "Evening run",
      description: "",
      startAt: day(2, 18, 30),
      endAt: day(2, 19, 30),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.DONE,
      projectName: null,
      tagNames: ["personal"],
    },

    // ── Thursday (d=3) — TODAY ───────────────────────────────────────────────

    {
      title: "Daily standup",
      description: "",
      startAt: day(3, 9),
      endAt: day(3, 9, 20),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.DONE,
      projectName: "Dinox Core",
      tagNames: ["meeting"],
    },
    {
      title: "Fix time-display encoding bugs",
      description: "Garbled Russian characters in settings and item-modal.",
      startAt: day(3, 9, 30),
      endAt: day(3, 10, 30),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.DONE,
      projectName: "Dinox Core",
      tagNames: ["urgent"],
    },
    {
      title: "Add emoji support to projects",
      description: "Emoji picker in sidebar, project page, and item modal.",
      startAt: day(3, 10),
      endAt: day(3, 12),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.DONE,
      projectName: "Dinox Core",
      tagNames: ["deep-work"],
    },
    {
      title: "Month view date-picker dropdown",
      description: "Click on month header to jump to any month/year.",
      startAt: day(3, 10, 30),
      endAt: day(3, 12),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.DONE,
      projectName: "Design System",
      tagNames: ["deep-work"],
    },
    {
      title: "Lunch",
      description: "",
      startAt: day(3, 12, 30),
      endAt: day(3, 13, 30),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.TODO,
      projectName: null,
      tagNames: ["personal"],
    },
    {
      title: "Product roadmap review",
      description: "Q2 priorities, cut scope for v0.3.",
      startAt: day(3, 14),
      endAt: day(3, 15),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.TODO,
      projectName: "Dinox Core",
      tagNames: ["meeting", "urgent"],
    },
    {
      title: "CI/CD pipeline setup",
      description: "GitHub Actions: lint → tsc → build → package.",
      startAt: day(3, 14),
      endAt: day(3, 16),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.TODO,
      projectName: "Infra & DevOps",
      tagNames: ["deep-work"],
    },
    {
      title: "Write API docs",
      description: "Document all REST endpoints with request/response examples.",
      startAt: day(3, 15),
      endAt: day(3, 16, 30),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.TODO,
      projectName: "Dinox Core",
      tagNames: [],
    },
    {
      title: "Competitor analysis",
      description: "Notion calendar, Cron, Fantastical — feature matrix.",
      startAt: day(3, 16, 30),
      endAt: day(3, 18),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.TODO,
      projectName: "Research",
      tagNames: ["deep-work"],
    },
    {
      title: "Update landing page copy",
      description: "",
      startAt: day(3, 16),
      endAt: day(3, 17),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.TODO,
      projectName: "Marketing Site",
      tagNames: [],
    },

    // ── Friday (d=4) ────────────────────────────────────────────────────────

    {
      title: "Daily standup",
      description: "",
      startAt: day(4, 9),
      endAt: day(4, 9, 20),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.TODO,
      projectName: "Dinox Core",
      tagNames: ["meeting"],
    },
    {
      title: "Implement recurring events (spike)",
      description: "Research iCal RRULE and design schema changes.",
      startAt: day(4, 9, 30),
      endAt: day(4, 12),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.TODO,
      projectName: "Research",
      tagNames: ["deep-work"],
    },
    {
      title: "Performance audit",
      description: "Profile Electron startup, Next.js cold start, Prisma queries.",
      startAt: day(4, 10),
      endAt: day(4, 11, 30),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.TODO,
      projectName: "Infra & DevOps",
      tagNames: ["review"],
    },
    {
      title: "Design: onboarding flow",
      description: "3-step welcome screen for new users with no data.",
      startAt: day(4, 10, 30),
      endAt: day(4, 12),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.TODO,
      projectName: "Design System",
      tagNames: ["deep-work"],
    },
    {
      title: "Sprint retrospective",
      description: "What went well, what didn't, action items.",
      startAt: day(4, 12),
      endAt: day(4, 13),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.TODO,
      projectName: "Dinox Core",
      tagNames: ["meeting"],
    },
    {
      title: "Merge & release v0.2.1",
      description: "Tag, build .exe installer, upload to release page.",
      startAt: day(4, 14),
      endAt: day(4, 15),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.TODO,
      projectName: "Infra & DevOps",
      tagNames: ["urgent"],
    },
    {
      title: "Write week notes",
      description: "Personal summary of the week: wins, learnings, plan for next.",
      startAt: day(4, 15, 30),
      endAt: day(4, 16, 30),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.TODO,
      projectName: null,
      tagNames: ["personal"],
    },
    {
      title: "Team happy hour",
      description: "",
      startAt: day(4, 17),
      endAt: day(4, 18, 30),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.TODO,
      projectName: null,
      tagNames: ["personal"],
    },

    // ── Weekend (d=5 Sat, d=6 Sun) ──────────────────────────────────────────

    {
      title: "Read: Shape Up (basecamp)",
      description: "Chapters 4–7 on appetite and shaping.",
      startAt: day(5, 10),
      endAt: day(5, 12),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.TODO,
      projectName: "Research",
      tagNames: ["deep-work"],
    },
    {
      title: "Grocery shopping",
      description: "",
      startAt: day(5, 13),
      endAt: day(5, 14),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.TODO,
      projectName: null,
      tagNames: ["personal"],
    },
    {
      title: "Side project: experiment with SQLite WAL",
      description: "",
      startAt: day(5, 15),
      endAt: day(5, 17),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.TODO,
      projectName: "Research",
      tagNames: ["deep-work"],
    },
    {
      title: "Sunday rest / family time",
      description: "",
      startAt: day(6, 11),
      endAt: day(6, 18),
      allDay: false,
      kind: ItemKind.EVENT,
      status: ItemStatus.TODO,
      projectName: null,
      tagNames: ["personal"],
    },
    {
      title: "Plan next week",
      description: "Review inbox, set priorities, block deep-work slots.",
      startAt: day(6, 19),
      endAt: day(6, 20),
      allDay: false,
      kind: ItemKind.TASK,
      status: ItemStatus.TODO,
      projectName: null,
      tagNames: [],
    },
  ];

  for (const item of itemSeeds) {
    const projectId = item.projectName ? projectByName.get(item.projectName) ?? null : null;
    const tagIds = item.tagNames
      .map((name) => tagByName.get(name))
      .filter((id): id is string => Boolean(id));

    await prisma.item.create({
      data: {
        title: item.title,
        description: item.description,
        startAt: item.startAt,
        endAt: item.endAt,
        allDay: item.allDay,
        kind: item.kind,
        status: item.status,
        projectId,
        recurrenceRule: null,
        seriesId: null,
        parentId: null,
        externalSource: null,
        externalId: null,
        itemTags: {
          create: tagIds.map((tagId) => ({ tagId })),
        },
      },
    });
  }
}
