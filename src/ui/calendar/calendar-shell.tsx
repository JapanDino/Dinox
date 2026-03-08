"use client";

import Link from "next/link";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type Event,
  type SlotInfo,
  type View,
} from "react-big-calendar";
import { addDays, addMonths, addWeeks, format, getDay, parse, startOfWeek } from "date-fns";
import { ru } from "date-fns/locale";
import {
  createItem,
  createProject,
  createTag,
  deleteItem,
  deleteProject,
  deleteTag,
  fetchItems,
  fetchProjects,
  fetchTags,
  updateItem,
  updateProject,
  updateTag,
} from "@/src/ui/api/client";
import {
  ApiItem,
  ApiItemMutationInput,
  ApiItemStatus,
  ApiProject,
  ApiTag,
} from "@/src/ui/api/types";
import { applyThemeTokens, loadStoredThemeState, resolveTheme } from "@/src/ui/theme/theme-config";
import { loadPrefs } from "@/src/ui/prefs/prefs-config";
import { defaultEndFromStart } from "./date-utils";
import { AgendaWorkspace } from "./agenda-workspace";
import { ItemModal } from "./item-modal";

const locales = { ru };

type CalendarEvent = Event & { resource: ApiItem };

const viewOptions: View[] = ["month", "week", "day", "agenda"];

const viewLabels: Record<View, string> = {
  month: "Month",
  week: "Week",
  work_week: "Work Week",
  day: "Day",
  agenda: "Agenda",
};

const statusLabels: Record<ApiItemStatus, string> = {
  TODO: "To do",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

const calendarMinTime = new Date(1970, 0, 1, 0, 0, 0);
const calendarMaxTime = new Date(1970, 0, 1, 23, 59, 59);
const calendarScrollTime = new Date(1970, 0, 1, 8, 0, 0);

export function CalendarShell() {
  const prefs = useMemo(() => loadPrefs(), []);

  const localizer = useMemo(
    () =>
      dateFnsLocalizer({
        format,
        parse,
        startOfWeek: (targetDate: Date) =>
          startOfWeek(targetDate, {
            weekStartsOn: prefs.weekStart === "sunday" ? 0 : 1,
          }),
        getDay,
        locales,
      }),
    [prefs.weekStart]
  );

  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [tags, setTags] = useState<ApiTag[]>([]);
  const [items, setItems] = useState<ApiItem[]>([]);
  const [view, setView] = useState<View>(prefs.defaultView as View);
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [visibleProjectIds, setVisibleProjectIds] = useState<string[]>([]);
  const [showUnassigned, setShowUnassigned] = useState(true);
  const [activeTagFilterIds, setActiveTagFilterIds] = useState<string[]>([]);

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("#14b8a6");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#818cf8");

  // Inline editing state — projects
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectDraft, setEditProjectDraft] = useState({ name: "", color: "#14b8a6" });
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<string | null>(null);

  // Inline editing state — tags
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagDraft, setEditTagDraft] = useState({ name: "", color: "#818cf8" });
  const [confirmDeleteTagId, setConfirmDeleteTagId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<ApiItem | null>(null);
  const [draftStart, setDraftStart] = useState<Date>(new Date());
  const [draftEnd, setDraftEnd] = useState<Date>(defaultEndFromStart(new Date()));
  const initializedFromUrl = useRef(false);

  const loadCalendarData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [projectsData, tagsData, itemsData] = await Promise.all([
        fetchProjects(),
        fetchTags(),
        fetchItems(),
      ]);
      setProjects(projectsData);
      setTags(tagsData);
      setItems(itemsData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load calendar data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCalendarData();
  }, [loadCalendarData]);

  useEffect(() => {
    const stored = loadStoredThemeState();
    applyThemeTokens(resolveTheme(stored.mode, stored.customTheme));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const viewParam = params.get("view");
    if (viewParam && viewOptions.includes(viewParam as View)) {
      setView(viewParam as View);
    }

    const dateParam = params.get("date");
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (!Number.isNaN(parsedDate.getTime())) {
        setDate(parsedDate);
      }
    }

    const searchParam = params.get("q");
    if (searchParam) {
      setSearchQuery(searchParam);
    }

    initializedFromUrl.current = true;
  }, []);

  useEffect(() => {
    if (!initializedFromUrl.current) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set("view", view);
    params.set("date", date.toISOString().slice(0, 10));

    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length > 0) {
      params.set("q", trimmedQuery);
    } else {
      params.delete("q");
    }

    const query = params.toString();
    const hash = window.location.hash;
    const nextUrl = `${window.location.pathname}${query.length > 0 ? `?${query}` : ""}${hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [view, date, searchQuery]);

  useEffect(() => {
    const projectIds = projects.map((project) => project.id);

    setVisibleProjectIds((current) => {
      if (current.length === 0) {
        return projectIds;
      }

      const existing = current.filter((id) => projectIds.includes(id));
      const missing = projectIds.filter((id) => !existing.includes(id));
      return [...existing, ...missing];
    });
  }, [projects]);

  useEffect(() => {
    const tagIds = tags.map((tag) => tag.id);
    setActiveTagFilterIds((current) => current.filter((id) => tagIds.includes(id)));
  }, [tags]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const tag = target.tagName;

      // Skip when typing in inputs or when a modal is open
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (modalOpen) return;

      if (event.ctrlKey && event.key === "1") {
        event.preventDefault();
        setView("month");
        setDate(new Date());
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) return;

      switch (event.key) {
        case "n":
        case "N":
          event.preventDefault();
          openNewItemModal(date, defaultEndFromStart(date));
          break;
        case "t":
        case "T":
          event.preventDefault();
          setDate(new Date());
          break;
        case "f":
        case "F":
          event.preventDefault();
          handleFocusWorkProjectRef.current?.();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [date, modalOpen]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const projectMatches = item.projectId ? visibleProjectIds.includes(item.projectId) : showUnassigned;
      const tagsMatch =
        activeTagFilterIds.length === 0 || item.tags.some((tag) => activeTagFilterIds.includes(tag.id));
      const queryMatches =
        normalizedQuery.length === 0 ||
        item.title.toLowerCase().includes(normalizedQuery) ||
        (item.description ?? "").toLowerCase().includes(normalizedQuery);

      return projectMatches && tagsMatch && queryMatches;
    });
  }, [items, visibleProjectIds, showUnassigned, activeTagFilterIds, searchQuery]);

  const events = useMemo<CalendarEvent[]>(() => {
    return filteredItems.map((item) => ({
      title: item.title,
      start: new Date(item.startAt),
      end: new Date(item.endAt),
      allDay: item.allDay,
      resource: item,
    }));
  }, [filteredItems]);

  const agendaGroups = useMemo(() => {
    const grouped = new Map<string, ApiItem[]>();

    [...filteredItems]
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .forEach((item) => {
        const groupKey = format(new Date(item.startAt), "yyyy-MM-dd");
        const groupItems = grouped.get(groupKey) ?? [];
        groupItems.push(item);
        grouped.set(groupKey, groupItems);
      });

    return [...grouped.entries()].map(([groupKey, groupItems]) => ({
      groupKey,
      title: format(new Date(groupKey), "EEEE", { locale: ru }),
      dateLabel: format(new Date(groupKey), "dd MMM", { locale: ru }),
      items: groupItems,
    }));
  }, [filteredItems]);

  const agendaStats = useMemo(() => {
    const todayKey = format(new Date(), "yyyy-MM-dd");

    const todayItems = filteredItems.filter(
      (item) => format(new Date(item.startAt), "yyyy-MM-dd") === todayKey
    ).length;

    const doneItems = filteredItems.filter((item) => item.status === "DONE").length;

    const workItems = filteredItems.filter((item) =>
      (item.project?.name ?? "").toLowerCase().includes("work")
    ).length;

    return {
      totalItems: filteredItems.length,
      todayItems,
      doneItems,
      workItems,
    };
  }, [filteredItems]);

  const currentTitle = useMemo(() => {
    if (view === "month") {
      return format(date, "LLLL yyyy", { locale: ru });
    }

    if (view === "week") {
      const start = startOfWeek(date, { locale: ru });
      const end = addDays(start, 6);
      return `${format(start, "d MMM", { locale: ru })} - ${format(end, "d MMM yyyy", { locale: ru })}`;
    }

    if (view === "agenda") {
      return `Agenda · ${format(date, "LLLL yyyy", { locale: ru })}`;
    }

    return format(date, "d MMMM yyyy", { locale: ru });
  }, [date, view]);

  const isWeekView = view === "week";
  const isDayView = view === "day";
  const isTimeGridView = isWeekView || isDayView;
  const showAgendaPreview = !isTimeGridView;

  function openNewItemModal(start: Date, end?: Date) {
    setDraftStart(start);
    setDraftEnd(end ?? defaultEndFromStart(start));
    setModalMode("create");
    setEditingItem(null);
    setModalOpen(true);
  }

  function openEditItemModal(item: ApiItem) {
    setDraftStart(new Date(item.startAt));
    setDraftEnd(new Date(item.endAt));
    setModalMode("edit");
    setEditingItem(item);
    setModalOpen(true);
  }

  async function handleSubmit(input: ApiItemMutationInput) {
    setSaving(true);
    setError("");

    try {
      if (modalMode === "create") {
        await createItem(input);
      } else if (editingItem) {
        await updateItem(editingItem.id, input);
      }

      await loadCalendarData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save item.");
      throw submitError;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    setError("");

    try {
      await deleteItem(id);
      await loadCalendarData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete item.");
      throw deleteError;
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newProjectName.trim()) {
      return;
    }

    setError("");

    try {
      await createProject({
        name: newProjectName.trim(),
        color: newProjectColor,
        archived: false,
      });

      setNewProjectName("");
      await loadCalendarData();
    } catch (projectError) {
      setError(projectError instanceof Error ? projectError.message : "Failed to create project.");
    }
  }

  async function handleCreateTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newTagName.trim()) {
      return;
    }

    setError("");

    try {
      await createTag({
        name: newTagName.trim(),
        color: newTagColor,
      });

      setNewTagName("");
      await loadCalendarData();
    } catch (tagError) {
      setError(tagError instanceof Error ? tagError.message : "Failed to create tag.");
    }
  }

  function handleEditProject(project: ApiProject) {
    setEditingProjectId(project.id);
    setEditProjectDraft({ name: project.name, color: project.color });
    setConfirmDeleteProjectId(null);
  }

  async function handleSaveProject(projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    setError("");

    try {
      await updateProject(projectId, {
        name: editProjectDraft.name.trim() || project.name,
        color: editProjectDraft.color,
        archived: project.archived,
      });

      setEditingProjectId(null);
      await loadCalendarData();
    } catch (projectError) {
      setError(projectError instanceof Error ? projectError.message : "Failed to update project.");
    }
  }

  async function handleDeleteProject(projectId: string) {
    if (confirmDeleteProjectId !== projectId) {
      setConfirmDeleteProjectId(projectId);
      setEditingProjectId(null);
      return;
    }

    setConfirmDeleteProjectId(null);
    setError("");

    try {
      await deleteProject(projectId);
      await loadCalendarData();
    } catch (projectError) {
      setError(projectError instanceof Error ? projectError.message : "Failed to delete project.");
    }
  }

  async function handleToggleProjectArchive(project: ApiProject) {
    setError("");

    try {
      await updateProject(project.id, { archived: !project.archived });
      await loadCalendarData();
    } catch (projectError) {
      setError(projectError instanceof Error ? projectError.message : "Failed to archive project.");
    }
  }

  function handleEditTag(tag: ApiTag) {
    setEditingTagId(tag.id);
    setEditTagDraft({ name: tag.name, color: tag.color });
    setConfirmDeleteTagId(null);
  }

  async function handleSaveTag(tagId: string) {
    const tag = tags.find((t) => t.id === tagId);
    if (!tag) return;

    setError("");

    try {
      await updateTag(tagId, {
        name: editTagDraft.name.trim() || tag.name,
        color: editTagDraft.color,
      });

      setEditingTagId(null);
      await loadCalendarData();
    } catch (tagError) {
      setError(tagError instanceof Error ? tagError.message : "Failed to update tag.");
    }
  }

  async function handleDeleteTag(tagId: string) {
    if (confirmDeleteTagId !== tagId) {
      setConfirmDeleteTagId(tagId);
      setEditingTagId(null);
      return;
    }

    setConfirmDeleteTagId(null);
    setError("");

    try {
      await deleteTag(tagId);
      await loadCalendarData();
    } catch (tagError) {
      setError(tagError instanceof Error ? tagError.message : "Failed to delete tag.");
    }
  }

  async function handleLoadDemo() {
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/debug/load-demo", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to load demo data.");
      }
      await loadCalendarData();
    } catch (demoError) {
      setError(demoError instanceof Error ? demoError.message : "Failed to load demo data.");
    } finally {
      setSaving(false);
    }
  }

  function handleSelectSlot(slot: SlotInfo) {
    const slotStart = new Date(slot.start);
    const slotEnd = new Date(slot.end);

    if (slotEnd.getTime() <= slotStart.getTime()) {
      openNewItemModal(slotStart, defaultEndFromStart(slotStart));
      return;
    }

    openNewItemModal(slotStart, slotEnd);
  }

  function toggleProjectVisibility(projectId: string) {
    setVisibleProjectIds((current) => {
      if (current.includes(projectId)) {
        return current.filter((id) => id !== projectId);
      }

      return [...current, projectId];
    });
  }

  function focusProject(projectId: string) {
    setVisibleProjectIds([projectId]);
    setShowUnassigned(false);
  }

  function showAllProjects() {
    setVisibleProjectIds(projects.map((project) => project.id));
    setShowUnassigned(true);
  }

  function hideAllProjects() {
    setVisibleProjectIds([]);
    setShowUnassigned(false);
  }

  function handleFocusWorkProject() {
    const workProject = projects.find(
      (project) => !project.archived && project.name.toLowerCase().includes("work")
    );

    if (workProject) {
      focusProject(workProject.id);
      return;
    }

    const firstActiveProject = projects.find((project) => !project.archived);
    if (firstActiveProject) {
      focusProject(firstActiveProject.id);
    }
  }

  // Stable ref so the keyboard shortcut handler can call it without stale closure
  const handleFocusWorkProjectRef = useRef(handleFocusWorkProject);
  useEffect(() => {
    handleFocusWorkProjectRef.current = handleFocusWorkProject;
  });

  function toggleTagFilter(tagId: string) {
    setActiveTagFilterIds((current) => {
      if (current.includes(tagId)) {
        return current.filter((id) => id !== tagId);
      }

      return [...current, tagId];
    });
  }

  function shiftDate(direction: -1 | 1) {
    setDate((currentDate) => {
      if (view === "month") {
        return addMonths(currentDate, direction);
      }

      if (view === "week") {
        return addWeeks(currentDate, direction);
      }

      return addDays(currentDate, direction);
    });
  }

  return (
    <main className="dinox-shell mx-auto grid min-h-screen max-w-[1800px] grid-cols-1 gap-4 p-3 text-[var(--app-text)] md:p-4 xl:grid-cols-[340px_1fr]">
      <aside className="flex rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[0_26px_80px_rgba(3,7,18,0.28)] md:p-5">
        <div className="flex w-full flex-col">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--app-muted)]">Dinox</p>
            <h1 className="text-2xl font-semibold text-[var(--app-text)]">Local-First Calendar</h1>
            <p className="text-sm text-[var(--app-muted)]">Projects, tags and filters in one workspace.</p>
          </div>

          {/* Projects */}
          <section className="mt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">Projects</h2>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={showAllProjects}
                className="rounded-lg border border-[var(--app-border-strong)] px-2 py-1 text-[11px] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
              >
                Show all
              </button>
              <button
                type="button"
                onClick={hideAllProjects}
                className="rounded-lg border border-[var(--app-border-strong)] px-2 py-1 text-[11px] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
              >
                Hide all
              </button>
              <button
                type="button"
                onClick={() => setShowUnassigned((current) => !current)}
                className={`rounded-lg border px-2 py-1 text-[11px] transition ${
                  showUnassigned
                    ? "border-[var(--app-accent)] text-[var(--app-accent)]"
                    : "border-[var(--app-border-strong)] text-[var(--app-muted)]"
                }`}
              >
                Unassigned
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="mb-3 grid grid-cols-[1fr_auto_auto] gap-2">
              <input
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder="New project"
                className="h-10 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)]"
              />
              <input
                type="color"
                value={newProjectColor}
                onChange={(event) => setNewProjectColor(event.target.value)}
                className="h-10 w-10 cursor-pointer rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] p-1"
              />
              <button
                type="submit"
                className="h-10 rounded-xl bg-[var(--app-accent)] px-3 text-sm font-semibold text-[var(--app-bg)] transition hover:bg-[var(--app-accent-strong)] hover:text-[var(--app-text)]"
              >
                Add
              </button>
            </form>

            <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
              {projects.map((project) => {
                const visible = visibleProjectIds.includes(project.id);
                const isEditing = editingProjectId === project.id;
                const isConfirmingDelete = confirmDeleteProjectId === project.id;

                return (
                  <div
                    key={project.id}
                    className="rounded-xl border border-[var(--app-border)] p-3"
                    style={{ backgroundColor: "color-mix(in srgb, var(--app-surface-2) 45%, transparent)" }}
                  >
                    {isEditing ? (
                      // Inline edit form
                      <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <input
                            autoFocus
                            value={editProjectDraft.name}
                            onChange={(e) => setEditProjectDraft((d) => ({ ...d, name: e.target.value }))}
                            className="h-8 rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-2 text-sm text-[var(--app-text)]"
                          />
                          <input
                            type="color"
                            value={editProjectDraft.color}
                            onChange={(e) => setEditProjectDraft((d) => ({ ...d, color: e.target.value }))}
                            className="h-8 w-8 cursor-pointer rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] p-0.5"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSaveProject(project.id)}
                            className="rounded-lg bg-[var(--app-accent)] px-3 py-1 text-[11px] font-semibold text-[var(--app-bg)] transition hover:bg-[var(--app-accent-strong)]"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingProjectId(null)}
                            className="rounded-lg border border-[var(--app-border-strong)] px-3 py-1 text-[11px] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => toggleProjectVisibility(project.id)}
                            className="flex min-w-0 items-center gap-2 text-left text-sm"
                          >
                            <span
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-md border text-[10px] ${
                                visible
                                  ? "border-[var(--app-accent)] text-[var(--app-accent)]"
                                  : "border-[var(--app-border-strong)] text-[var(--app-muted)]"
                              }`}
                            >
                              {visible ? "on" : "-"}
                            </span>
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                            <span className="truncate">{project.name}</span>
                          </button>
                          <span className="text-[10px] uppercase tracking-wide text-[var(--app-muted)]">
                            {project.archived ? "archived" : "active"}
                          </span>
                        </div>

                        {isConfirmingDelete ? (
                          <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--app-danger)] bg-[color-mix(in_srgb,var(--app-danger)_8%,transparent)] px-2 py-1.5">
                            <span className="flex-1 text-[11px] text-[var(--app-danger)]">Delete &quot;{project.name}&quot;?</span>
                            <button
                              type="button"
                              onClick={() => void handleDeleteProject(project.id)}
                              className="rounded-md bg-[var(--app-danger)] px-2 py-0.5 text-[11px] font-semibold text-white"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteProjectId(null)}
                              className="rounded-md border border-[var(--app-border-strong)] px-2 py-0.5 text-[11px] text-[var(--app-muted)]"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => focusProject(project.id)}
                              className="rounded-lg border border-[var(--app-border-strong)] px-2 py-1 text-[11px] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                            >
                              Only
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditProject(project)}
                              className="rounded-lg border border-[var(--app-border-strong)] px-2 py-1 text-[11px] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleToggleProjectArchive(project)}
                              className="rounded-lg border border-[var(--app-border-strong)] px-2 py-1 text-[11px] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                            >
                              {project.archived ? "Unarchive" : "Archive"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteProject(project.id)}
                              className="rounded-lg border border-[var(--app-danger)] px-2 py-1 text-[11px] text-[var(--app-danger)] transition hover:opacity-80"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Tags */}
          <section className="mt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">Tags</h2>
            <form onSubmit={handleCreateTag} className="mb-3 grid grid-cols-[1fr_auto_auto] gap-2">
              <input
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                placeholder="New tag"
                className="h-10 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)]"
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(event) => setNewTagColor(event.target.value)}
                className="h-10 w-10 cursor-pointer rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] p-1"
              />
              <button
                type="submit"
                className="h-10 rounded-xl bg-[var(--app-accent)] px-3 text-sm font-semibold text-[var(--app-bg)] transition hover:bg-[var(--app-accent-strong)] hover:text-[var(--app-text)]"
              >
                Add
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = activeTagFilterIds.includes(tag.id);
                const isEditingTag = editingTagId === tag.id;
                const isConfirmingTagDelete = confirmDeleteTagId === tag.id;

                if (isEditingTag) {
                  return (
                    <div
                      key={tag.id}
                      className="flex w-full items-center gap-2 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] p-2"
                    >
                      <input
                        autoFocus
                        value={editTagDraft.name}
                        onChange={(e) => setEditTagDraft((d) => ({ ...d, name: e.target.value }))}
                        className="h-7 min-w-0 flex-1 rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-2 text-xs text-[var(--app-text)]"
                      />
                      <input
                        type="color"
                        value={editTagDraft.color}
                        onChange={(e) => setEditTagDraft((d) => ({ ...d, color: e.target.value }))}
                        className="h-7 w-7 cursor-pointer rounded-lg border border-[var(--app-border-strong)] p-0.5"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSaveTag(tag.id)}
                        className="rounded-lg bg-[var(--app-accent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--app-bg)]"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTagId(null)}
                        className="rounded-lg border border-[var(--app-border-strong)] px-2 py-0.5 text-[11px] text-[var(--app-muted)]"
                      >
                        ✕
                      </button>
                    </div>
                  );
                }

                if (isConfirmingTagDelete) {
                  return (
                    <div
                      key={tag.id}
                      className="flex w-full items-center gap-2 rounded-xl border border-[var(--app-danger)] px-2 py-1.5"
                      style={{ backgroundColor: "color-mix(in srgb, var(--app-danger) 8%, transparent)" }}
                    >
                      <span className="flex-1 text-[11px] text-[var(--app-danger)]">Delete #{tag.name}?</span>
                      <button
                        type="button"
                        onClick={() => void handleDeleteTag(tag.id)}
                        className="rounded-md bg-[var(--app-danger)] px-2 py-0.5 text-[11px] font-semibold text-white"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteTagId(null)}
                        className="rounded-md border border-[var(--app-border-strong)] px-2 py-0.5 text-[11px] text-[var(--app-muted)]"
                      >
                        No
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={tag.id}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                      active ? "text-[var(--app-text)]" : "text-[var(--app-muted)]"
                    }`}
                    style={{
                      borderColor: active ? tag.color : "var(--app-border-strong)",
                      backgroundColor: active
                        ? `color-mix(in srgb, ${tag.color} 78%, transparent)`
                        : "transparent",
                    }}
                  >
                    <button type="button" onClick={() => toggleTagFilter(tag.id)}>
                      #{tag.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditTag(tag)}
                      className="ml-0.5 text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                      title="Edit tag"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteTag(tag.id)}
                      className="text-[var(--app-danger)] transition hover:opacity-70"
                      title="Delete tag"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Navigation */}
          <nav className="mt-auto border-t border-[var(--app-border)] pt-4">
            <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[var(--app-muted)]">Workspace</p>
            <div className="grid gap-2">
              <Link
                href="/"
                className="inline-flex items-center justify-between rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 py-2 text-sm text-[var(--app-text)]"
              >
                <span>Calendar</span>
                <span className="text-xs text-[var(--app-muted)]">Ctrl+1</span>
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-between rounded-xl border border-[var(--app-border-strong)] px-3 py-2 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
              >
                <span>Dashboard</span>
                <span className="text-xs text-[var(--app-muted)]">Stats</span>
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center justify-between rounded-xl border border-[var(--app-border-strong)] px-3 py-2 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
              >
                <span>Settings</span>
                <span className="text-xs text-[var(--app-muted)]">Theme</span>
              </Link>
            </div>
            <p className="mt-3 text-[10px] text-[var(--app-muted)]">
              Shortcuts: <span className="font-mono">N</span> new · <span className="font-mono">T</span> today · <span className="font-mono">F</span> focus work
            </p>
          </nav>
        </div>
      </aside>

      <section className="flex flex-col rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[0_26px_80px_rgba(3,7,18,0.25)] md:p-5 xl:h-[calc(100dvh-2rem)] xl:min-h-0 xl:overflow-hidden">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="rounded-lg border border-[var(--app-border-strong)] px-2 py-1 text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={() => setDate(new Date())}
              className="rounded-lg border border-[var(--app-border-strong)] px-2 py-1 text-xs uppercase tracking-wide text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="rounded-lg border border-[var(--app-border-strong)] px-2 py-1 text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
            >
              &gt;
            </button>
            <h2 className="ml-2 text-xl font-semibold text-[var(--app-text)]">{currentTitle}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] p-1">
              {viewOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    view === option
                      ? "bg-[var(--app-accent)] text-[var(--app-bg)]"
                      : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
                  }`}
                  onClick={() => setView(option)}
                >
                  {viewLabels[option]}
                </button>
              ))}
            </div>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search title or description"
              className="h-10 min-w-[220px] rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)]"
            />

            <button
              type="button"
              onClick={() => openNewItemModal(date, defaultEndFromStart(date))}
              className="h-10 rounded-xl bg-[var(--app-accent)] px-4 text-sm font-semibold text-[var(--app-bg)] transition hover:bg-[var(--app-accent-strong)] hover:text-[var(--app-text)]"
            >
              New
            </button>
            <button
              type="button"
              onClick={() => void handleLoadDemo()}
              disabled={saving}
              className="h-10 rounded-xl border border-[var(--app-border-strong)] px-3 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Demo
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--app-danger)", color: "var(--app-danger)" }}>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className={`rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-inner md:p-4 ${
                isTimeGridView ? "xl:flex xl:min-h-0 xl:flex-1" : ""
              }`}>
            <p className="py-20 text-center text-sm text-[var(--app-muted)]">Loading calendar...</p>
          </div>
        ) : view === "agenda" ? (
          <AgendaWorkspace
            groups={agendaGroups}
            totalItems={agendaStats.totalItems}
            todayItems={agendaStats.todayItems}
            doneItems={agendaStats.doneItems}
            workItems={agendaStats.workItems}
            onSelectItem={openEditItemModal}
            onCreateItem={() => openNewItemModal(date, defaultEndFromStart(date))}
            onFocusWork={handleFocusWorkProject}
            onJumpToday={() => setDate(new Date())}
          />
        ) : (
          <>
            <div className={`rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-inner md:p-4 ${
                isTimeGridView ? "xl:flex xl:min-h-0 xl:flex-1" : ""
              }`}>
              <div
                className={`calendar-container ${isDayView ? "calendar-day-mode" : ""} ${isWeekView ? "calendar-week-mode" : ""} ${
                  isDayView
                    ? "h-[78dvh] min-h-[620px] xl:h-full xl:min-h-0"
                    : isWeekView
                      ? "h-[72dvh] min-h-[500px] xl:h-full xl:min-h-0"
                      : "h-[65dvh] min-h-[420px]"
                }`}
              >
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  view={view}
                  onView={(nextView) => setView(nextView)}
                  date={date}
                  onNavigate={(nextDate) => setDate(nextDate)}
                  selectable
                  popup
                  step={isTimeGridView ? 15 : 30}
                  timeslots={isTimeGridView ? 4 : 2}
                  min={calendarMinTime}
                  max={calendarMaxTime}
                  scrollToTime={calendarScrollTime}
                  onSelectSlot={handleSelectSlot}
                  onSelectEvent={(selectedEvent) => openEditItemModal((selectedEvent as CalendarEvent).resource)}
                  messages={{
                    allDay: "All day",
                    previous: "Back",
                    next: "Next",
                    today: "Today",
                    month: "Month",
                    week: "Week",
                    day: "Day",
                    agenda: "Agenda",
                    date: "Date",
                    time: "Time",
                    event: "Event",
                    noEventsInRange: "No items in this range",
                    showMore: (total) => `+${total} more`,
                  }}
                  eventPropGetter={(event) => {
                    const item = (event as CalendarEvent).resource;
                    const baseColor = item.project?.color ?? "#64748b";

                    let textColor = "#ffffff";
                    let opacity = 1;

                    if (item.status === "DONE") {
                      textColor = "#d1fae5";
                      opacity = 0.78;
                    }

                    if (item.status === "CANCELLED") {
                      textColor = "#fecaca";
                      opacity = 0.68;
                    }

                    return {
                      style: {
                        backgroundColor: baseColor,
                        color: textColor,
                        opacity,
                        border: "none",
                        borderRadius: "8px",
                        padding: "2px 6px",
                      },
                    };
                  }}
                />
              </div>
            </div>

            {showAgendaPreview ? (
              <div className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">Agenda Preview</h3>
                {agendaGroups.length === 0 ? (
                  <p className="mt-3 text-sm text-[var(--app-muted)]">No items for active filters.</p>
                ) : (
                  <div className="mt-3 max-h-[280px] space-y-4 overflow-y-auto pr-1">
                    {agendaGroups.map((group) => (
                      <div key={group.groupKey}>
                        <p className="mb-2 text-xs uppercase tracking-[0.12em] text-[var(--app-muted)]">
                          {group.title} · {group.dateLabel}
                        </p>
                        <div className="space-y-2">
                          {group.items.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => openEditItemModal(item)}
                              className="flex w-full items-center justify-between rounded-xl border border-[var(--app-border)] px-3 py-2 text-left transition hover:border-[var(--app-border-strong)]"
                              style={{ backgroundColor: "color-mix(in srgb, var(--app-surface-2) 45%, transparent)" }}
                            >
                              <div>
                                <p className="text-sm font-medium text-[var(--app-text)]">{item.title}</p>
                                <p className="text-xs text-[var(--app-muted)]">
                                  {format(new Date(item.startAt), "HH:mm", { locale: ru })} - {format(new Date(item.endAt), "HH:mm", { locale: ru })}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 text-[11px]">
                                <span
                                  className={`rounded-full border px-2 py-1 ${
                                    item.status === "DONE"
                                      ? "border-emerald-700/70 bg-emerald-950/40 text-emerald-200"
                                      : item.status === "CANCELLED"
                                        ? "border-red-700/70 bg-red-950/40 text-red-200"
                                        : "border-sky-700/70 bg-sky-950/40 text-sky-200"
                                  }`}
                                >
                                  {statusLabels[item.status]}
                                </span>
                                {item.project ? (
                                  <span className="rounded-full px-2 py-1 text-white" style={{ backgroundColor: item.project.color }}>
                                    {item.project.name}
                                  </span>
                                ) : (
                                  <span className="text-[var(--app-muted)]">No project</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </section>

      {!loading && items.length === 0 && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-5 py-4">
          <div>
            <p className="text-sm font-medium text-[var(--app-text)]">No events yet</p>
            <p className="mt-0.5 text-xs text-[var(--app-muted)]">
              Press <kbd className="rounded border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-1 font-mono text-[10px]">N</kbd> or click{" "}
              <strong className="text-[var(--app-text)]">New</strong> to create your first event,
              or load sample data to explore.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleLoadDemo()}
            disabled={saving}
            className="ml-4 shrink-0 rounded-xl border border-[var(--app-border-strong)] px-4 py-2 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)] disabled:opacity-50"
          >
            Load demo data
          </button>
        </div>
      )}

      <ItemModal
        open={modalOpen}
        mode={modalMode}
        item={editingItem}
        projects={projects.filter((project) => !project.archived)}
        tags={tags}
        initialStart={draftStart}
        initialEnd={draftEnd}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
          }
        }}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </main>
  );
}
