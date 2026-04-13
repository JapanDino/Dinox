"use client";

import Link from "next/link";

import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type Event,
  type SlotInfo,
  type View,
} from "react-big-calendar";
import { addDays, addMonths, addWeeks, format, getDay, isSameDay, parse, startOfWeek } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import {
  createItem,
  createProject,
  createTag,
  deleteItem,
  deleteItemSeries,
  deleteProject,
  deleteTag,
  fetchItems,
  fetchProjects,
  fetchTags,
  updateItem,
  updateItemSeries,
  updateProject,
  updateTag,
} from "@/src/ui/api/client";
import {
  ApiItem,
  ApiItemMutationInput,
  ApiProject,
  ApiTag,
} from "@/src/ui/api/types";
import { applyThemeTokens, applyAccentColor, loadStoredThemeState, resolveTheme } from "@/src/ui/theme/theme-config";
import { loadPrefs, type AppLocale, type TimeFormat } from "@/src/ui/prefs/prefs-config";
import { defaultEndFromStart } from "./date-utils";
import { AgendaWorkspace } from "./agenda-workspace";
import { ItemModal } from "./item-modal";
import { OnboardingScreen } from "@/src/ui/onboarding/onboarding-screen";
import { EmojiPicker } from "@/src/ui/components/emoji-picker";

const locales = { ru, en: enUS };

type CalendarEvent = Event & { resource: ApiItem };

const viewOptions: View[] = ["month", "week", "day", "agenda"];

const viewLabels: Record<View, string> = {
  month: "Month",
  week: "Week",
  work_week: "Work Week",
  day: "Day",
  agenda: "Agenda",
};

const PINNED_PROJECT_IDS_STORAGE_KEY = "dinox:pinned-project-ids";
const MAX_PINNED_PROJECTS = 5;
const DEFAULT_SIDEBAR_PREVIEW_COUNT = 3;

const calendarMinTime = new Date(1970, 0, 1, 0, 0, 0);
const calendarMaxTime = new Date(1970, 0, 1, 23, 59, 59);
const calendarScrollTime = new Date(1970, 0, 1, 8, 0, 0);

function buildCalendarFormats(timeFormat: TimeFormat) {
  const timeFmt = timeFormat === "12h" ? "h:mm a" : "HH:mm";
  return {
    timeGutterFormat: timeFmt,
    eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${format(start, timeFmt)} - ${format(end, timeFmt)}`,
    agendaTimeFormat: timeFmt,
    agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${format(start, timeFmt)} - ${format(end, timeFmt)}`,
  };
}

export function CalendarShell() {
  const prefs = useMemo(() => loadPrefs(), []);
  const dateFnsLocale = prefs.appLocale === "ru" ? ru : enUS;
  const appLocale: AppLocale = prefs.appLocale;

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

  // ── i18n labels ──────────────────────────────────────────────────────────
  const t = useMemo(() => {
    const isRu = appLocale === "ru";
    return {
      today: isRu ? "Сегодня" : "Today",
      noEventsToday: isRu ? "Нет событий сегодня." : "No events today.",
      projects: isRu ? "Проекты" : "Projects",
      tags: isRu ? "Тэги" : "Tags",
      workspace: isRu ? "Рабочее пространство" : "Workspace",
      loading: isRu ? "Загрузка..." : "Loading calendar...",
      newProject: isRu ? "Новый проект" : "New project",
      newTag: isRu ? "Новый тэг" : "New tag",
      add: isRu ? "Добавить" : "Add",
      save: isRu ? "Сохранить" : "Save",
      cancel: isRu ? "Отменить" : "Cancel",
      more: (n: number) => isRu ? `+${n} ещё` : `+${n} more`,
      moreAgenda: isRu ? "Все события" : "All events",
      all: isRu ? "Все" : "All",
      none: isRu ? "Нет" : "None",
      pinned: isRu ? "Закреплённые" : "Pinned",
      deleteQ: (name: string) => isRu ? `Удалить ${name}?` : `Delete ${name}?`,
      yes: isRu ? "Да" : "Yes",
      no: isRu ? "Нет" : "No",
      only: isRu ? "Только" : "Only",
      editBtn: "✏️",
      archiveOn: "📂",
      archiveOff: "📁",
      newItem: isRu ? "Новое" : "New",
      searchPlaceholder: isRu ? "Поиск..." : "Search title or description",
      month: isRu ? "Месяц" : "Month",
      week: isRu ? "Неделя" : "Week",
      day: isRu ? "День" : "Day",
      agenda: isRu ? "Повестка" : "Agenda",
      allDay: isRu ? "Весь день" : "All day",
      noItemsInRange: isRu ? "Нет событий в этом диапазоне" : "No items in this range",
      pinBtn: "📌",
    };
  }, [appLocale]);

  const calendarFormats = useMemo(() => buildCalendarFormats(prefs.timeFormat), [prefs.timeFormat]);

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
  const [newProjectEmoji, setNewProjectEmoji] = useState("");
  const [showNewProjectEmojiPicker, setShowNewProjectEmojiPicker] = useState(false);
  const [editProjectEmojiPickerId, setEditProjectEmojiPickerId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#818cf8");
  const [showProjectCreateForm, setShowProjectCreateForm] = useState(false);
  const [showTagCreateForm, setShowTagCreateForm] = useState(false);
  const [showAllProjectsList, setShowAllProjectsList] = useState(false);
  const [showAllTagsList, setShowAllTagsList] = useState(false);
  const [sidebarProjectsCollapsed, setSidebarProjectsCollapsed] = useState(false);
  const [sidebarTagsCollapsed, setSidebarTagsCollapsed] = useState(false);
  const [pinnedProjectIds, setPinnedProjectIds] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Inline editing state - projects
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectDraft, setEditProjectDraft] = useState({ name: "", color: "#14b8a6", emoji: "" });
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<string | null>(null);

  // Inline editing state - tags
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
    const { accentColor } = loadPrefs();
    applyAccentColor(accentColor);
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PINNED_PROJECT_IDS_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }

      const validIds = parsed.filter((entry): entry is string => typeof entry === "string");
      setPinnedProjectIds(validIds.slice(0, MAX_PINNED_PROJECTS));
    } catch {
      // ignore malformed localStorage data
    }
  }, []);

  useEffect(() => {
    setPinnedProjectIds((current) => {
      const validProjectIds = new Set(projects.map((project) => project.id));
      return current.filter((id) => validProjectIds.has(id)).slice(0, MAX_PINNED_PROJECTS);
    });
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(PINNED_PROJECT_IDS_STORAGE_KEY, JSON.stringify(pinnedProjectIds));
    } catch {
      // ignore storage quota issues
    }
  }, [pinnedProjectIds]);

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

  const projectUsageCountById = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (!item.projectId) continue;
      counts.set(item.projectId, (counts.get(item.projectId) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const tagUsageCountById = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const tag of item.tags) {
        counts.set(tag.id, (counts.get(tag.id) ?? 0) + 1);
      }
    }
    return counts;
  }, [items]);

  const sortedProjectsForSidebar = useMemo(() => {
    const pinnedOrder = new Map(pinnedProjectIds.map((id, index) => [id, index]));

    return [...projects].sort((a, b) => {
      const aPinned = pinnedOrder.has(a.id);
      const bPinned = pinnedOrder.has(b.id);

      if (aPinned || bPinned) {
        if (!aPinned) return 1;
        if (!bPinned) return -1;
        return (pinnedOrder.get(a.id) ?? 0) - (pinnedOrder.get(b.id) ?? 0);
      }

      if (a.archived !== b.archived) {
        return a.archived ? 1 : -1;
      }

      const popularityDelta = (projectUsageCountById.get(b.id) ?? 0) - (projectUsageCountById.get(a.id) ?? 0);
      if (popularityDelta !== 0) {
        return popularityDelta;
      }

      return a.name.localeCompare(b.name);
    });
  }, [projects, pinnedProjectIds, projectUsageCountById]);

  const sortedTagsForSidebar = useMemo(() => {
    return [...tags].sort((a, b) => {
      const popularityDelta = (tagUsageCountById.get(b.id) ?? 0) - (tagUsageCountById.get(a.id) ?? 0);
      if (popularityDelta !== 0) {
        return popularityDelta;
      }

      return a.name.localeCompare(b.name);
    });
  }, [tags, tagUsageCountById]);

  const sidebarProjects = useMemo(() => {
    if (showAllProjectsList) {
      return sortedProjectsForSidebar;
    }

    return sortedProjectsForSidebar.slice(0, DEFAULT_SIDEBAR_PREVIEW_COUNT);
  }, [showAllProjectsList, sortedProjectsForSidebar]);

  const sidebarTags = useMemo(() => {
    if (showAllTagsList) {
      return sortedTagsForSidebar;
    }

    return sortedTagsForSidebar.slice(0, DEFAULT_SIDEBAR_PREVIEW_COUNT);
  }, [showAllTagsList, sortedTagsForSidebar]);

  const hiddenProjectsCount = Math.max(0, sortedProjectsForSidebar.length - sidebarProjects.length);
  const hiddenTagsCount = Math.max(0, sortedTagsForSidebar.length - sidebarTags.length);

  const events = useMemo<CalendarEvent[]>(() => {
    return filteredItems.map((item) => ({
      title: item.project?.emoji ? `${item.project.emoji} ${item.title}` : item.title,
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
      title: format(new Date(groupKey), "EEEE", { locale: dateFnsLocale }),
      dateLabel: format(new Date(groupKey), "dd MMM", { locale: dateFnsLocale }),
      items: groupItems,
    }));
  }, [filteredItems, dateFnsLocale]);

  const agendaStats = useMemo(() => {
    const todayKey = format(new Date(), "yyyy-MM-dd");

    const todayItems = filteredItems.filter(
      (item) => format(new Date(item.startAt), "yyyy-MM-dd") === todayKey
    ).length;

    const doneItems = filteredItems.filter((item) => item.kind === "TASK" && item.status === "DONE").length;

    // Items from the first pinned project, or all items with any project if nothing is pinned
    const focusProjectId = pinnedProjectIds[0] ?? null;
    const workItems = focusProjectId
      ? filteredItems.filter((item) => item.projectId === focusProjectId).length
      : filteredItems.filter((item) => item.projectId !== null).length;

    return {
      totalItems: filteredItems.length,
      todayItems,
      doneItems,
      workItems,
    };
  }, [filteredItems, pinnedProjectIds]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDatePicker) return;
    function handleClick(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDatePicker]);

  const currentTitle = useMemo(() => {
    if (view === "month") {
      return format(date, "LLLL yyyy", { locale: dateFnsLocale });
    }

    if (view === "week") {
      const start = startOfWeek(date, { locale: dateFnsLocale });
      const end = addDays(start, 6);
      return `${format(start, "d MMM", { locale: dateFnsLocale })} —  ${format(end, "d MMM yyyy", { locale: dateFnsLocale })}`;
    }

    if (view === "agenda") {
      return format(date, "LLLL yyyy", { locale: dateFnsLocale });
    }

    return format(date, "d MMMM yyyy", { locale: dateFnsLocale });
  }, [date, view, dateFnsLocale]);

  const isWeekView = view === "week";
  const isDayView = view === "day";
  const isTimeGridView = isWeekView || isDayView;


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
        if (input.editScope === "all" && editingItem.seriesId) {
          await updateItemSeries(editingItem.seriesId, input);
        } else {
          // "This event" edit: detach the occurrence from its series so it
          // no longer shows the recurrence picker on subsequent opens.
          const patchInput = editingItem.seriesId
            ? { ...input, recurrenceRule: null, seriesId: null }
            : input;
          await updateItem(editingItem.id, patchInput);
        }
      }

      await loadCalendarData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save item.");
      throw submitError;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, scope?: "this" | "all") {
    setSaving(true);
    setError("");

    try {
      if (scope === "all") {
        const item = items.find((i) => i.id === id);
        if (item?.seriesId) {
          await deleteItemSeries(item.seriesId);
        } else {
          await deleteItem(id);
        }
      } else {
        await deleteItem(id);
      }
      await loadCalendarData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete item.");
      throw deleteError;
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleDone(item: ApiItem) {
    if (item.kind !== "TASK") return;
    const newStatus = item.status === "DONE" ? "TODO" : "DONE";
    // Optimistic update — no page reload
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
    );
    try {
      await updateItem(item.id, { status: newStatus });
    } catch {
      // Revert on error
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i))
      );
    }
  }

  const toggleDoneRef = useRef(handleToggleDone);
  useLayoutEffect(() => { toggleDoneRef.current = handleToggleDone; });

  const calendarEventComponent = useMemo(() => {
    const SPARKS = [
      { tx: "-6px", ty: "-6px", color: "#fde68a" },
      { tx: "6px",  ty: "-6px", color: "#6ee7b7" },
      { tx: "7px",  ty: "4px",  color: "#a5b4fc" },
      { tx: "-5px", ty: "5px",  color: "#f9a8d4" },
      { tx: "0px",  ty: "-8px", color: "#fed7aa" },
      { tx: "1px",  ty: "7px",  color: "#67e8f9" },
    ];

    function CalEventWrapper({ event }: { event: object }) {
      const item = (event as CalendarEvent).resource;
      const isTask = item.kind === "TASK";
      const isDone = item.status === "DONE";
      const [popping, setPopping] = useState(false);
      const [sparking, setSparking] = useState(false);

      function handleCheck(e: React.MouseEvent) {
        e.stopPropagation();
        setPopping(true);
        setTimeout(() => setPopping(false), 420);
        if (!isDone) {
          setSparking(true);
          setTimeout(() => setSparking(false), 500);
        }
        void toggleDoneRef.current(item);
      }

      return (
        <div className="flex h-full w-full items-start gap-1 overflow-hidden">
          {isTask && (
            <div className="relative mt-px shrink-0" style={{ zIndex: 10 }}>
              <button
                type="button"
                onClick={handleCheck}
                title={isDone ? "Mark as to-do" : "Mark as done"}
                className={`flex h-[14px] w-[14px] items-center justify-center rounded-sm border text-[9px] font-bold leading-none transition-colors ${
                  isDone
                    ? "border-white/80 bg-white/40 text-white"
                    : "border-white/50 bg-white/15 text-white hover:border-white/80 hover:bg-white/30"
                } ${popping ? "task-check-pop" : ""}`}
              >
                {isDone ? "✓" : ""}
              </button>
              {sparking && SPARKS.map((s, i) => (
                <span
                  key={i}
                  className="task-spark"
                  style={{
                    top: "7px", left: "7px",
                    "--tx": s.tx, "--ty": s.ty,
                    backgroundColor: s.color,
                    animationDelay: `${i * 18}ms`,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          )}
          {item.seriesId && (
            <span className="shrink-0 text-[9px] opacity-70" title="Recurring">&#8635;</span>
          )}
          <span className="min-w-0 truncate text-xs leading-tight">{item.title}</span>
        </div>
      );
    }
    return CalEventWrapper;
  }, []); // stable - uses ref internally

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
        emoji: newProjectEmoji.trim() || null,
        archived: false,
      });

      setNewProjectName("");
      setNewProjectEmoji("");
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
    setEditProjectDraft({ name: project.name, color: project.color, emoji: project.emoji ?? "" });
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
        emoji: editProjectDraft.emoji.trim() || null,
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

  function togglePinnedProject(projectId: string) {
    setPinnedProjectIds((current) => {
      if (current.includes(projectId)) {
        return current.filter((id) => id !== projectId);
      }

      if (current.length >= MAX_PINNED_PROJECTS) {
        return [...current.slice(1), projectId];
      }

      return [...current, projectId];
    });
  }

  function handleFocusWorkProject() {
    // Use first pinned project, then fall back to most-used active project
    const firstPinned = pinnedProjectIds
      .map((id) => projects.find((p) => p.id === id && !p.archived))
      .find(Boolean);

    if (firstPinned) {
      focusProject(firstPinned.id);
      return;
    }

    const byUsage = [...projects]
      .filter((p) => !p.archived)
      .sort((a, b) => (projectUsageCountById.get(b.id) ?? 0) - (projectUsageCountById.get(a.id) ?? 0));

    if (byUsage[0]) {
      focusProject(byUsage[0].id);
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
    <div className="dinox-shell flex h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)]">
      {/* Sidebar backdrop (mobile/tablet) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`
        flex w-[280px] shrink-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-surface)] p-3 overflow-y-auto
        max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:transition-transform max-lg:duration-300
        ${sidebarOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"}
      `}>
        <div className="flex flex-1 flex-col">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--app-muted)]">Dinox</p>
            <h1 className="text-xl font-semibold text-[var(--app-text)]">Local-First Calendar</h1>
          </div>

          {/* Today strip */}
          {(() => {
            const todayKey = format(new Date(), "yyyy-MM-dd");
            const todayEvents = filteredItems
              .filter((item) => format(new Date(item.startAt), "yyyy-MM-dd") === todayKey)
              .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
            const visible = todayEvents.slice(0, 3);
            const overflow = todayEvents.length - visible.length;
            return (
              <section className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--app-muted)]">{t.today}</h2>
                  <span className="font-mono text-[10px] text-[var(--app-muted)]">{format(new Date(), "d MMM", { locale: dateFnsLocale })}</span>
                </div>
                {visible.length === 0 ? (
                  <p className="text-xs text-[var(--app-muted)]">{t.noEventsToday}</p>
                ) : (
                  <div className="space-y-1">
                    {visible.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-lg border border-[var(--app-border)] px-2 py-1.5 transition hover:border-[var(--app-border-strong)]"
                        style={{ backgroundColor: "color-mix(in srgb, var(--app-surface) 60%, transparent)" }}
                      >
                        {item.kind === "TASK" ? (
                        <button
                          type="button"
                          onClick={() => void handleToggleDone(item)}
                          title={item.status === "DONE" ? "Mark as to do" : "Mark as done"}
                          className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[9px] transition ${
                            item.status === "DONE"
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-[var(--app-border-strong)] text-transparent hover:border-emerald-600 hover:text-emerald-600"
                          }`}
                        >
                          v
                        </button>
                      ) : (
                        <span
                          className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-[var(--app-border-strong)] px-1 text-[7px] uppercase tracking-[0.08em] text-[var(--app-subtle-text)]"
                          title="Event"
                        >
                          evt
                        </span>
                      )}
                        <button
                          type="button"
                          onClick={() => openEditItemModal(item)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <span className="font-mono text-[10px] text-[var(--app-muted)] flex-shrink-0">
                            {format(new Date(item.startAt), prefs.timeFormat === "12h" ? "h:mm a" : "HH:mm", { locale: dateFnsLocale })}
                          </span>
                          <span className={`truncate text-xs font-medium ${item.status === "DONE" ? "line-through opacity-40" : "text-[var(--app-text)]"}`}>
                            {item.title}
                          </span>
                        </button>
                        {item.project ? (
                          <span className="inline-flex items-center gap-1" title={item.project.name}>
                            {item.project.emoji ? <span className="text-xs leading-none">{item.project.emoji}</span> : null}
                            <span
                              className="h-2 w-2 flex-shrink-0 rounded-full"
                              style={{ backgroundColor: item.project.color }}
                            />
                          </span>
                        ) : null}
                      </div>
                    ))}
                    {overflow > 0 && (
                      <button
                        type="button"
                        onClick={() => setView("agenda")}
                        className="text-[11px] text-[var(--app-muted)] hover:text-[var(--app-text)] transition pl-1"
                      >
                        {t.more(overflow)} {t.moreAgenda}
                      </button>
                    )}
                  </div>
                )}
              </section>
            );
          })()}

          {/* Projects */}
          <section className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSidebarProjectsCollapsed((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
              >
                <span className={`transition-transform duration-200 ${sidebarProjectsCollapsed ? "-rotate-90" : ""}`}>▾</span>
                {t.projects}
              </button>
              <div className="flex items-center gap-1">
                {hiddenProjectsCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllProjectsList((current) => !current)}
                    className="rounded-md border border-[var(--app-border-strong)] px-1.5 py-0.5 text-[10px] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                  >
                    {showAllProjectsList ? "less" : `${hiddenProjectsCount} more`}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowProjectCreateForm((current) => !current)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--app-border-strong)] text-xs text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                  title={showProjectCreateForm ? "Hide project form" : "Add project"}
                >
                  +
                </button>
              </div>
            </div>

            {!sidebarProjectsCollapsed && (<>
            <div className="mb-2 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={showAllProjects}
                className="rounded-md border border-[var(--app-border-strong)] px-1.5 py-0.5 text-[10px] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
              >
                Show all
              </button>
              <button
                type="button"
                onClick={hideAllProjects}
                className="rounded-md border border-[var(--app-border-strong)] px-1.5 py-0.5 text-[10px] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
              >
                Hide all
              </button>
              <button
                type="button"
                onClick={() => setShowUnassigned((current) => !current)}
                className={`rounded-md border px-1.5 py-0.5 text-[10px] transition ${
                  showUnassigned
                    ? "border-[var(--app-accent)] text-[var(--app-accent)]"
                    : "border-[var(--app-border-strong)] text-[var(--app-muted)]"
                }`}
              >
                Unassigned
              </button>
            </div>

            {showProjectCreateForm ? (
              <form onSubmit={handleCreateProject} className="mb-2 grid gap-1.5">
                <div className="relative grid grid-cols-[auto_1fr_auto_auto] gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowNewProjectEmojiPicker((v) => !v)}
                    className="h-8 w-9 rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] text-center text-lg leading-none transition hover:border-[var(--app-accent)]"
                    title="Pick emoji"
                  >
                    {newProjectEmoji || "📂"}
                  </button>
                  {showNewProjectEmojiPicker && (
                    <div className="absolute left-0 top-full z-50 mt-1">
                      <EmojiPicker
                        onSelect={(e) => { setNewProjectEmoji(e); setShowNewProjectEmojiPicker(false); }}
                        onClose={() => setShowNewProjectEmojiPicker(false)}
                      />
                    </div>
                  )}
                  <input
                    value={newProjectName}
                    onChange={(event) => setNewProjectName(event.target.value)}
                    placeholder={t.newProject}
                    className="h-8 rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-2 text-xs text-[var(--app-text)] placeholder:text-[var(--app-muted)]"
                  />
                  <input
                    type="color"
                    value={newProjectColor}
                    onChange={(event) => setNewProjectColor(event.target.value)}
                    className="h-8 w-8 cursor-pointer rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] p-0.5"
                  />
                  <button
                    type="submit"
                    className="h-8 rounded-lg bg-[var(--app-accent)] px-2 text-xs font-semibold text-[var(--app-bg)] transition hover:bg-[var(--app-accent-strong)] hover:text-[var(--app-text)]"
                  >
                    {t.add}
                  </button>
                </div>
              </form>
            ) : null}

            <div className="space-y-1 pr-0.5">
              {sidebarProjects.map((project) => {
                const visible = visibleProjectIds.includes(project.id);
                const isEditing = editingProjectId === project.id;
                const isConfirmingDelete = confirmDeleteProjectId === project.id;
                const usageCount = projectUsageCountById.get(project.id) ?? 0;
                const isPinned = pinnedProjectIds.includes(project.id);

                if (isEditing) {
                  return (
                    <div
                      key={project.id}
                      className="rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] p-1.5"
                    >
                      <div className="relative grid grid-cols-[auto_1fr_auto] gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditProjectEmojiPickerId((v) => v === project.id ? null : project.id)}
                          className="h-7 w-8 rounded-md border border-[var(--app-border-strong)] bg-[var(--app-surface)] text-center text-sm leading-none transition hover:border-[var(--app-accent)]"
                          title="Pick emoji"
                        >
                          {editProjectDraft.emoji || "📂"}
                        </button>
                        {editProjectEmojiPickerId === project.id && (
                          <div className="absolute left-0 top-full z-50 mt-1">
                            <EmojiPicker
                              onSelect={(e) => { setEditProjectDraft((d) => ({ ...d, emoji: e })); setEditProjectEmojiPickerId(null); }}
                              onClose={() => setEditProjectEmojiPickerId(null)}
                            />
                          </div>
                        )}
                        <input
                          autoFocus
                          value={editProjectDraft.name}
                          onChange={(e) => setEditProjectDraft((d) => ({ ...d, name: e.target.value }))}
                          className="h-7 rounded-md border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-2 text-xs text-[var(--app-text)]"
                        />
                        <input
                          type="color"
                          value={editProjectDraft.color}
                          onChange={(e) => setEditProjectDraft((d) => ({ ...d, color: e.target.value }))}
                          className="h-7 w-7 cursor-pointer rounded-md border border-[var(--app-border-strong)] bg-[var(--app-surface)] p-0.5"
                        />
                      </div>
                      <div className="mt-1 flex gap-1">
                        <button
                          type="button"
                          onClick={() => void handleSaveProject(project.id)}
                          className="rounded-md bg-[var(--app-accent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--app-bg)]"
                        >
                          {t.save}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingProjectId(null)}
                          className="rounded-md border border-[var(--app-border-strong)] px-2 py-0.5 text-[10px] text-[var(--app-muted)]"
                        >
                          {t.cancel}
                        </button>
                      </div>
                    </div>
                  );
                }

                if (isConfirmingDelete) {
                  return (
                    <div
                      key={project.id}
                      className="flex items-center gap-2 rounded-lg border border-[var(--app-danger)] bg-[color-mix(in_srgb,var(--app-danger)_8%,transparent)] px-2 py-1.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--app-danger)]">{t.deleteQ(project.name)}</span>
                      <button
                        type="button"
                        onClick={() => void handleDeleteProject(project.id)}
                        className="rounded-md bg-[var(--app-danger)] px-2 py-0.5 text-[10px] font-semibold text-white"
                      >
                        {t.yes}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteProjectId(null)}
                        className="rounded-md border border-[var(--app-border-strong)] px-2 py-0.5 text-[10px] text-[var(--app-muted)]"
                      >
                        {t.no}
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={project.id}
                    className="group flex h-8 items-center gap-1 rounded-lg border border-[var(--app-border)] px-2 text-xs"
                    style={{ backgroundColor: "color-mix(in srgb, var(--app-surface-2) 45%, transparent)" }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleProjectVisibility(project.id)}
                      className={`inline-flex h-5 w-5 items-center justify-center rounded border text-[9px] ${
                        visible
                          ? "border-[var(--app-accent)] text-[var(--app-accent)]"
                          : "border-[var(--app-border-strong)] text-[var(--app-muted)]"
                      }`}
                      title={visible ? "Hide project" : "Show project"}
                    >
                      {visible ? "on" : "--"}
                    </button>
                    {project.emoji ? (
                      <span className="text-sm leading-none">{project.emoji}</span>
                    ) : (
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                    )}
                    <Link
                      href={`/projects/${project.id}`}
                      className="min-w-0 flex-1 truncate hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >{project.name}</Link>
                    {usageCount > 0 ? (
                      <span className="rounded-md border border-[var(--app-border-strong)] px-1 py-0.5 text-[9px] text-[var(--app-muted)]">
                        {usageCount}
                      </span>
                    ) : null}
                    {project.archived ? (
                      <span className="rounded-md border border-[var(--app-border-strong)] px-1 py-0.5 text-[9px] uppercase tracking-wide text-[var(--app-muted)]">
                        arc
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => togglePinnedProject(project.id)}
                      className={`flex h-5 w-5 items-center justify-center rounded text-[11px] transition ${
                        isPinned
                          ? "text-[var(--app-accent)]"
                          : "text-[var(--app-muted)] opacity-0 group-hover:opacity-100"
                      }`}
                      title={isPinned ? "Unpin" : "Pin"}
                    >
                      📌
                    </button>
                    <div className="pointer-events-none ml-0.5 flex items-center opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => focusProject(project.id)}
                        className="flex h-5 w-5 items-center justify-center rounded text-[11px] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                        title="Show only this project"
                      >
                        ⬤
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditProject(project)}
                        className="flex h-5 w-5 items-center justify-center rounded text-[11px] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleProjectArchive(project)}
                        className="flex h-5 w-5 items-center justify-center rounded text-[11px] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                        title={project.archived ? "Unarchive" : "Archive"}
                      >
                        {project.archived ? "📁" : "📂"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteProject(project.id)}
                        className="flex h-5 w-5 items-center justify-center rounded text-[11px] text-[var(--app-danger)] transition hover:opacity-80"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            </>)}
          </section>
          {/* Tags */}
          <section className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSidebarTagsCollapsed((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
              >
                <span className={`transition-transform duration-200 ${sidebarTagsCollapsed ? "-rotate-90" : ""}`}>▾</span>
                {t.tags}
              </button>
              <div className="flex items-center gap-1">
                {hiddenTagsCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllTagsList((current) => !current)}
                    className="rounded-md border border-[var(--app-border-strong)] px-1.5 py-0.5 text-[10px] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                  >
                    {showAllTagsList ? "less" : `${hiddenTagsCount} more`}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowTagCreateForm((current) => !current)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--app-border-strong)] text-xs text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                  title={showTagCreateForm ? "Hide tag form" : "Add tag"}
                >
                  +
                </button>
              </div>
            </div>

            {!sidebarTagsCollapsed && (<>
            {showTagCreateForm ? (
              <form onSubmit={handleCreateTag} className="mb-2 grid grid-cols-[1fr_auto_auto] gap-1.5">
                <input
                  value={newTagName}
                  onChange={(event) => setNewTagName(event.target.value)}
                  placeholder={t.newTag}
                  className="h-8 rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-2 text-xs text-[var(--app-text)] placeholder:text-[var(--app-muted)]"
                />
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(event) => setNewTagColor(event.target.value)}
                  className="h-8 w-8 cursor-pointer rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] p-0.5"
                />
                <button
                  type="submit"
                  className="h-8 rounded-lg bg-[var(--app-accent)] px-2 text-xs font-semibold text-[var(--app-bg)] transition hover:bg-[var(--app-accent-strong)] hover:text-[var(--app-text)]"
                >
                  {t.add}
                </button>
              </form>
            ) : null}

            <div className="space-y-1">
              {sidebarTags.map((tag) => {
                const active = activeTagFilterIds.includes(tag.id);
                const isEditingTag = editingTagId === tag.id;
                const isConfirmingTagDelete = confirmDeleteTagId === tag.id;
                const usageCount = tagUsageCountById.get(tag.id) ?? 0;

                if (isEditingTag) {
                  return (
                    <div
                      key={tag.id}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] p-1.5"
                    >
                      <input
                        autoFocus
                        value={editTagDraft.name}
                        onChange={(e) => setEditTagDraft((d) => ({ ...d, name: e.target.value }))}
                        className="h-7 min-w-0 flex-1 rounded-md border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-2 text-xs text-[var(--app-text)]"
                      />
                      <input
                        type="color"
                        value={editTagDraft.color}
                        onChange={(e) => setEditTagDraft((d) => ({ ...d, color: e.target.value }))}
                        className="h-7 w-7 cursor-pointer rounded-md border border-[var(--app-border-strong)] p-0.5"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSaveTag(tag.id)}
                        className="rounded-md bg-[var(--app-accent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--app-bg)]"
                      >
                        {t.save}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTagId(null)}
                        className="rounded-md border border-[var(--app-border-strong)] px-2 py-0.5 text-[10px] text-[var(--app-muted)]"
                      >
                        {t.cancel}
                      </button>
                    </div>
                  );
                }

                if (isConfirmingTagDelete) {
                  return (
                    <div
                      key={tag.id}
                      className="flex items-center gap-2 rounded-lg border border-[var(--app-danger)] bg-[color-mix(in_srgb,var(--app-danger)_8%,transparent)] px-2 py-1.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--app-danger)]">{t.deleteQ(`#${tag.name}`)}</span>
                      <button
                        type="button"
                        onClick={() => void handleDeleteTag(tag.id)}
                        className="rounded-md bg-[var(--app-danger)] px-2 py-0.5 text-[10px] font-semibold text-white"
                      >
                        {t.yes}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteTagId(null)}
                        className="rounded-md border border-[var(--app-border-strong)] px-2 py-0.5 text-[10px] text-[var(--app-muted)]"
                      >
                        {t.no}
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={tag.id}
                    className={`group flex h-8 items-center gap-1 rounded-lg border px-2 text-xs ${
                      active ? "text-[var(--app-text)]" : "text-[var(--app-muted)]"
                    }`}
                    style={{
                      borderColor: active ? tag.color : "var(--app-border-strong)",
                      backgroundColor: active
                        ? `color-mix(in srgb, ${tag.color} 76%, transparent)`
                        : "transparent",
                    }}
                  >
                    <button type="button" onClick={() => toggleTagFilter(tag.id)} className="min-w-0 flex-1 truncate text-left">
                      #{tag.name}
                    </button>
                    {usageCount > 0 ? (
                      <span className="rounded-md border border-[var(--app-border-strong)] px-1 py-0.5 text-[9px] text-[var(--app-muted)]">
                        {usageCount}
                      </span>
                    ) : null}
                    <div className="pointer-events-none ml-0.5 flex items-center opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleEditTag(tag)}
                        className="flex h-5 w-5 items-center justify-center rounded text-[11px] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteTag(tag.id)}
                        className="flex h-5 w-5 items-center justify-center rounded text-[11px] text-[var(--app-danger)] transition hover:opacity-80"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            </>)}
          </section>
          {/* Navigation */}
          <nav className="mt-auto border-t border-[var(--app-border)] pt-3">
            <div className="flex items-center gap-1.5">
              <Link
                href="/"
                title="Calendar"
                className="flex h-9 flex-1 items-center justify-center rounded-lg border border-[var(--app-accent)] bg-[var(--app-surface-2)] text-base text-[var(--app-accent)] transition hover:opacity-80"
              >
                📅
              </Link>
              <Link
                href="/dashboard"
                title="Dashboard"
                className="flex h-9 flex-1 items-center justify-center rounded-lg border border-[var(--app-border-strong)] text-base text-[var(--app-muted)] transition hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]"
              >
                📊
              </Link>
              <Link
                href="/settings"
                title="Settings"
                className="flex h-9 flex-1 items-center justify-center rounded-lg border border-[var(--app-border-strong)] text-base text-[var(--app-muted)] transition hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]"
              >
                ⚙️
              </Link>
            </div>
          </nav>
        </div>
      </aside>

      <section className="flex flex-1 min-w-0 flex-col overflow-hidden p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-1.5">
          {/* Hamburger — visible only below lg */}
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="mr-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--app-border-strong)] text-[var(--app-muted)] transition hover:text-[var(--app-text)] lg:hidden"
            aria-label="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="3" width="14" height="1.5" rx="0.75"/>
              <rect x="1" y="7.25" width="14" height="1.5" rx="0.75"/>
              <rect x="1" y="11.5" width="14" height="1.5" rx="0.75"/>
            </svg>
          </button>
          <div className="relative flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="rounded-md border border-[var(--app-border-strong)] px-1.5 py-0.5 text-xs text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setDate(new Date())}
              className="rounded-md border border-[var(--app-border-strong)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
            >
              {t.today}
            </button>
            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="rounded-md border border-[var(--app-border-strong)] px-1.5 py-0.5 text-xs text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
            >
              ›
            </button>
            <button
              type="button"
              onClick={() => { setPickerYear(date.getFullYear()); setShowDatePicker((v) => !v); }}
              className="ml-1 rounded-lg px-2 py-1 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-surface)] hover:text-[var(--app-accent)]"
            >
              {currentTitle} ▾
            </button>

            {showDatePicker && (
              <div ref={datePickerRef} className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between border-b border-[var(--app-border)] px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => setPickerYear((y) => y - 1)}
                    className="text-sm text-[var(--app-muted)] hover:text-[var(--app-text)]"
                  >‹</button>
                  <span className="text-sm font-semibold text-[var(--app-text)]">{pickerYear}</span>
                  <button
                    type="button"
                    onClick={() => setPickerYear((y) => y + 1)}
                    className="text-sm text-[var(--app-muted)] hover:text-[var(--app-text)]"
                  >›</button>
                </div>
                <div className="grid grid-cols-3 gap-1 p-3">
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthDate = new Date(pickerYear, i, 1);
                    const label = format(monthDate, "MMM", { locale: dateFnsLocale });
                    const isActive = date.getFullYear() === pickerYear && date.getMonth() === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const next = new Date(pickerYear, i, 1);
                          setDate(next);
                          setShowDatePicker(false);
                        }}
                        className={`rounded-lg py-1.5 text-xs capitalize transition ${
                          isActive
                            ? "bg-[var(--app-accent)] text-[var(--app-bg)] font-semibold"
                            : "text-[var(--app-muted)] hover:bg-[var(--app-surface-2)] hover:text-[var(--app-text)]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface)] p-0.5">
              {viewOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`rounded-md px-2.5 py-1 text-xs transition ${
                    view === option
                      ? "bg-[var(--app-accent)] text-[var(--app-bg)]"
                      : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
                  }`}
                  onClick={() => setView(option)}
                >
                  {option === "month" ? t.month : option === "week" ? t.week : option === "day" ? t.day : t.agenda}
                </button>
              ))}
            </div>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="h-7 min-w-[180px] rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-2.5 text-xs text-[var(--app-text)] placeholder:text-[var(--app-muted)]"
            />
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--app-danger)", color: "var(--app-danger)" }}>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className={`rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-inner ${
                isTimeGridView ? "flex min-h-0 flex-1" : ""
              }`}>
            <p className="py-20 text-center text-sm text-[var(--app-muted)]">{t.loading}</p>
          </div>
        ) : !loading && items.length === 0 && projects.length === 0 && tags.length === 0 ? (
          <OnboardingScreen
            onLoadDemo={() => void handleLoadDemo()}
            onCreateEvent={() => openNewItemModal(date, defaultEndFromStart(date))}
            loading={saving}
          />
        ) : view === "agenda" ? (
          <AgendaWorkspace
            groups={agendaGroups}
            totalItems={agendaStats.totalItems}
            todayItems={agendaStats.todayItems}
            doneItems={agendaStats.doneItems}
            workItems={agendaStats.workItems}
            timeFormat={prefs.timeFormat}
            onSelectItem={openEditItemModal}
            onToggleDone={(item) => void handleToggleDone(item)}
            onCreateItem={() => openNewItemModal(date, defaultEndFromStart(date))}
            onFocusWork={handleFocusWorkProject}
            onJumpToday={() => setDate(new Date())}
          />
        ) : (
          <>
            <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-inner flex min-h-0 flex-1">
              <style>{`
                .rbc-overlay {
                  background-color: var(--app-surface) !important;
                  background: var(--app-surface) !important;
                  border: 1px solid var(--app-border-strong) !important;
                  border-radius: 18px !important;
                  padding: 0 !important;
                  box-shadow:
                    0 0 0 1px color-mix(in srgb, var(--app-accent) 18%, transparent),
                    0 32px 80px rgba(0,0,0,0.55),
                    0 8px 24px rgba(0,0,0,0.3) !important;
                  color: var(--app-text) !important;
                  min-width: 240px;
                  max-width: 320px;
                  overflow: hidden;
                  display: flex;
                  flex-direction: column;
                  animation: rbcOverlayIn 0.18s cubic-bezier(0.16,1,0.3,1) both;
                }
                @keyframes rbcOverlayIn {
                  from { opacity:0; transform:scale(0.92) translateY(-6px); filter:blur(4px); }
                  to   { opacity:1; transform:scale(1)    translateY(0);    filter:blur(0); }
                }
                .rbc-overlay-header {
                  background: color-mix(in srgb, var(--app-accent) 12%, var(--app-surface)) !important;
                  border-bottom: 1px solid var(--app-border) !important;
                  border-radius: 18px 18px 0 0 !important;
                  color: var(--app-text) !important;
                  font-size: 12px !important;
                  font-weight: 700 !important;
                  letter-spacing: 0.05em;
                  padding: 11px 14px 10px !important;
                  margin: 0 !important;
                }
                .rbc-overlay > * + * { margin-top: 0 !important; }
                .rbc-overlay .rbc-event {
                  margin: 0 8px 3px !important;
                  border-radius: 10px !important;
                  padding: 5px 10px !important;
                  font-size: 12px !important;
                  min-height: 30px;
                  transition: filter 0.1s, transform 0.1s;
                }
                .rbc-overlay .rbc-event:first-of-type { margin-top: 6px !important; }
                .rbc-overlay .rbc-event:last-of-type  { margin-bottom: 8px !important; }
                .rbc-overlay .rbc-event:hover { filter:brightness(1.13); transform:translateX(2px); }
                .rbc-overlay .rbc-event-content {
                  font-size: 12px !important;
                  font-weight: 500 !important;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }
              `}</style>
              <div
                className={`calendar-container w-full ${isDayView ? "calendar-day-mode" : ""} ${isWeekView ? "calendar-week-mode" : ""} ${
                  isDayView
                    ? "h-[78dvh] min-h-[620px] xl:h-full xl:min-h-0"
                    : isWeekView
                      ? "h-[72dvh] min-h-[500px] xl:h-full xl:min-h-0"
                      : "h-[65dvh] min-h-[420px] xl:h-full xl:min-h-0"
                }`}
              >
                <Calendar
                  localizer={localizer}
                  formats={calendarFormats}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  view={view}
                  onView={(nextView) => setView(nextView)}
                  date={date}
                  onNavigate={(nextDate) => setDate(nextDate)}
                  selectable
                  popup
                  popupOffset={{ x: 16, y: 16 }}
                  step={isTimeGridView ? 15 : 30}
                  timeslots={isTimeGridView ? 4 : 2}
                  min={calendarMinTime}
                  max={calendarMaxTime}
                  scrollToTime={calendarScrollTime}
                  slotGroupPropGetter={() => ({
                    style: {
                      flex: "none",
                      minHeight: isDayView ? "80px" : "60px",
                    },
                  })}
                  onSelectSlot={handleSelectSlot}
                  onSelectEvent={(selectedEvent) => openEditItemModal((selectedEvent as CalendarEvent).resource)}
                  dayPropGetter={(calDay: Date) => {
                    if (isSameDay(calDay, new Date())) {
                      return {
                        style: {
                          backgroundColor: "color-mix(in srgb, var(--app-accent) 12%, transparent)",
                        },
                        className: "rbc-today-highlight",
                      };
                    }
                    return {};
                  }}
                  messages={{
                    allDay: t.allDay,
                    previous: "‹",
                    next: "›",
                    today: t.today,
                    month: t.month,
                    week: t.week,
                    day: t.day,
                    agenda: t.agenda,
                    date: appLocale === "ru" ? "Дата" : "Date",
                    time: appLocale === "ru" ? "Время" : "Time",
                    event: appLocale === "ru" ? "Событие" : "Event",
                    noEventsInRange: t.noItemsInRange,
                    showMore: (total) => `+${total} ${appLocale === "ru" ? "ещё" : "more"}`,
                  }}
                  components={{ event: calendarEventComponent as never }}
                  eventPropGetter={(event) => {
                    const item = (event as CalendarEvent).resource;
                    const baseColor = item.color ?? item.project?.color ?? "#64748b";

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
                        textDecoration: item.kind === "TASK" && item.status === "DONE" ? "line-through" : "none",
                        border: "none",
                        borderRadius: "8px",
                        padding: "2px 6px",
                      },
                    };
                  }}
                />
              </div>
            </div>

          </>
        )}
      </section>

      {!loading && items.length === 0 && projects.length > 0 && (
        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-5 py-4">
          <p className="text-sm text-[var(--app-muted)]">
            No events yet -- press{" "}
            <kbd className="rounded border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-1 font-mono text-[10px]">N</kbd>{" "}
            or click <strong className="text-[var(--app-text)]">New</strong> to create one.
          </p>
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
        timeFormat={prefs.timeFormat}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
          }
        }}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </div>
  );
}












