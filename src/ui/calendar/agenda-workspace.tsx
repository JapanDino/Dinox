"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ApiItem, ApiItemStatus } from "@/src/ui/api/types";

export interface AgendaGroup {
  groupKey: string;
  title: string;
  dateLabel: string;
  items: ApiItem[];
}

interface AgendaWorkspaceProps {
  groups: AgendaGroup[];
  startLabel: string;
  totalItems: number;
  todayItems: number;
  doneItems: number;
  workItems: number;
  timeFormat: "24h" | "12h";
  onSelectItem: (item: ApiItem) => void;
  onToggleDone: (item: ApiItem) => void;
  onCreateItem: () => void;
  onFocusWork: () => void;
  onJumpToday: () => void;
}

const statusStyles: Record<ApiItemStatus, string> = {
  TODO: "border-sky-700/70 bg-sky-950/40 text-sky-200",
  DONE: "border-emerald-700/70 bg-emerald-950/40 text-emerald-200",
  CANCELLED: "border-red-700/70 bg-red-950/40 text-red-200",
};

const statusLabels: Record<ApiItemStatus, string> = {
  TODO: "todo",
  DONE: "done",
  CANCELLED: "cancelled",
};

export function AgendaWorkspace({
  groups,
  startLabel,
  totalItems,
  todayItems,
  doneItems,
  workItems,
  timeFormat,
  onSelectItem,
  onToggleDone,
  onCreateItem,
  onFocusWork,
  onJumpToday,
}: AgendaWorkspaceProps) {
  const timeToken = timeFormat === "12h" ? "h:mm a" : "HH:mm";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.95fr)]">
      <article className="min-h-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-inner">
        <header className="flex min-h-12 items-center justify-between border-b border-[var(--app-border)] px-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">Timeline</p>
            <h3 className="text-sm font-semibold text-[var(--app-text)]">Upcoming from {startLabel}</h3>
          </div>
          <span className="rounded-full border border-[var(--app-border-strong)] px-2 py-1 text-[10px] font-mono text-[var(--app-muted)]">
            {totalItems} items
          </span>
        </header>

        {groups.length === 0 ? (
          <div className="px-4 py-10">
            <div className="max-w-md rounded-xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--app-text)]">No upcoming items</p>
              <p className="mt-1 text-xs text-[var(--app-muted)]">
                Create an item for this date or clear active filters to widen the timeline.
              </p>
              <button
                type="button"
                onClick={onCreateItem}
                aria-label="New item"
                className="mt-3 inline-flex h-8 items-center rounded-lg bg-[var(--app-accent)] px-3 text-xs font-semibold text-[var(--app-bg)] transition hover:bg-[var(--app-accent-strong)] hover:text-[var(--app-text)]"
              >
                + New item
              </button>
            </div>
          </div>
        ) : (
          <div className="max-h-[72dvh] space-y-3 overflow-y-auto p-3">
            {groups.map((group) => (
              <section key={group.groupKey} className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)]">
                <header className="flex min-h-9 items-center justify-between border-b border-[var(--app-border)] px-3">
                  <p className="text-xs font-semibold text-[var(--app-text)]">{group.title}</p>
                  <span className="font-mono text-[10px] text-[var(--app-subtle-text)]">{group.dateLabel}</span>
                </header>

                <div className="space-y-1.5 p-2">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="grid w-full grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg border border-[var(--app-border)] px-2.5 py-2 transition hover:border-[var(--app-border-strong)]"
                      style={{ backgroundColor: "color-mix(in srgb, var(--app-surface-2) 60%, var(--app-surface))" }}
                    >
                      {item.kind === "TASK" ? (
                        <button
                          type="button"
                          onClick={() => onToggleDone(item)}
                          title={item.status === "DONE" ? "Mark as to do" : "Mark as done"}
                          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border text-[11px] transition ${
                            item.status === "DONE"
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-[var(--app-border-strong)] text-transparent hover:border-emerald-600 hover:text-emerald-600"
                          }`}
                        >
                          v
                        </button>
                      ) : (
                        <span
                          className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-[var(--app-border-strong)] px-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle-text)]"
                          title="Event"
                        >
                          evt
                        </span>
                      )}

                      <span className="min-w-[48px] font-mono text-[10px] text-[var(--app-subtle-text)]">
                        {format(new Date(item.startAt), timeToken)}
                      </span>

                      <button type="button" onClick={() => onSelectItem(item)} className="min-w-0 text-left">
                        <span className={`block truncate text-[13px] font-semibold ${item.status === "DONE" ? "line-through opacity-50" : "text-[var(--app-text)]"}`}>
                          {item.title}
                        </span>
                        <span className="flex items-center gap-2 text-[11px] text-[var(--app-muted)]">
                          <span className="truncate">{item.description ?? "No description"}</span>
                          {item.trackedSeconds > 0 && (
                            <span className="shrink-0 font-mono text-[10px] text-amber-400" title="Time tracked">
                              ⏱ {item.trackedSeconds < 3600
                                ? `${Math.floor(item.trackedSeconds / 60)}m`
                                : `${Math.floor(item.trackedSeconds / 3600)}h ${Math.floor((item.trackedSeconds % 3600) / 60)}m`}
                            </span>
                          )}
                        </span>
                      </button>

                      <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.06em] ${statusStyles[item.status]}`}>
                        {statusLabels[item.status]}
                      </span>

                      {item.project ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium text-white" style={{ backgroundColor: item.project.color }}>
                          {item.project.emoji ? <span className="leading-none">{item.project.emoji}</span> : null}
                          <span>{item.project.name}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-[var(--app-muted)]">No project</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </article>

      <aside className="grid min-h-0 gap-4 lg:grid-cols-2 xl:grid-cols-1">
        <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-inner">
          <header className="min-h-12 border-b border-[var(--app-border)] px-4 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">Overview</p>
            <h3 className="text-sm font-semibold text-[var(--app-text)]">Agenda Snapshot</h3>
          </header>

          <div className="grid grid-cols-2 gap-2 p-3">
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--app-subtle-text)]">All items</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--app-text)]">{totalItems}</p>
            </div>
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--app-subtle-text)]">Today</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--app-text)]">{todayItems}</p>
            </div>
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--app-subtle-text)]">Focus</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--app-text)]">{workItems}</p>
            </div>
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--app-subtle-text)]">Done</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--app-text)]">{doneItems}</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-inner">
          <header className="min-h-12 border-b border-[var(--app-border)] px-4 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">Actions</p>
            <h3 className="text-sm font-semibold text-[var(--app-text)]">Quick Commands</h3>
          </header>

          <div className="space-y-2 p-3">
            <button
              type="button"
              onClick={onCreateItem}
              aria-label="New item"
              className="flex h-10 w-full items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-border-strong)]"
            >
              <span>+ New item</span>
              <span aria-hidden="true" className="font-mono text-[10px] text-[var(--app-subtle-text)]">N</span>
            </button>

            <button
              type="button"
              onClick={onFocusWork}
              aria-label="Filter work only"
              className="flex h-10 w-full items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-border-strong)]"
            >
              <span>Filter: Work only</span>
              <span aria-hidden="true" className="font-mono text-[10px] text-[var(--app-subtle-text)]">F</span>
            </button>

            <button
              type="button"
              onClick={onJumpToday}
              aria-label="Jump to today"
              className="flex h-10 w-full items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-border-strong)]"
            >
              <span>Jump to today</span>
              <span aria-hidden="true" className="font-mono text-[10px] text-[var(--app-subtle-text)]">T</span>
            </button>

            <Link
              href="/settings"
              aria-label="Open settings"
              className="flex h-10 w-full items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-border-strong)]"
            >
              <span>Open settings</span>
              <span aria-hidden="true" className="font-mono text-[10px] text-[var(--app-subtle-text)]">,</span>
            </Link>
          </div>
        </article>
      </aside>
    </div>
  );
}
