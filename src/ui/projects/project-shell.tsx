"use client";

import Link from "next/link";
import { differenceInMinutes, format, isPast, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useState } from "react";
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

interface ProjectShellProps {
  projectId: string;
}

export function ProjectShell({ projectId }: ProjectShellProps) {
  const [project, setProject] = useState<ApiProject | null>(null);
  const [allProjects, setAllProjects] = useState<ApiProject[]>([]);
  const [tags, setTags] = useState<ApiTag[]>([]);
  const [items, setItems] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingHeader, setEditingHeader] = useState(false);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#14b8a6");
  const [editEmoji, setEditEmoji] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);

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

  // ── Helpers ───────────────────────────────────────────────────────────────

  function fmtDuration(minutes: number) {
    if (minutes === 0) return "—";
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  function fmtEventDate(item: ApiItem) {
    const start = parseISO(item.startAt);
    const end = parseISO(item.endAt);
    if (item.allDay) return format(start, "d MMM", { locale: ru });
    const sameDay = format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd");
    if (sameDay)
      return `${format(start, "d MMM", { locale: ru })} · ${format(start, "HH:mm")}–${format(end, "HH:mm")}`;
    return `${format(start, "d MMM HH:mm", { locale: ru })} – ${format(end, "d MMM HH:mm", { locale: ru })}`;
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleSaveHeader() {
    if (!project) return;
    setSaving(true);
    try {
      await updateProject(project.id, {
        name: editName.trim() || project.name,
        color: editColor,
        emoji: editEmoji.trim() || null,
        archived: project.archived,
      });
      setEditingHeader(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project.");
    } finally {
      setSaving(false);
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

  function openCreate(kind: ApiItemKind) {
    const start = new Date();
    setDraftStart(start);
    setDraftEnd(defaultEndFromStart(start));
    setDefaultKind(kind);
    setModalMode("create");
    setEditingItem(null);
    setModalOpen(true);
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
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[110px] rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] p-1 shadow-xl">
            <button
              type="button"
              onClick={() => openEdit(item)}
              className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-[var(--app-text)] transition hover:bg-[var(--app-surface-2)]"
            >
              Edit
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
      <div className="group flex items-start gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2.5 transition hover:border-[var(--app-border-strong)]">
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
          {format(parseISO(item.startAt), "d MMM", { locale: ru })}
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
      <div className="group flex items-start gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2.5 transition hover:border-[var(--app-border-strong)]">
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
            {fmtEventDate(item)}
          </p>
          <TagPills item={item} />
        </div>
        <span className="mt-0.5 flex-shrink-0 font-mono text-[10px] text-[var(--app-muted)]">
          {fmtDuration(dur)}
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
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">
          {expanded ? "▾" : "▸"} {label}
        </span>
        <span className="rounded-full border border-[var(--app-border-strong)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--app-muted)]">
          {count}
        </span>
        <div className="flex-1 border-t border-[var(--app-border)]" />
      </button>
    );
  }

  // ── Loading / error ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] text-[var(--app-muted)]">
        Loading…
      </div>
    );
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="dinox-shell min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      {/* Click-outside overlay for item menus */}
      {itemMenuId && (
        <div className="fixed inset-0 z-40" onClick={() => setItemMenuId(null)} />
      )}

      {/* ── Top nav ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--app-border)] bg-[var(--app-bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-6 py-3">
          <Link
            href="/"
            className="rounded-lg px-2 py-1 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
          >
            ← Calendar
          </Link>
          <span className="text-[var(--app-border-strong)]">/</span>
          <div className="flex items-center gap-2">
            {project.emoji ? (
              <span className="text-base leading-none">{project.emoji}</span>
            ) : (
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: project.color }}
              />
            )}
            <span className="text-sm text-[var(--app-text)]">{project.name}</span>
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

      <main className="mx-auto max-w-4xl px-6 py-8">
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
                  className="flex h-10 w-12 items-center justify-center rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] text-2xl leading-none transition hover:border-[var(--app-accent)]"
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
                className="h-10 w-10 cursor-pointer rounded-xl border border-[var(--app-border-strong)] p-1"
              />
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleSaveHeader(); if (e.key === "Escape") setEditingHeader(false); }}
                className="flex-1 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-4 py-2 text-2xl font-bold text-[var(--app-text)] focus:border-[var(--app-accent)]"
              />
              <button
                type="button"
                onClick={() => void handleSaveHeader()}
                disabled={saving}
                className="rounded-xl bg-[var(--app-accent)] px-4 py-2 text-sm font-semibold text-[var(--app-bg)] transition hover:bg-[var(--app-accent-strong)] disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingHeader(false)}
                className="rounded-xl border border-[var(--app-border-strong)] px-4 py-2 text-sm text-[var(--app-muted)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              {project.emoji ? (
                <span className="mt-1 text-4xl leading-none">{project.emoji}</span>
              ) : (
                <div
                  className="mt-1.5 h-4 w-4 flex-shrink-0 rounded-full"
                  style={{
                    backgroundColor: project.color,
                    boxShadow: `0 0 20px color-mix(in srgb, ${project.color} 45%, transparent)`,
                  }}
                />
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-bold tracking-tight text-[var(--app-text)]">
                  {project.name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[var(--app-muted)]">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                  {usedTags.length > 0 && (
                    <span className="text-[var(--app-border-strong)]">·</span>
                  )}
                  {usedTags.map((t) => (
                    <span
                      key={t.id}
                      className="text-sm font-medium"
                      style={{ color: t.color }}
                    >
                      #{t.name}
                    </span>
                  ))}
                </div>
                {tasks.length > 0 && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--app-border-strong)]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${taskCompletionPct}%`,
                          backgroundColor: project.color,
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
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              value: fmtDuration(totalEventMinutes),
              sub: events.length === 0 ? "no events" : `across ${events.length} events`,
            },
          ].map(({ label, value, sub }) => (
            <div
              key={label}
              className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">
                {label}
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--app-text)]">{value}</p>
              <p className="text-[11px] text-[var(--app-muted)]">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Tasks ───────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--app-text)]">Tasks</h2>
            <button
              type="button"
              onClick={() => openCreate("TASK")}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--app-border-strong)] px-3 py-1.5 text-xs text-[var(--app-muted)] transition hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]"
            >
              + New task
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--app-border-strong)] px-6 py-10 text-center">
              <p className="text-sm text-[var(--app-muted)]">No tasks yet.</p>
              <button
                type="button"
                onClick={() => openCreate("TASK")}
                className="mt-2 text-xs text-[var(--app-accent)] transition hover:underline"
              >
                Create first task →
              </button>
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
            <button
              type="button"
              onClick={() => openCreate("EVENT")}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--app-border-strong)] px-3 py-1.5 text-xs text-[var(--app-muted)] transition hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]"
            >
              + New event
            </button>
          </div>

          {events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--app-border-strong)] px-6 py-10 text-center">
              <p className="text-sm text-[var(--app-muted)]">No events yet.</p>
              <button
                type="button"
                onClick={() => openCreate("EVENT")}
                className="mt-2 text-xs text-[var(--app-accent)] transition hover:underline"
              >
                Create first event →
              </button>
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
