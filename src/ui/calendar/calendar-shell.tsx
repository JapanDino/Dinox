"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  deleteItem,
  fetchItems,
  fetchProjects,
  fetchTags,
  updateItem,
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

  const events = useMemo<CalendarEvent[]>(() => {
    return items.map((item) => ({
      title: item.title,
      start: new Date(item.startAt),
      end: new Date(item.endAt),
      allDay: item.allDay,
      resource: item,
    }));
  }, [items]);

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

  function handleSelectSlot(slot: SlotInfo) {
    const slotStart = new Date(slot.start);
    const slotEnd = new Date(slot.end);

    if (slotEnd.getTime() <= slotStart.getTime()) {
      openNewItemModal(slotStart, defaultEndFromStart(slotStart));
      return;
    }

    openNewItemModal(slotStart, slotEnd);
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[var(--app-bg)] text-[var(--app-text)] lg:grid-cols-[300px_1fr]">
      <aside className="border-b border-[var(--app-border)] bg-[var(--app-surface)] p-5 lg:border-r lg:border-b-0">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--app-muted)]">Dinox</p>
          <h1 className="text-2xl font-semibold">Local-First Calendar</h1>
          <p className="text-sm text-[var(--app-muted)]">Figma-first shell: sidebar + calendar regions.</p>
        </div>

        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--app-muted)]">Projects</h2>
          <div className="space-y-2">
            {projects.map((project) => (
              <div key={project.id} className="flex items-center justify-between rounded-md border border-[var(--app-border)] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: project.color }} />
                  <span className="text-sm">{project.name}</span>
                </div>
                <span className="text-xs text-[var(--app-muted)]">{project.archived ? "Archived" : "Active"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--app-muted)]">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full border border-[var(--app-border)] px-3 py-1 text-xs"
                style={{ borderColor: tag.color, color: tag.color }}
              >
                #{tag.name}
              </span>
            ))}
          </div>
        </section>
      </aside>

      <section className="p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3">
          <div className="flex gap-2">
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

          <button
            type="button"
            onClick={() => openNewItemModal(date, defaultEndFromStart(date))}
            className="rounded-md bg-[var(--app-accent)] px-4 py-2 text-sm font-medium text-white"
          >
            New
          </button>
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
      </section>

      <ItemModal
        open={modalOpen}
        mode={modalMode}
        item={editingItem}
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
