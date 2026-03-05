"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type Event,
  type SlotInfo,
  type View,
} from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
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
import { ApiItem, ApiItemMutationInput, ApiProject, ApiTag } from "@/src/ui/api/types";
import { defaultEndFromStart } from "./date-utils";
import { ItemModal } from "./item-modal";

const locales = { ru };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { locale: ru }),
  getDay,
  locales,
});

type CalendarEvent = Event & { resource: ApiItem };

const viewOptions: View[] = ["month", "week", "day", "agenda"];

export function CalendarShell() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [tags, setTags] = useState<ApiTag[]>([]);
  const [items, setItems] = useState<ApiItem[]>([]);
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [visibleProjectIds, setVisibleProjectIds] = useState<string[]>([]);
  const [activeTagFilterIds, setActiveTagFilterIds] = useState<string[]>([]);

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("#2563eb");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#7c3aed");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<ApiItem | null>(null);
  const [draftStart, setDraftStart] = useState<Date>(new Date());
  const [draftEnd, setDraftEnd] = useState<Date>(defaultEndFromStart(new Date()));

  const loadCalendarData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [projectsData, tagsData, itemsData] = await Promise.all([fetchProjects(), fetchTags(), fetchItems()]);
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

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const projectMatches = !item.projectId || visibleProjectIds.includes(item.projectId);
      const tagsMatch =
        activeTagFilterIds.length === 0 || item.tags.some((tag) => activeTagFilterIds.includes(tag.id));
      const queryMatches =
        normalizedQuery.length === 0 ||
        item.title.toLowerCase().includes(normalizedQuery) ||
        (item.description ?? "").toLowerCase().includes(normalizedQuery);

      return projectMatches && tagsMatch && queryMatches;
    });
  }, [items, visibleProjectIds, activeTagFilterIds, searchQuery]);

  const events = useMemo<CalendarEvent[]>(() => {
    return filteredItems.map((item) => ({
      title: item.title,
      start: new Date(item.startAt),
      end: new Date(item.endAt),
      allDay: item.allDay,
      resource: item,
    }));
  }, [filteredItems]);

  const agendaItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [filteredItems]);

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

    try {
      if (modalMode === "create") {
        await createItem(input);
      } else if (editingItem) {
        await updateItem(editingItem.id, input);
      }

      await loadCalendarData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);

    try {
      await deleteItem(id);
      await loadCalendarData();
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newProjectName.trim()) {
      return;
    }

    await createProject({
      name: newProjectName.trim(),
      color: newProjectColor,
      archived: false,
    });

    setNewProjectName("");
    await loadCalendarData();
  }

  async function handleCreateTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newTagName.trim()) {
      return;
    }

    await createTag({
      name: newTagName.trim(),
      color: newTagColor,
    });

    setNewTagName("");
    await loadCalendarData();
  }

  async function handleEditProject(project: ApiProject) {
    const name = window.prompt("Project name", project.name);
    if (name === null) {
      return;
    }

    const color = window.prompt("Project color (HEX)", project.color);
    if (color === null) {
      return;
    }

    await updateProject(project.id, {
      name: name.trim(),
      color: color.trim() || project.color,
      archived: project.archived,
    });

    await loadCalendarData();
  }

  async function handleDeleteProject(projectId: string) {
    const confirmed = window.confirm("Delete this project?");
    if (!confirmed) {
      return;
    }

    await deleteProject(projectId);
    await loadCalendarData();
  }

  async function handleToggleProjectArchive(project: ApiProject) {
    await updateProject(project.id, { archived: !project.archived });
    await loadCalendarData();
  }

  async function handleEditTag(tag: ApiTag) {
    const name = window.prompt("Tag name", tag.name);
    if (name === null) {
      return;
    }

    const color = window.prompt("Tag color (HEX)", tag.color);
    if (color === null) {
      return;
    }

    await updateTag(tag.id, {
      name: name.trim(),
      color: color.trim() || tag.color,
    });

    await loadCalendarData();
  }

  async function handleDeleteTag(tagId: string) {
    const confirmed = window.confirm("Delete this tag?");
    if (!confirmed) {
      return;
    }

    await deleteTag(tagId);
    await loadCalendarData();
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

  function toggleTagFilter(tagId: string) {
    setActiveTagFilterIds((current) => {
      if (current.includes(tagId)) {
        return current.filter((id) => id !== tagId);
      }

      return [...current, tagId];
    });
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[var(--app-bg)] text-[var(--app-text)] lg:grid-cols-[320px_1fr]">
      <aside className="border-b border-[var(--app-border)] bg-[var(--app-surface)] p-5 lg:border-r lg:border-b-0">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--app-muted)]">Dinox</p>
          <h1 className="text-2xl font-semibold">Local-First Calendar</h1>
          <p className="text-sm text-[var(--app-muted)]">Figma-first shell: sidebar + calendar regions.</p>
        </div>

        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--app-muted)]">Projects</h2>
          <form onSubmit={handleCreateProject} className="mb-3 grid grid-cols-[1fr_auto_auto] gap-2">
            <input
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="New project"
              className="rounded-md border border-[var(--app-border)] px-2 py-1.5 text-sm"
            />
            <input
              type="color"
              value={newProjectColor}
              onChange={(event) => setNewProjectColor(event.target.value)}
              className="h-9 w-9 cursor-pointer rounded-md border border-[var(--app-border)] p-1"
            />
            <button type="submit" className="rounded-md bg-[var(--app-accent)] px-2 text-sm text-white">
              Add
            </button>
          </form>

          <div className="space-y-2">
            {projects.map((project) => {
              const visible = visibleProjectIds.includes(project.id);

              return (
                <div key={project.id} className="rounded-md border border-[var(--app-border)] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={() => toggleProjectVisibility(project.id)}
                      />
                      <span className="size-2 rounded-full" style={{ backgroundColor: project.color }} />
                      <span>{project.name}</span>
                    </label>
                    <span className="text-xs text-[var(--app-muted)]">{project.archived ? "Archived" : "Active"}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditProject(project)}
                      className="rounded-md border border-[var(--app-border)] px-2 py-1 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleProjectArchive(project)}
                      className="rounded-md border border-[var(--app-border)] px-2 py-1 text-xs"
                    >
                      {project.archived ? "Unarchive" : "Archive"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(project.id)}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--app-muted)]">Tags</h2>
          <form onSubmit={handleCreateTag} className="mb-3 grid grid-cols-[1fr_auto_auto] gap-2">
            <input
              value={newTagName}
              onChange={(event) => setNewTagName(event.target.value)}
              placeholder="New tag"
              className="rounded-md border border-[var(--app-border)] px-2 py-1.5 text-sm"
            />
            <input
              type="color"
              value={newTagColor}
              onChange={(event) => setNewTagColor(event.target.value)}
              className="h-9 w-9 cursor-pointer rounded-md border border-[var(--app-border)] p-1"
            />
            <button type="submit" className="rounded-md bg-[var(--app-accent)] px-2 text-sm text-white">
              Add
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const active = activeTagFilterIds.includes(tag.id);

              return (
                <div
                  key={tag.id}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
                    active ? "text-white" : "text-[var(--app-text)]"
                  }`}
                  style={{
                    borderColor: tag.color,
                    backgroundColor: active ? tag.color : "transparent",
                  }}
                >
                  <button type="button" onClick={() => toggleTagFilter(tag.id)}>
                    #{tag.name}
                  </button>
                  <button type="button" onClick={() => handleEditTag(tag)} className={active ? "text-white/80" : "text-[var(--app-muted)]"}>
                    e
                  </button>
                  <button type="button" onClick={() => handleDeleteTag(tag.id)} className="text-red-500">
                    x
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </aside>

      <section className="p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {viewOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded-md px-3 py-1.5 text-sm ${
                  view === option
                    ? "bg-[var(--app-accent)] text-white"
                    : "bg-transparent text-[var(--app-text)] hover:bg-[var(--app-bg)]"
                }`}
                onClick={() => setView(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search title or description"
              className="rounded-md border border-[var(--app-border)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => openNewItemModal(date, defaultEndFromStart(date))}
              className="rounded-md bg-[var(--app-accent)] px-4 py-2 text-sm font-medium text-white"
            >
              New
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-sm md:p-4">
          {loading ? <p className="py-16 text-center text-sm text-[var(--app-muted)]">Loading calendar...</p> : null}
          {error ? <p className="py-16 text-center text-sm text-red-600">{error}</p> : null}
          {!loading && !error ? (
            <div className="calendar-container h-[75vh] min-h-[520px]">
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
                onSelectSlot={handleSelectSlot}
                onSelectEvent={(selectedEvent) => openEditItemModal((selectedEvent as CalendarEvent).resource)}
                eventPropGetter={(event) => {
                  const item = (event as CalendarEvent).resource;
                  const backgroundColor = item.project?.color ?? "#475569";

                  return {
                    style: {
                      backgroundColor,
                      borderRadius: "8px",
                      border: "none",
                      padding: "2px 6px",
                    },
                  };
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--app-muted)]">Agenda</h3>
          <div className="mt-3 space-y-2">
            {agendaItems.length === 0 ? <p className="text-sm text-[var(--app-muted)]">No items for active filters.</p> : null}
            {agendaItems.slice(0, 20).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openEditItemModal(item)}
                className="flex w-full items-center justify-between rounded-md border border-[var(--app-border)] px-3 py-2 text-left"
              >
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-[var(--app-muted)]">
                    {format(new Date(item.startAt), "dd MMM HH:mm", { locale: ru })} - {format(new Date(item.endAt), "dd MMM HH:mm", { locale: ru })}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
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
      </section>

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
