"use client";

import Link from "next/link";
import { differenceInMinutes, format, isPast, parseISO } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import {
  createItem,
  deleteItem,
  deleteProject,
  fetchItems,
  fetchProject,
  fetchProjects,
  fetchTags,
  updateItem,
  updateProject,
} from "@/src/ui/api/client";
import {
  ApiItem,
  ApiItemKind,
  ApiItemMutationInput,
  ApiItemStatus,
  ApiProject,
  ApiTag,
} from "@/src/ui/api/types";
import {
  applyAccentColor,
  applyThemeTokens,
  loadStoredThemeState,
  resolveTheme,
} from "@/src/ui/theme/theme-config";
import { loadPrefs } from "@/src/ui/prefs/prefs-config";
import { ItemModal } from "@/src/ui/calendar/item-modal";
import { defaultEndFromStart } from "@/src/ui/calendar/date-utils";
import { EmojiPicker } from "@/src/ui/components/emoji-picker";
import { ProjectDot } from "@/src/ui/components/project-pill";

interface ProjectShellProps {
  projectId: string;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--app-surface-2)_72%,var(--app-border)_28%)] ${className}`}
    />
  );
}

function ProjectSkeleton() {
  return (
    <div className="dinox-shell min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]" aria-hidden="true">
      <header className="sticky top-0 z-30 border-b border-[var(--app-border)] bg-[var(--app-bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-6 py-3">
          <SkeletonBlock className="h-7 w-20" />
          <SkeletonBlock className="h-4 w-2" />
          <SkeletonBlock className="h-7 w-40" />
          <div className="ml-auto flex gap-2">
            <SkeletonBlock className="h-7 w-14" />
            <SkeletonBlock className="h-7 w-20" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 flex items-start gap-4">
          <SkeletonBlock className="h-12 w-12 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-3">
            <SkeletonBlock className="h-9 w-64" />
            <SkeletonBlock className="h-4 w-72" />
            <SkeletonBlock className="h-1.5 w-full rounded-full" />
          </div>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3">
              <SkeletonBlock className="h-2.5 w-16" />
              <SkeletonBlock className="mt-3 h-8 w-12" />
              <SkeletonBlock className="mt-2 h-3 w-20" />
            </div>
          ))}
        </div>

        {Array.from({ length: 2 }, (_, sectionIndex) => (
          <section key={sectionIndex} className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <SkeletonBlock className="h-5 w-20" />
              <SkeletonBlock className="h-8 w-24" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, rowIndex) => (
                <div key={rowIndex} className="flex items-start gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2.5">
                  <SkeletonBlock className="mt-0.5 h-4 w-4" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-2/3" />
                    <SkeletonBlock className="h-3 w-1/2" />
                  </div>
                  <SkeletonBlock className="h-4 w-14" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

export function ProjectShell({ projectId }: ProjectShellProps) {
  const dateFnsLocale = useMemo(() => {
    const { appLocale } = loadPrefs();
    return appLocale === "ru" ? ru : enUS;
  }, []);

  const [project, setProject] = useState<ApiProject | null>(null);
  const [allProjects, setAllProjects] = useState<ApiProject[]>([]);
  const [tags, setTags] = useState<ApiTag[]>([]);
  const [items, setItems] = useState<ApiItem[]>([]);
  const [allItems, setAllItems] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Header edit state
  const [editingHeader, setEditingHeader] = useState(false);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#14b8a6");
  const [editEmoji, setEditEmoji] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);

  // Description inline edit
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");

  // Notes editor
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  const [tasksDoneExpanded, setTasksDoneExpanded] = useState(false);
  const [tasksCancelledExpanded, setTasksCancelledExpanded] = useState(false);
  const [pastEventsExpanded, setPastEventsExpanded] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<ApiItem | null>(null);
  const [draftStart, setDraftStart] = useState<Date>(new Date());
  const [draftEnd, setDraftEnd] = useState<Date>(defaultEndFromStart(new Date()));
  const [defaultKind, setDefaultKind] = useState<ApiItemKind>("TASK");

  const [itemMenuId, setItemMenuId] = useState<string | null>(null);

  // Add existing items picker
  const [addItemsOpen, setAddItemsOpen] = useState(false);
  const [addItemsKind, setAddItemsKind] = useState<ApiItemKind>("TASK");
  const [addItemsQuery, setAddItemsQuery] = useState("");
  const [addItemsSelection, setAddItemsSelection] = useState<Set<string>>(new Set());
  const [addItemsSaving, setAddItemsSaving] = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [proj, projs, tagsData, itemsData] = await Promise.all([
        fetchProject(projectId),
        fetchProjects(),
        fetchTags(),
        fetchItems(),
      ]);
      setProject(proj);
      setAllProjects(projs);
      setTags(tagsData);
      setAllItems(itemsData);
      setItems(itemsData.filter((i) => i.projectId === projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const stored = loadStoredThemeState();
    applyThemeTokens(resolveTheme(stored.mode, stored.customTheme));
    const { accentColor } = loadPrefs();
    applyAccentColor(accentColor);
  }, []);

  // Keep drafts in sync with project
  useEffect(() => {
    if (!project) return;
    setDescriptionDraft(project.description ?? "");
    setNotesDraft(project.notes ?? "");
  }, [project]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const tasks = useMemo(() => items.filter((i) => i.kind === "TASK"), [items]);
  const events = useMemo(() => items.filter((i) => i.kind === "EVENT"), [items]);

  const tasksTodo = useMemo(() => tasks.filter((i) => i.status === "TODO"), [tasks]);
  const tasksDone = useMemo(() => tasks.filter((i) => i.status === "DONE"), [tasks]);
  const tasksCancelled = useMemo(() => tasks.filter((i) => i.status === "CANCELLED"), [tasks]);

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((i) => !isPast(parseISO(i.endAt)))
        .sort((a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime()),
    [events]
  );
  const pastEvents = useMemo(
    () =>
      events
        .filter((i) => isPast(parseISO(i.endAt)))
        .sort((a, b) => parseISO(b.startAt).getTime() - parseISO(a.startAt).getTime()),
    [events]
  );

  const taskCompletionPct =
    tasks.length === 0 ? 0 : Math.round((tasksDone.length / tasks.length) * 100);

  const totalEventMinutes = useMemo(
    () =>
      events.reduce(
        (sum, i) => sum + differenceInMinutes(parseISO(i.endAt), parseISO(i.startAt)),
        0
      ),
    [events]
  );

  const usedTags = useMemo(() => {
    const ids = new Set(items.flatMap((i) => i.tags.map((t) => t.id)));
    return tags.filter((t) => ids.has(t.id));
  }, [items, tags]);

  // Items that can be assigned to this project (not already in it, matching kind/query)
  const assignableItems = useMemo(() => {
    const q = addItemsQuery.trim().toLowerCase();
    return allItems
      .filter((i) => i.kind === addItemsKind)
      .filter((i) => i.projectId !== projectId)
      .filter((i) => (q ? i.title.toLowerCase().includes(q) : true))
      .sort((a, b) => parseISO(b.updatedAt).getTime() - parseISO(a.updatedAt).getTime())
      .slice(0, 100);
  }, [allItems, addItemsKind, addItemsQuery, projectId]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function fmtDurationClean(minutes: number) {
    if (minutes === 0) return "-";
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  function fmtEventDateClean(item: ApiItem) {
    const start = parseISO(item.startAt);
    const end = parseISO(item.endAt);
    if (item.allDay) return format(start, "d MMM", { locale: dateFnsLocale });
    const sameDay = format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd");
    if (sameDay) {
      return `${format(start, "d MMM", { locale: dateFnsLocale })} · ${format(start, "HH:mm")}-${format(end, "HH:mm")}`;
    }

    return `${format(start, "d MMM HH:mm", { locale: dateFnsLocale })} - ${format(end, "d MMM HH:mm", { locale: dateFnsLocale })}`;
  }

  async function handleSaveHeader() {
    if (!project) return;
    setSaving(true);
    try {
      await updateProject(project.id, {
        name: editName.trim() || project.name,
        color: editColor,
        emoji: editEmoji.trim() || null,
      });
      setEditingHeader(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDescription() {
    if (!project) return;
    const next = descriptionDraft.trim() || null;
    if (next === (project.description ?? null)) {
      setEditingDescription(false);
      return;
    }
    try {
      await updateProject(project.id, { description: next });
      setEditingDescription(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save description.");
    }
  }

  async function handleSaveNotes() {
    if (!project) return;
    const next = notesDraft.trim() ? notesDraft : null;
    try {
      await updateProject(project.id, { notes: next });
      setEditingNotes(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notes.");
    }
  }

  async function handleArchive() {
    if (!project) return;
    setSaving(true);
    try {
      await updateProject(project.id, { archived: !project.archived });
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProject() {
    if (!project) return;
    setSaving(true);
    try {
      await deleteProject(project.id);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project.");
      setSaving(false);
    }
  }

  async function handleToggleDone(item: ApiItem) {
    if (item.kind !== "TASK") return;
    const newStatus: ApiItemStatus = item.status === "DONE" ? "TODO" : "DONE";
    try {
      await updateItem(item.id, { status: newStatus });
      await loadData();
    } catch {
      // silent
    }
  }

  async function handleSubmitItem(input: ApiItemMutationInput) {
    setSaving(true);
    setError("");
    try {
      if (modalMode === "create") {
        await createItem({ ...input, projectId });
      } else if (editingItem) {
        await updateItem(editingItem.id, input);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item.");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(id: string) {
    setSaving(true);
    try {
      await deleteItem(id);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleAttachExisting() {
    if (addItemsSelection.size === 0) return;
    setAddItemsSaving(true);
    try {
      const ids = Array.from(addItemsSelection);
      await Promise.all(ids.map((id) => updateItem(id, { projectId })));
      setAddItemsSelection(new Set());
      setAddItemsQuery("");
      setAddItemsOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to attach items.");
    } finally {
      setAddItemsSaving(false);
    }
  }

  function openCreate(kind: ApiItemKind) {
    const start = new Date();
    setDraftStart(start);
    setDraftEnd(defaultEndFromStart(start));
    setDefaultKind(kind);
    setModalMode("create");
    setEditingItem(null);
    setModalOpen(true);
  }

  function openAddExisting(kind: ApiItemKind) {
    setAddItemsKind(kind);
    setAddItemsQuery("");
    setAddItemsSelection(new Set());
    setAddItemsOpen(true);
  }

  function openEdit(item: ApiItem) {
    setDraftStart(parseISO(item.startAt));
    setDraftEnd(parseISO(item.endAt));
    setModalMode("edit");
    setEditingItem(item);
    setModalOpen(true);
    setItemMenuId(null);
  }

  // ── Sub-components ────────────────────────────────────────────────────────

  function TagPills({ item }: { item: ApiItem }) {
    if (!item.tags.length) return null;
    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {item.tags.map((tag) => (
          <span
            key={tag.id}
            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `color-mix(in srgb, ${tag.color} 18%, transparent)`,
              color: tag.color,
            }}
          >
            #{tag.name}
          </span>
        ))}
      </div>
    );
  }

  function ItemMenu({ item }: { item: ApiItem }) {
    const open = itemMenuId === item.id;
    return (
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setItemMenuId(open ? null : item.id)}
          className="flex h-6 w-5 items-center justify-center text-[var(--app-muted)] opacity-0 transition group-hover:opacity-100 hover:text-[var(--app-text)]"
        >
          ⋮
        </button>
        {open && (
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] p-1 shadow-xl">
            <button
              type="button"
              onClick={() => openEdit(item)}
              className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-[var(--app-text)] transition hover:bg-[var(--app-surface-2)]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={async () => {
                await updateItem(item.id, { projectId: null });
                setItemMenuId(null);
                await loadData();
              }}
              className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-[var(--app-text)] transition hover:bg-[var(--app-surface-2)]"
            >
              Detach from project
            </button>
            <button
              type="button"
              onClick={() => { void handleDeleteItem(item.id); setItemMenuId(null); }}
              className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-[var(--app-danger)] transition hover:bg-[var(--app-surface-2)]"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
  }

  function TaskRow({ item }: { item: ApiItem }) {
    const isDone = item.status === "DONE";
    const isCancelled = item.status === "CANCELLED";
    return (
      <div className="group flex items-start gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2.5 transition hover:-translate-y-px hover:border-[var(--app-border-strong)] hover:shadow-md">
        <button
          type="button"
          onClick={() => void handleToggleDone(item)}
          disabled={isCancelled}
          className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[9px] transition ${
            isDone
              ? "border-emerald-600 bg-emerald-600 text-white"
              : isCancelled
              ? "cursor-default border-[var(--app-border-strong)] opacity-30"
              : "border-[var(--app-border-strong)] text-transparent hover:border-emerald-500 hover:text-emerald-500"
          }`}
        >
          ✓
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm leading-snug ${
              isDone || isCancelled
                ? "line-through text-[var(--app-muted)]"
                : "text-[var(--app-text)]"
            }`}
          >
            {item.title}
          </p>
          {item.description && (
            <p className="mt-0.5 truncate text-xs text-[var(--app-muted)]">{item.description}</p>
          )}
          <TagPills item={item} />
        </div>
        <span className="mt-0.5 flex-shrink-0 font-mono text-[10px] text-[var(--app-muted)]">
          {format(parseISO(item.startAt), "d MMM", { locale: dateFnsLocale })}
        </span>
        <ItemMenu item={item} />
      </div>
    );
  }

  function EventRow({ item }: { item: ApiItem }) {
    const past = isPast(parseISO(item.endAt));
    const color = item.color ?? project?.color ?? "#64748b";
    const dur = differenceInMinutes(parseISO(item.endAt), parseISO(item.startAt));
    return (
      <div className="group flex items-start gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2.5 transition hover:-translate-y-px hover:border-[var(--app-border-strong)] hover:shadow-md">
        <div
          className="mt-1.5 h-2.5 w-1 flex-shrink-0 rounded-full"
          style={{ backgroundColor: color, opacity: past ? 0.4 : 0.9 }}
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm leading-snug ${
              past ? "text-[var(--app-muted)]" : "text-[var(--app-text)]"
            }`}
          >
            {item.title}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[var(--app-muted)]">
            {fmtEventDateClean(item)}
          </p>
          <TagPills item={item} />
        </div>
        <span className="mt-0.5 flex-shrink-0 font-mono text-[10px] text-[var(--app-muted)]">
          {fmtDurationClean(dur)}
        </span>
        <ItemMenu item={item} />
      </div>
    );
  }

  function SectionLabel({ label, count }: { label: string; count: number }) {
    return (
      <div className="mb-3 flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">
          {label}
        </span>
        <span className="rounded-full border border-[var(--app-border-strong)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--app-muted)]">
          {count}
        </span>
        <div className="flex-1 border-t border-[var(--app-border)]" />
      </div>
    );
  }

  function CollapseToggle({
    label,
    count,
    expanded,
    onToggle,
  }: {
    label: string;
    count: number;
    expanded: boolean;
    onToggle: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="mb-3 flex w-full items-center gap-3 text-left"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)] transition hover:text-[var(--app-text)]">
          {expanded ? "▾" : "▸"} {label}
        </span>
        <span className="rounded-full border border-[var(--app-border-strong)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--app-muted)]">
          {count}
        </span>
        <div className="flex-1 border-t border-[var(--app-border)]" />
      </button>
    );
  }

  function ItemActionBar({ kind, label }: { kind: ApiItemKind; label: { create: string; attach: string } }) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => openAddExisting(kind)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--app-border-strong)] px-3 py-1.5 text-xs text-[var(--app-muted)] transition hover:-translate-y-px hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]"
        >
          <span className="text-sm">📎</span> {label.attach}
        </button>
        <button
          type="button"
          onClick={() => openCreate(kind)}
          className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-px"
          style={{
            background: project
              ? `linear-gradient(135deg, color-mix(in srgb, ${project.color} 28%, transparent), color-mix(in srgb, ${project.color} 14%, transparent))`
              : undefined,
            borderColor: project
              ? `color-mix(in srgb, ${project.color} 55%, var(--app-border))`
              : "var(--app-border-strong)",
            color: project
              ? `color-mix(in srgb, ${project.color} 85%, var(--app-text))`
              : "var(--app-text)",
          }}
        >
          + {label.create}
        </button>
      </div>
    );
  }

  // ── Loading / error ───────────────────────────────────────────────────────

  if (loading) {
    return <ProjectSkeleton />;
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--app-bg)] text-[var(--app-text)]">
        <p className="text-lg font-medium">Project not found.</p>
        <Link href="/" className="text-sm text-[var(--app-accent)] hover:underline">
          ← Back to Calendar
        </Link>
      </div>
    );
  }

  // Convenience aliases
  const c = project.color;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="dinox-shell min-h-screen text-[var(--app-text)]"
      style={
        {
          background: `
            radial-gradient(900px 500px at 100% 0%, color-mix(in srgb, ${c} 18%, transparent) 0%, transparent 55%),
            radial-gradient(700px 500px at 0% 100%, color-mix(in srgb, ${c} 10%, transparent) 0%, transparent 55%),
            var(--app-bg)
          `,
          ["--project-color" as string]: c,
        } as CSSProperties
      }
    >
      {/* Click-outside overlay for item menus */}
      {itemMenuId && (
        <div className="fixed inset-0 z-40" onClick={() => setItemMenuId(null)} />
      )}

      {/* ── Top nav ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-bg)_92%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-3">
          <Link
            href="/"
            className="rounded-lg px-2 py-1 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
          >
            ← Calendar
          </Link>
          <span className="text-[var(--app-border-strong)]">/</span>
          <div className="flex items-center gap-2">
            <ProjectDot project={project} size={14} />
            <span className="text-sm font-medium text-[var(--app-text)]">{project.name}</span>
          </div>
          {project.archived && (
            <span className="rounded-full border border-[var(--app-border-strong)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--app-muted)]">
              Archived
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {!editingHeader && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditName(project.name);
                    setEditColor(project.color);
                    setEditEmoji(project.emoji ?? "");
                    setEditingHeader(true);
                  }}
                  className="rounded-lg border border-[var(--app-border-strong)] px-3 py-1 text-xs text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void handleArchive()}
                  disabled={saving}
                  className="rounded-lg border border-[var(--app-border-strong)] px-3 py-1 text-xs text-[var(--app-muted)] transition hover:text-[var(--app-text)] disabled:opacity-50"
                >
                  {project.archived ? "Unarchive" : "Archive"}
                </button>
                {confirmDeleteProject ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[var(--app-danger)]">Delete project?</span>
                    <button
                      type="button"
                      onClick={() => void handleDeleteProject()}
                      className="rounded-lg bg-[var(--app-danger)] px-2.5 py-1 text-xs font-semibold text-white"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteProject(false)}
                      className="rounded-lg border border-[var(--app-border-strong)] px-2.5 py-1 text-xs text-[var(--app-muted)]"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteProject(true)}
                    className="rounded-lg border border-[var(--app-danger)] px-3 py-1 text-xs text-[var(--app-danger)] transition hover:opacity-80"
                  >
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-[var(--app-danger)] bg-[color-mix(in_srgb,var(--app-danger)_8%,transparent)] px-4 py-2 text-sm text-[var(--app-danger)]">
            {error}
          </div>
        )}

        {/* ── Project header ──────────────────────────────────────────── */}
        <div className="mb-8">
          {editingHeader ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  className="flex h-12 w-14 items-center justify-center rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] text-2xl leading-none transition hover:border-[var(--app-accent)]"
                  title="Pick emoji"
                >
                  {editEmoji || "😀"}
                </button>
                {showEmojiPicker && (
                  <div className="absolute left-0 top-full z-50 mt-2">
                    <EmojiPicker
                      onSelect={(e) => { setEditEmoji(e); setShowEmojiPicker(false); }}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </div>
                )}
              </div>
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="h-12 w-12 cursor-pointer rounded-xl border border-[var(--app-border-strong)] p-1"
              />
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleSaveHeader(); if (e.key === "Escape") setEditingHeader(false); }}
                className="flex-1 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-4 py-3 text-2xl font-bold text-[var(--app-text)] focus:border-[var(--app-accent)]"
              />
              <button
                type="button"
                onClick={() => void handleSaveHeader()}
                disabled={saving}
                className="rounded-xl bg-[var(--app-accent)] px-4 py-3 text-sm font-semibold text-[var(--app-bg)] transition hover:bg-[var(--app-accent-strong)] disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingHeader(false)}
                className="rounded-xl border border-[var(--app-border-strong)] px-4 py-3 text-sm text-[var(--app-muted)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-4xl leading-none"
                style={{
                  background: `linear-gradient(135deg, color-mix(in srgb, ${c} 22%, var(--app-surface)), color-mix(in srgb, ${c} 8%, var(--app-surface)))`,
                  borderColor: `color-mix(in srgb, ${c} 40%, var(--app-border))`,
                  boxShadow: `0 8px 28px color-mix(in srgb, ${c} 22%, transparent)`,
                }}
              >
                {project.emoji ?? (
                  <div
                    className="h-5 w-5 rounded-full"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, color-mix(in srgb, ${c} 90%, white), ${c})`,
                      boxShadow: `0 0 14px color-mix(in srgb, ${c} 55%, transparent)`,
                    }}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-bold tracking-tight text-[var(--app-text)]">
                  {project.name}
                </h1>

                {/* Inline-editable description */}
                <div className="mt-1">
                  {editingDescription ? (
                    <input
                      autoFocus
                      value={descriptionDraft}
                      onChange={(e) => setDescriptionDraft(e.target.value)}
                      onBlur={() => void handleSaveDescription()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleSaveDescription();
                        if (e.key === "Escape") {
                          setDescriptionDraft(project.description ?? "");
                          setEditingDescription(false);
                        }
                      }}
                      placeholder="Add a short description…"
                      className="w-full rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-3 py-1.5 text-sm text-[var(--app-text)] focus:border-[var(--app-accent)]"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingDescription(true)}
                      className="group/desc -ml-2 max-w-full rounded-lg px-2 py-1 text-left text-sm transition hover:bg-[var(--app-surface-2)]"
                    >
                      {project.description ? (
                        <span className="text-[var(--app-text)]">{project.description}</span>
                      ) : (
                        <span className="italic text-[var(--app-subtle-text)] opacity-70 group-hover/desc:opacity-100">
                          + Add a short description…
                        </span>
                      )}
                    </button>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[var(--app-muted)]">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                  {usedTags.length > 0 && (
                    <span className="text-[var(--app-border-strong)]">·</span>
                  )}
                  {usedTags.map((t) => (
                    <span
                      key={t.id}
                      className="rounded-full px-1.5 py-0.5 text-[11px] font-medium"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${t.color} 16%, transparent)`,
                        color: t.color,
                      }}
                    >
                      #{t.name}
                    </span>
                  ))}
                </div>
                {tasks.length > 0 && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--app-border-strong)]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${taskCompletionPct}%`,
                          background: `linear-gradient(90deg, ${c}, color-mix(in srgb, ${c} 70%, white))`,
                          boxShadow: `0 0 10px color-mix(in srgb, ${c} 40%, transparent)`,
                        }}
                      />
                    </div>
                    <span className="flex-shrink-0 font-mono text-xs text-[var(--app-muted)]">
                      {tasksDone.length}/{tasks.length} tasks · {taskCompletionPct}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Stats strip ─────────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Tasks",
              value: tasks.length,
              sub: tasks.length > 0 ? `${taskCompletionPct}% done` : "none yet",
            },
            {
              label: "Done",
              value: tasksDone.length,
              sub: tasksCancelled.length > 0 ? `${tasksCancelled.length} cancelled` : "all clear",
            },
            {
              label: "Events",
              value: events.length,
              sub: `${upcomingEvents.length} upcoming`,
            },
            {
              label: "Total time",
              value: fmtDurationClean(totalEventMinutes),
              sub: events.length === 0 ? "no events" : `across ${events.length} events`,
            },
          ].map(({ label, value, sub }) => (
            <div
              key={label}
              className="rounded-2xl border bg-[var(--app-surface)] px-4 py-3 transition hover:-translate-y-px"
              style={{
                borderColor: `color-mix(in srgb, ${c} 14%, var(--app-border))`,
                boxShadow: `0 4px 16px color-mix(in srgb, ${c} 6%, transparent)`,
              }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">
                {label}
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--app-text)]">{value}</p>
              <p className="text-[11px] text-[var(--app-muted)]">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Notes ───────────────────────────────────────────────────── */}
        <section className="mb-8">
          <div
            className="rounded-2xl border bg-[var(--app-surface)] p-5 transition"
            style={{
              borderColor: `color-mix(in srgb, ${c} 16%, var(--app-border))`,
              boxShadow: `0 8px 28px color-mix(in srgb, ${c} 7%, transparent)`,
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
                  style={{
                    background: `color-mix(in srgb, ${c} 22%, transparent)`,
                    color: `color-mix(in srgb, ${c} 90%, var(--app-text))`,
                  }}
                >
                  📝
                </span>
                <h2 className="text-sm font-semibold text-[var(--app-text)]">Notes</h2>
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--app-subtle-text)]">
                  project journal
                </span>
              </div>
              {!editingNotes ? (
                <button
                  type="button"
                  onClick={() => setEditingNotes(true)}
                  className="rounded-lg border border-[var(--app-border-strong)] px-3 py-1 text-xs text-[var(--app-muted)] transition hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]"
                >
                  {project.notes ? "Edit" : "+ Add notes"}
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleSaveNotes()}
                    className="rounded-lg bg-[var(--app-accent)] px-3 py-1 text-xs font-semibold text-[var(--app-bg)] transition hover:bg-[var(--app-accent-strong)]"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotesDraft(project.notes ?? "");
                      setEditingNotes(false);
                    }}
                    className="rounded-lg border border-[var(--app-border-strong)] px-3 py-1 text-xs text-[var(--app-muted)]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {editingNotes ? (
              <textarea
                autoFocus
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Jot down thoughts, decisions, links, references — anything that belongs to this project…"
                rows={8}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void handleSaveNotes();
                  }
                  if (e.key === "Escape") {
                    setNotesDraft(project.notes ?? "");
                    setEditingNotes(false);
                  }
                }}
                className="w-full resize-y rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-bg)] px-4 py-3 text-sm leading-relaxed text-[var(--app-text)] placeholder:text-[var(--app-subtle-text)] focus:border-[var(--app-accent)]"
              />
            ) : project.notes ? (
              <div className="whitespace-pre-wrap rounded-xl bg-[var(--app-surface-2)] px-4 py-3 text-sm leading-relaxed text-[var(--app-text)]">
                {project.notes}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingNotes(true)}
                className="w-full rounded-xl border border-dashed border-[var(--app-border-strong)] px-4 py-8 text-center text-sm text-[var(--app-subtle-text)] transition hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]"
              >
                Click to start writing notes…
              </button>
            )}
            {editingNotes && (
              <p className="mt-2 text-[11px] text-[var(--app-subtle-text)]">
                Tip: <kbd className="rounded border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-1 font-mono">Ctrl/⌘ + Enter</kbd> to save, <kbd className="rounded border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-1 font-mono">Esc</kbd> to cancel.
              </p>
            )}
          </div>
        </section>

        {/* ── Tasks ───────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--app-text)]">Tasks</h2>
            <ItemActionBar kind="TASK" label={{ create: "New task", attach: "Attach existing" }} />
          </div>

          {tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--app-border-strong)] px-6 py-10 text-center">
              <p className="text-sm text-[var(--app-muted)]">No tasks yet.</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => openCreate("TASK")}
                  className="rounded-lg bg-[var(--app-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--app-bg)] transition hover:bg-[var(--app-accent-strong)]"
                >
                  + New task
                </button>
                <button
                  type="button"
                  onClick={() => openAddExisting("TASK")}
                  className="rounded-lg border border-[var(--app-border-strong)] px-3 py-1.5 text-xs text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                >
                  Attach existing
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {tasksTodo.length > 0 && (
                <div>
                  <SectionLabel label="To do" count={tasksTodo.length} />
                  <div className="space-y-2">
                    {tasksTodo.map((item) => (
                      <TaskRow key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {tasksDone.length > 0 && (
                <div>
                  <CollapseToggle
                    label="Done"
                    count={tasksDone.length}
                    expanded={tasksDoneExpanded}
                    onToggle={() => setTasksDoneExpanded((x) => !x)}
                  />
                  {tasksDoneExpanded && (
                    <div className="space-y-2">
                      {tasksDone.map((item) => (
                        <TaskRow key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tasksCancelled.length > 0 && (
                <div>
                  <CollapseToggle
                    label="Cancelled"
                    count={tasksCancelled.length}
                    expanded={tasksCancelledExpanded}
                    onToggle={() => setTasksCancelledExpanded((x) => !x)}
                  />
                  {tasksCancelledExpanded && (
                    <div className="space-y-2">
                      {tasksCancelled.map((item) => (
                        <TaskRow key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Events ──────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--app-text)]">Events</h2>
            <ItemActionBar kind="EVENT" label={{ create: "New event", attach: "Attach existing" }} />
          </div>

          {events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--app-border-strong)] px-6 py-10 text-center">
              <p className="text-sm text-[var(--app-muted)]">No events yet.</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => openCreate("EVENT")}
                  className="rounded-lg bg-[var(--app-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--app-bg)] transition hover:bg-[var(--app-accent-strong)]"
                >
                  + New event
                </button>
                <button
                  type="button"
                  onClick={() => openAddExisting("EVENT")}
                  className="rounded-lg border border-[var(--app-border-strong)] px-3 py-1.5 text-xs text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                >
                  Attach existing
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {upcomingEvents.length > 0 && (
                <div>
                  <SectionLabel label="Upcoming" count={upcomingEvents.length} />
                  <div className="space-y-2">
                    {upcomingEvents.map((item) => (
                      <EventRow key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {pastEvents.length > 0 && (
                <div>
                  <CollapseToggle
                    label="Past events"
                    count={pastEvents.length}
                    expanded={pastEventsExpanded}
                    onToggle={() => setPastEventsExpanded((x) => !x)}
                  />
                  {pastEventsExpanded && (
                    <div className="space-y-2">
                      {pastEvents.map((item) => (
                        <EventRow key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* ── Add existing items picker (modal) ─────────────────────────── */}
      {addItemsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAddItemsOpen(false)}
        >
          <div
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border bg-[var(--app-surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              borderColor: `color-mix(in srgb, ${c} 32%, var(--app-border-strong))`,
              boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px color-mix(in srgb, ${c} 24%, transparent)`,
            }}
          >
            <div className="border-b border-[var(--app-border)] px-5 py-4">
              <h3 className="text-base font-semibold text-[var(--app-text)]">
                Attach existing {addItemsKind === "TASK" ? "tasks" : "events"}
              </h3>
              <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                Move items into <span className="font-semibold text-[var(--app-text)]">{project.name}</span>. They'll keep their data — only the project changes.
              </p>
            </div>

            <div className="border-b border-[var(--app-border)] p-3">
              <input
                autoFocus
                type="search"
                value={addItemsQuery}
                onChange={(e) => setAddItemsQuery(e.target.value)}
                placeholder={`Search ${addItemsKind === "TASK" ? "tasks" : "events"}…`}
                className="w-full rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] focus:border-[var(--app-accent)]"
              />
            </div>

            <div className="max-h-[52vh] min-h-[180px] overflow-y-auto">
              {assignableItems.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-[var(--app-muted)]">
                  {allItems.filter((i) => i.kind === addItemsKind && i.projectId !== projectId).length === 0
                    ? `No ${addItemsKind === "TASK" ? "tasks" : "events"} available to attach.`
                    : "No matches."}
                </div>
              ) : (
                <ul className="divide-y divide-[var(--app-border)]">
                  {assignableItems.map((item) => {
                    const selected = addItemsSelection.has(item.id);
                    const currentProject = item.project;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setAddItemsSelection((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.id)) next.delete(item.id);
                              else next.add(item.id);
                              return next;
                            });
                          }}
                          className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition ${
                            selected
                              ? "bg-[color-mix(in_srgb,var(--project-color)_10%,transparent)]"
                              : "hover:bg-[var(--app-surface-2)]"
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                              selected
                                ? "border-[var(--project-color)] text-white"
                                : "border-[var(--app-border-strong)] text-transparent"
                            }`}
                            style={{
                              background: selected ? c : "transparent",
                            }}
                          >
                            ✓
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[var(--app-text)]">
                              {item.title}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--app-muted)]">
                              <span className="font-mono">
                                {format(parseISO(item.startAt), "d MMM", { locale: ru })}
                              </span>
                              {currentProject && (
                                <>
                                  <span className="text-[var(--app-border-strong)]">·</span>
                                  <span className="inline-flex items-center gap-1">
                                    <span
                                      className="h-1.5 w-1.5 rounded-full"
                                      style={{ backgroundColor: currentProject.color }}
                                    />
                                    <span>from {currentProject.name}</span>
                                  </span>
                                </>
                              )}
                              {!currentProject && (
                                <>
                                  <span className="text-[var(--app-border-strong)]">·</span>
                                  <span className="italic text-[var(--app-subtle-text)]">unassigned</span>
                                </>
                              )}
                              <span className="ml-auto rounded-full border border-[var(--app-border-strong)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide">
                                {item.status}
                              </span>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-3">
              <div className="text-xs text-[var(--app-muted)]">
                {addItemsSelection.size > 0 ? (
                  <span>
                    <span className="font-semibold text-[var(--app-text)]">{addItemsSelection.size}</span> selected
                  </span>
                ) : (
                  <span>Select items to attach</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddItemsOpen(false)}
                  className="rounded-lg border border-[var(--app-border-strong)] px-3 py-1.5 text-xs text-[var(--app-muted)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleAttachExisting()}
                  disabled={addItemsSelection.size === 0 || addItemsSaving}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40"
                  style={{
                    background: `linear-gradient(135deg, ${c}, color-mix(in srgb, ${c} 70%, black))`,
                    color: "#fff",
                    boxShadow: `0 4px 14px color-mix(in srgb, ${c} 35%, transparent)`,
                  }}
                >
                  {addItemsSaving ? "Attaching…" : `Attach ${addItemsSelection.size || ""}`.trim()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item modal */}
      <ItemModal
        open={modalOpen}
        mode={modalMode}
        item={editingItem}
        initialStart={draftStart}
        initialEnd={draftEnd}
        defaultKind={defaultKind}
        defaultProjectId={projectId}
        projects={allProjects}
        tags={tags}
        timeFormat={loadPrefs().timeFormat}
        onSubmit={handleSubmitItem}
        onDelete={handleDeleteItem}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
