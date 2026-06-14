"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, differenceInMinutes, type Locale } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { fetchItems, fetchProjects, fetchTags } from "@/src/ui/api/client";
import { ApiItem, ApiItemStatus, ApiProject, ApiTag } from "@/src/ui/api/types";
import { applyThemeTokens, applyAccentColor, loadStoredThemeState, resolveTheme } from "@/src/ui/theme/theme-config";
import { loadPrefs } from "@/src/ui/prefs/prefs-config";
import { AppBottomNav } from "@/src/ui/components/app-bottom-nav";

// ─── helpers ─────────────────────────────────────────────────────────────────

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

// ─── sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_76%,var(--app-accent)_6%)] p-3.5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--app-text)_5%,transparent)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--app-text)]">{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] text-[var(--app-subtle-text)]">{sub}</p> : null}
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

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--app-surface-2)_72%,var(--app-border)_28%)] ${className}`}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <header className="rounded-xl border border-[var(--app-border-strong)] bg-[color-mix(in_srgb,var(--app-surface)_88%,var(--app-accent)_8%)] px-4 py-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <SkeletonBlock className="h-2.5 w-20" />
            <SkeletonBlock className="h-6 w-48" />
          </div>
          <SkeletonBlock className="h-8 w-28" />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5">
            <SkeletonBlock className="h-2.5 w-20" />
            <SkeletonBlock className="mt-3 h-8 w-14" />
            <SkeletonBlock className="mt-2 h-2.5 w-24" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {Array.from({ length: 2 }, (_, panelIndex) => (
            <div key={panelIndex} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
              <SkeletonBlock className="h-2.5 w-28" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }, (_, rowIndex) => (
                  <div key={rowIndex} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <SkeletonBlock className="h-4 w-36" />
                      <SkeletonBlock className="h-4 w-12" />
                    </div>
                    <SkeletonBlock className="h-1.5 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <SkeletonBlock className="h-2.5 w-36" />
            <div className="mt-4 grid grid-cols-7 gap-1">
              {Array.from({ length: 28 }, (_, index) => (
                <SkeletonBlock key={index} className="aspect-square rounded-md" />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <SkeletonBlock className="h-2.5 w-16" />
            <div className="mt-4 flex flex-wrap gap-1.5">
              {Array.from({ length: 8 }, (_, index) => (
                <SkeletonBlock key={index} className="h-6 w-20 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Weekly heatmap — 7 cols × 4 rows (last 4 weeks, Mon–Sun)
function WeeklyHeatmap({ items, locale }: { items: ApiItem[]; locale: Locale }) {
  const today = new Date();

  const weeks = useMemo(() => {
    const result: { date: Date; count: number }[][] = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = startOfWeek(new Date(today.getFullYear(), today.getMonth(), today.getDate() - w * 7), { weekStartsOn: 1 });
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
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 1 + i); // 2024-01-01 is a Monday
    return format(d, "EEE", { locale });
  });

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
                  title={`${format(date, "d MMM", { locale })}: ${count} events`}
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
  const prefs = useMemo(() => loadPrefs(), []);
  const dateFnsLocale = useMemo(() => {
    const { appLocale } = prefs;
    return appLocale === "ru" ? ru : enUS;
  }, [prefs]);
  const weekStartsOn = prefs.weekStart === "sunday" ? 0 : 1;

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
  const weekInterval = { start: startOfWeek(now, { weekStartsOn }), end: endOfWeek(now, { weekStartsOn }) };
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

  // Completion ring values
  const donePct = pct(stats.done, stats.total);
  const ringRadius = 44;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - donePct / 100);

  return (
    <div className="dinox-shell flex h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)]">
      {/* ── Sidebar ── */}
      <aside className="flex w-[280px] shrink-0 flex-col overflow-y-auto border-r border-[var(--app-border)] bg-[var(--app-surface)] p-3">
        <div className="mb-5 rounded-xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface-2)_56%,transparent)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--app-muted)]">Dinox</p>
          <h1 className="text-lg font-bold text-[var(--app-text)]">Dashboard</h1>
          <p className="mt-0.5 text-[11px] text-[var(--app-muted)]">
            {format(now, "d MMM yyyy", { locale: dateFnsLocale })}
          </p>
        </div>

        <div className="mb-5 flex flex-col items-center rounded-xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface-2)_78%,var(--app-accent)_7%)] px-3 py-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--app-text)_5%,transparent)]">
          <svg width="108" height="108" viewBox="0 0 108 108">
            <circle
              cx="54" cy="54" r={ringRadius}
              fill="none"
              stroke="var(--app-border)"
              strokeWidth="8"
            />
            <circle
              cx="54" cy="54" r={ringRadius}
              fill="none"
              stroke="var(--app-accent)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              transform="rotate(-90 54 54)"
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
            <text x="54" y="50" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--app-text)">{donePct}%</text>
            <text x="54" y="65" textAnchor="middle" fontSize="9" fill="var(--app-muted)">done</text>
          </svg>
          <p className="mt-1 text-[11px] text-[var(--app-muted)]">{stats.done} of {stats.total} events</p>
        </div>

        <div className="mb-5 space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-bg)_24%,transparent)] px-3 py-2">
            <span className="text-[11px] text-[var(--app-muted)]">Today</span>
            <span className="font-mono text-sm font-semibold text-[var(--app-text)]">{stats.today}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-bg)_24%,transparent)] px-3 py-2">
            <span className="text-[11px] text-[var(--app-muted)]">This week</span>
            <span className="font-mono text-sm font-semibold text-[var(--app-text)]">{stats.thisWeek}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-bg)_24%,transparent)] px-3 py-2">
            <span className="text-[11px] text-[var(--app-muted)]">This month</span>
            <span className="font-mono text-sm font-semibold text-[var(--app-text)]">{stats.thisMonth}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-bg)_24%,transparent)] px-3 py-2">
            <span className="text-[11px] text-[var(--app-muted)]">Avg duration</span>
            <span className="font-mono text-sm font-semibold text-[var(--app-text)]">
              {stats.avgDuration < 60
                ? `${stats.avgDuration}m`
                : `${Math.floor(stats.avgDuration / 60)}h ${stats.avgDuration % 60}m`}
            </span>
          </div>
        </div>

        <AppBottomNav />
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="space-y-4">
            <header className="rounded-xl border border-[var(--app-border-strong)] bg-[color-mix(in_srgb,var(--app-surface)_88%,var(--app-accent)_12%)] px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--app-muted)]">Overview</p>
                  <h2 className="mt-1 text-xl font-semibold text-[var(--app-text)]">Workload snapshot</h2>
                </div>
                <Link
                  href="/"
                  className="inline-flex h-8 items-center rounded-lg border border-[var(--app-border-strong)] px-3 text-xs font-semibold text-[var(--app-muted)] transition hover:border-[var(--app-accent)] hover:text-[var(--app-text)]"
                >
                  Open calendar
                </Link>
              </div>
            </header>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Total events" value={stats.total} />
              <StatCard label="Done" value={stats.done} sub={`${donePct}% completion`} />
              <StatCard label="To do" value={stats.todo} />
              <StatCard label="Cancelled" value={stats.cancelled} />
            </div>

            {/* Middle: status + projects | heatmap + tags */}
            <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
              {/* Left */}
              <div className="space-y-4">
                {/* Status breakdown */}
                <div className="rounded-xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_88%,transparent)] p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--app-text)_4%,transparent)]">
                  <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">Status breakdown</h2>
                  <div className="space-y-3">
                    {statusBreakdown.map(({ status, count, pct: p }) => (
                      <div key={status}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                            <span className="text-sm text-[var(--app-text)]">{STATUS_LABELS[status]}</span>
                          </div>
                          <span className="font-mono text-sm text-[var(--app-muted)]">
                            {count} <span className="text-[var(--app-subtle-text)]">({p}%)</span>
                          </span>
                        </div>
                        <ProgressBar value={p} color={STATUS_COLORS[status]} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Projects */}
                <div className="rounded-xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_88%,transparent)] p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--app-text)_4%,transparent)]">
                  <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">
                    Projects{" "}
                    <span className="ml-1 rounded-full border border-[var(--app-border-strong)] px-1.5 py-0.5 font-mono text-[10px]">
                      {projectStats.length}
                    </span>
                  </h2>
                  {projectStats.length === 0 ? (
                    <p className="text-sm text-[var(--app-muted)]">No projects yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {projectStats.map(({ project, total, done, completion }) => (
                        <div key={project.id}>
                          <div className="mb-1.5 flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              {project.emoji ? (
                                <span className="text-sm leading-none">{project.emoji}</span>
                              ) : (
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                              )}
                              <Link
                                href={`/projects/${project.id}`}
                                className="truncate text-sm text-[var(--app-text)] hover:text-[var(--app-accent)] hover:underline"
                              >
                                {project.name}
                              </Link>
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

              {/* Right */}
              <div className="space-y-4">
                {/* Weekly heatmap */}
                <div className="rounded-xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_88%,transparent)] p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--app-text)_4%,transparent)]">
                  <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">Activity - last 4 weeks</h2>
                  <WeeklyHeatmap items={items} locale={dateFnsLocale} />
                </div>

                {/* Tags */}
                <div className="rounded-xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_88%,transparent)] p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--app-text)_4%,transparent)]">
                  <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">Tags</h2>
                  {tagStats.length === 0 ? (
                    <p className="text-sm text-[var(--app-muted)]">No tags in use.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {tagStats.map(({ tag, count }) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-[var(--app-text)]"
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
              </div>
            </div>

            {/* Recent items */}
            <div className="rounded-xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_88%,transparent)] p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--app-text)_4%,transparent)]">
              <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">Recently updated</h2>
              {recentItems.length === 0 ? (
                <p className="text-sm text-[var(--app-muted)]">
                  No events yet.{" "}
                  <Link href="/" className="text-[var(--app-accent)] hover:underline">
                    Go to calendar
                  </Link>
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {recentItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-[var(--app-border)] p-3"
                      style={{ backgroundColor: "color-mix(in srgb, var(--app-surface-2) 50%, transparent)" }}
                    >
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-medium text-[var(--app-text)]">{item.title}</p>
                        <span
                          className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white"
                          style={{ backgroundColor: STATUS_COLORS[item.status] }}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-[var(--app-subtle-text)]">
                        {format(parseISO(item.startAt), "d MMM, HH:mm", { locale: dateFnsLocale })}
                      </p>
                      {item.project ? (
                        <div className="mt-1.5 flex items-center gap-1">
                          {item.project.emoji ? <span className="text-[10px] leading-none">{item.project.emoji}</span> : null}
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
    </div>
  );
}
