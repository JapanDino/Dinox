"use client";

import Link from "next/link";
import { ApiItem, ApiItemStatus } from "@/src/ui/api/types";

export interface AgendaGroup {
  groupKey: string;
  title: string;
  dateLabel: string;
  items: ApiItem[];
}

interface AgendaWorkspaceProps {
  groups: AgendaGroup[];
  totalItems: number;
  todayItems: number;
  doneItems: number;
  workItems: number;
  onSelectItem: (item: ApiItem) => void;
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
  totalItems,
  todayItems,
  doneItems,
  workItems,
  onSelectItem,
  onCreateItem,
  onFocusWork,
  onJumpToday,
}: AgendaWorkspaceProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.95fr)]">
      <article className="min-h-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-inner">
        <header className="flex min-h-12 items-center justify-between border-b border-[var(--app-border)] px-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">Timeline</p>
            <h3 className="text-sm font-semibold text-[var(--app-text)]">Upcoming By Day</h3>
          </div>
          <span className="rounded-full border border-[var(--app-border-strong)] px-2 py-1 text-[10px] font-mono text-[var(--app-muted)]">
            {totalItems} items
          </span>
        </header>

        {groups.length === 0 ? (
          <p className="px-4 py-8 text-sm text-[var(--app-muted)]">No items for active filters.</p>
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
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectItem(item)}
                      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg border border-[var(--app-border)] px-2.5 py-2 text-left transition hover:border-[var(--app-border-strong)]"
                      style={{ backgroundColor: "color-mix(in srgb, var(--app-surface-2) 60%, var(--app-surface))" }}
                    >
                      <span className="min-w-[52px] font-mono text-[10px] text-[var(--app-subtle-text)]">
                        {new Date(item.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-[var(--app-text)]">{item.title}</span>
                        <span className="block truncate text-[11px] text-[var(--app-muted)]">
                          {item.description ?? "No description"}
                        </span>
                      </span>

                      <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.06em] ${statusStyles[item.status]}`}>
                        {statusLabels[item.status]}
                      </span>

                      {item.project ? (
                        <span className="rounded-full px-2 py-1 text-[10px] font-medium text-white" style={{ backgroundColor: item.project.color }}>
                          {item.project.name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[var(--app-muted)]">No project</span>
                      )}
                    </button>
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
            <h3 className="text-sm font-semibold text-[var(--app-text)]">Week Snapshot</h3>
          </header>

          <div className="grid grid-cols-2 gap-2 p-3">
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--app-subtle-text)]">All events</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--app-text)]">{totalItems}</p>
            </div>
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--app-subtle-text)]">Today</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--app-text)]">{todayItems}</p>
            </div>
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--app-subtle-text)]">Work</p>
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
              className="flex h-10 w-full items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-border-strong)]"
            >
              <span>+ New event</span>
              <span className="font-mono text-[10px] text-[var(--app-subtle-text)]">N</span>
            </button>

            <button
              type="button"
              onClick={onFocusWork}
              className="flex h-10 w-full items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-border-strong)]"
            >
              <span>Filter: Work only</span>
              <span className="font-mono text-[10px] text-[var(--app-subtle-text)]">F</span>
            </button>

            <button
              type="button"
              onClick={onJumpToday}
              className="flex h-10 w-full items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-border-strong)]"
            >
              <span>Jump to today</span>
              <span className="font-mono text-[10px] text-[var(--app-subtle-text)]">T</span>
            </button>

            <Link
              href="/settings"
              className="flex h-10 w-full items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-border-strong)]"
            >
              <span>Open settings</span>
              <span className="font-mono text-[10px] text-[var(--app-subtle-text)]">,</span>
            </Link>
          </div>
        </article>
      </aside>
    </div>
  );
}
