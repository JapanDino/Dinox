"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, differenceInMinutes } from "date-fns";
import { ru } from "date-fns/locale";
import { fetchItems, fetchProjects, fetchTags } from "@/src/ui/api/client";
import { ApiItem, ApiItemStatus, ApiProject, ApiTag } from "@/src/ui/api/types";
import { applyThemeTokens, applyAccentColor, loadStoredThemeState, resolveTheme } from "@/src/ui/theme/theme-config";
import { loadPrefs } from "@/src/ui/prefs/prefs-config";

// ─── helpers ────────────────────────────────────────────────────────────────

function pct(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function durationMinutes(item: ApiItem): number {
  return differenceInMinutes(parseISO(item.endAt), parseISO(item.startAt));
}

const STATUS_COLORS: Record<ApiItemStatus, string> = {
  TODO: "var(--app-accent)",
  DONE: "#34d399",
  CANCELLED: "var(--app-danger)",
};

const STATUS_LABELS: Record<ApiItemStatus, string> = {
  TODO: "To do",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

// ─── sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--app-text)]">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-[var(--app-subtle-text)]">{sub}</p> : null}
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--app-border)]">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
      />
    </div>
  );
}

// Weekly heatmap — 7 cols × 4 rows (last 4 weeks, Mon–Sun)
function WeeklyHeatmap({ items }: { items: ApiItem[] }) {
  const today = new Date();

  const weeks = useMemo(() => {
    const result: { date: Date; count: number }[][] = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = startOfWeek(new Date(today.getFullYear(), today.getMonth(), today.getDate() - w * 7), { locale: ru });
      const week: { date: Date; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + d);
        const key = format(date, "yyyy-MM-dd");
        const count = items.filter((item) => format(parseISO(item.startAt), "yyyy-MM-dd") === key).length;
        week.push({ date, count });
      }
      result.push(week);
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const maxCount = Math.max(1, ...weeks.flat().map((d) => d.count));
  const dayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1">
        {dayLabels.map((l) => (
          <p key={l} className="text-center text-[9px] uppercase tracking-wide text-[var(--app-muted)]">{l}</p>
        ))}
      </div>
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map(({ date, count }) => {
              const intensity = count === 0 ? 0 : 0.15 + (count / maxCount) * 0.85;
              const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
              return (
                <div
                  key={date.toISOString()}
                  title={`${format(date, "d MMM", { locale: ru })}: ${count} событий`}
                  className={`aspect-square rounded-md ${isToday ? "ring-1 ring-[var(--app-accent)]" : ""}`}
                  style={{
                    backgroundColor: count === 0
                      ? "var(--app-border)"
                      : `color-mix(in srgb, var(--app-accent) ${Math.round(intensity * 100)}%, var(--app-border))`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export function DashboardShell() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [tags, setTags] = useState<ApiTag[]>([]);
  const [items, setItems] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t, i] = await Promise.all([fetchProjects(), fetchTags(), fetchItems()]);
      setProjects(p);
      setTags(t);
      setItems(i);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const stored = loadStoredThemeState();
    applyThemeTokens(resolveTheme(stored.mode, stored.customTheme));
    const { accentColor } = loadPrefs();
    applyAccentColor(accentColor);
  }, []);

  const now = new Date();
  const weekInterval = { start: startOfWeek(now, { locale: ru }), end: endOfWeek(now, { locale: ru }) };
  const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) };
  const todayKey = format(now, "yyyy-MM-dd");

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.status === "DONE").length;
    const todo = items.filter((i) => i.status === "TODO").length;
    const cancelled = items.filter((i) => i.status === "CANCELLED").length;
    const today = items.filter((i) => format(parseISO(i.startAt), "yyyy-MM-dd") === todayKey).length;
    const thisWeek = items.filter((i) => isWithinInterval(parseISO(i.startAt), weekInterval)).length;
    const thisMonth = items.filter((i) => isWithinInterval(parseISO(i.startAt), monthInterval)).length;
    const totalMinutes = items.reduce((acc, i) => acc + durationMinutes(i), 0);
    const avgDuration = total === 0 ? 0 : Math.round(totalMinutes / total);

    return { total, done, todo, cancelled, today, thisWeek, thisMonth, avgDuration };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, todayKey]);

  const projectStats = useMemo(() => {
    return projects
      .filter((p) => !p.archived)
      .map((project) => {
        const projectItems = items.filter((i) => i.projectId === project.id);
        const done = projectItems.filter((i) => i.status === "DONE").length;
        const total = projectItems.length;
        return { project, total, done, completion: pct(done, total) };
      })
      .sort((a, b) => b.total - a.total);
  }, [projects, items]);

  const tagStats = useMemo(() => {
    return tags
      .map((tag) => {
        const count = items.filter((i) => i.tags.some((t) => t.id === tag.id)).length;
        return { tag, count };
      })
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [tags, items]);

  const recentItems = useMemo(() => {
    return [...items]
      .sort((a, b) => parseISO(b.updatedAt).getTime() - parseISO(a.updatedAt).getTime())
      .slice(0, 8);
  }, [items]);

  const statusBreakdown = useMemo(() => {
    const total = items.length;
    return (["TODO", "DONE", "CANCELLED"] as ApiItemStatus[]).map((s) => {
      const count = items.filter((i) => i.status === s).length;
      return { status: s, count, pct: pct(count, total) };
    });
  }, [items]);

  return (
    <main className="mx-auto min-h-screen max-w-[1400px] p-3 text-[var(--app-text)] md:p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-4 shadow-[0_26px_80px_rgba(3,7,18,0.22)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--app-muted)]">Dinox</p>
          <h1 className="text-2xl font-semibold text-[var(--app-text)]">Dashboard</h1>
          <p className="text-sm text-[var(--app-muted)]">
            {format(now, "EEEE, d MMMM yyyy", { locale: ru })}
          </p>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-xl border border-[var(--app-border-strong)] px-3 py-2 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
          >
            Calendar
          </Link>
          <Link
            href="/settings"
            className="rounded-xl border border-[var(--app-border-strong)] px-3 py-2 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
          >
            Settings
          </Link>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <p className="text-sm text-[var(--app-muted)]">Loading data...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {/* Top stats row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <StatCard label="Total events" value={stats.total} />
            <StatCard label="Done" value={stats.done} sub={`${pct(stats.done, stats.total)}% completion`} />
            <StatCard label="To do" value={stats.todo} />
            <StatCard label="Cancelled" value={stats.cancelled} />
            <StatCard label="Today" value={stats.today} />
            <StatCard label="This week" value={stats.thisWeek} />
            <StatCard label="This month" value={stats.thisMonth} />
          </div>

          {/* Middle row */}
          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            {/* Left column */}
            <div className="grid gap-4">
              {/* Status breakdown */}
              <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">Status breakdown</h2>
                <div className="space-y-3">
                  {statusBreakdown.map(({ status, count, pct: p }) => (
                    <div key={status}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                          <span className="text-sm text-[var(--app-text)]">{STATUS_LABELS[status]}</span>
                        </div>
                        <span className="font-mono text-sm text-[var(--app-muted)]">{count} <span className="text-[var(--app-subtle-text)]">({p}%)</span></span>
                      </div>
                      <ProgressBar value={p} color={STATUS_COLORS[status]} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Projects */}
              <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">
                  Projects <span className="ml-1 rounded-full border border-[var(--app-border-strong)] px-1.5 py-0.5 text-[10px] font-mono">{projectStats.length}</span>
                </h2>
                {projectStats.length === 0 ? (
                  <p className="text-sm text-[var(--app-muted)]">No projects yet.</p>
                ) : (
                  <div className="space-y-3">
                    {projectStats.map(({ project, total, done, completion }) => (
                      <div key={project.id}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                            <span className="truncate text-sm text-[var(--app-text)]">{project.name}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-[var(--app-muted)]">
                            <span>{done}/{total}</span>
                            <span className="text-[var(--app-subtle-text)]">{completion}%</span>
                          </div>
                        </div>
                        <ProgressBar value={completion} color={project.color} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="grid gap-4">
              {/* Weekly heatmap */}
              <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">Activity — last 4 weeks</h2>
                <WeeklyHeatmap items={items} />
              </div>

              {/* Tags */}
              <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">Tags</h2>
                {tagStats.length === 0 ? (
                  <p className="text-sm text-[var(--app-muted)]">No tags in use.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tagStats.map(({ tag, count }) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-[var(--app-text)]"
                        style={{
                          borderColor: tag.color,
                          backgroundColor: `color-mix(in srgb, ${tag.color} 18%, transparent)`,
                        }}
                      >
                        #{tag.name}
                        <span className="font-mono text-[10px] text-[var(--app-muted)]">{count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Avg duration */}
              <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">Avg event duration</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--app-text)]">
                  {stats.avgDuration < 60
                    ? `${stats.avgDuration}m`
                    : `${Math.floor(stats.avgDuration / 60)}h ${stats.avgDuration % 60}m`}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--app-subtle-text)]">across all events</p>
              </div>
            </div>
          </div>

          {/* Recent items */}
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">Recently updated</h2>
            {recentItems.length === 0 ? (
              <p className="text-sm text-[var(--app-muted)]">No events yet. <Link href="/" className="text-[var(--app-accent)] hover:underline">Go to calendar →</Link></p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {recentItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[var(--app-border)] p-3"
                    style={{ backgroundColor: "color-mix(in srgb, var(--app-surface-2) 50%, transparent)" }}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium text-[var(--app-text)]">{item.title}</p>
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white"
                        style={{ backgroundColor: STATUS_COLORS[item.status] }}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-[var(--app-subtle-text)]">
                      {format(parseISO(item.startAt), "d MMM, HH:mm", { locale: ru })}
                    </p>
                    {item.project ? (
                      <div className="mt-1.5 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.project.color }} />
                        <span className="text-[10px] text-[var(--app-muted)]">{item.project.name}</span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
