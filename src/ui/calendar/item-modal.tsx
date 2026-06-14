"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiItem,
  ApiItemKind,
  ApiItemMutationInput,
  ApiItemStatus,
  ApiProject,
  ApiTag,
} from "@/src/ui/api/types";
import { defaultEndFromStart, toDateTimeLocalValue } from "./date-utils";
import { parseRule, serializeRule, ruleLabel, type ParsedRule, type RDay } from "./recurrence-utils";

interface ItemModalProps {
  open: boolean;
  mode: "create" | "edit";
  item: ApiItem | null;
  projects: ApiProject[];
  tags: ApiTag[];
  initialStart: Date;
  initialEnd: Date;
  defaultKind?: ApiItemKind;
  defaultProjectId?: string;
  timeFormat?: "24h" | "12h";
  onClose: () => void;
  onSubmit: (input: ApiItemMutationInput) => Promise<void>;
  onDelete: (id: string, scope?: "this" | "following" | "all") => Promise<void>;
}

const kindOptions: ApiItemKind[] = ["TASK", "EVENT"];

const COLOR_PRESETS = [
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#ef4444",
  "#64748b",
  "#f1f5f9",
];

const kindLabels: Record<ApiItemKind, string> = {
  TASK: "Task",
  EVENT: "Event",
};

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const total = index * 15;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const hour12 = hours % 12 || 12;
  const suffix = hours < 12 ? "AM" : "PM";
  return {
    value,
    label24: value,
    label12: `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`,
  };
});

function TimeSelect({
  value,
  onChange,
  timeFormat,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  timeFormat: "24h" | "12h";
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-1 py-1.5 text-center text-xs text-[var(--app-text)] ${className}`}
    >
      {TIME_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {timeFormat === "12h" ? option.label12 : option.label24}
        </option>
      ))}
    </select>
  );
}

// Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ Searchable Project Picker Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ

function ProjectPicker({
  projects,
  value,
  onChange,
}: {
  projects: ApiProject[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = projects.find((p) => p.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.emoji && p.emoji.includes(q))
    );
  }, [projects, query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); setQuery(""); }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function select(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setQuery("");
        }}
        className="flex h-11 w-full items-center gap-2 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 text-left text-sm text-[var(--app-text)]"
      >
        {selected ? (
          <>
            <span className="text-base leading-none">{selected.emoji ?? ""}</span>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: selected.color }}
            />
            <span className="flex-1 truncate">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-[var(--app-muted)]">No project</span>
        )}
        <span className="text-[var(--app-muted)]">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] shadow-xl">
          <div className="border-b border-[var(--app-border)] px-3 py-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => select("")}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition hover:bg-[var(--app-surface-2)] ${
                value === "" ? "text-[var(--app-accent)]" : "text-[var(--app-muted)]"
              }`}
            >
              No project
            </button>
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => select(p.id)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition hover:bg-[var(--app-surface-2)] ${
                  value === p.id ? "text-[var(--app-accent)]" : "text-[var(--app-text)]"
                }`}
              >
                <span className="w-5 text-center text-base leading-none">{p.emoji ?? ""}</span>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span className="truncate">{p.name}</span>
                {value === p.id && <span className="ml-auto text-[var(--app-accent)]">✓</span>}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-xs text-[var(--app-muted)]">No projects found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ Searchable Tag Picker Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ

function TagPicker({
  tags,
  selectedIds,
  onChange,
}: {
  tags: ApiTag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, query]);

  const selectedTags = tags.filter((t) => selectedIds.includes(t.id));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); setQuery(""); }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Selected chips + search trigger */}
      <div
        className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 py-2 cursor-text"
        onClick={() => setOpen(true)}
      >
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs text-white"
            style={{ backgroundColor: tag.color }}
          >
            #{tag.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle(tag.id);
              }}
              className="ml-0.5 opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={selectedTags.length === 0 ? "Search tags..." : ""}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] shadow-xl">
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((tag) => {
              const selected = selectedIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggle(tag.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm transition hover:bg-[var(--app-surface-2)]"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className={selected ? "text-[var(--app-text)]" : "text-[var(--app-muted)]"}>
                    #{tag.name}
                  </span>
                  {selected && <span className="ml-auto text-[var(--app-accent)]">✓</span>}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-xs text-[var(--app-muted)]">No tags found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ Main Modal Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљ

// ── Recurrence Picker ──────────────────────────────────────────────────────────

const FREQ_OPTIONS = [
  { label: "Does not repeat", value: "" },
  { label: "Every day", value: "FREQ=DAILY;INTERVAL=1;COUNT=365" },
  { label: "Every week", value: "FREQ=WEEKLY;INTERVAL=1;COUNT=52" },
  { label: "Every 2 weeks", value: "FREQ=WEEKLY;INTERVAL=2;COUNT=26" },
  { label: "Every month", value: "FREQ=MONTHLY;INTERVAL=1;COUNT=12" },
  { label: "Every year", value: "FREQ=YEARLY;INTERVAL=1;COUNT=5" },
  { label: "Custom\u2026", value: "__custom__" },
];

const DAY_OPTIONS: { label: string; value: RDay }[] = [
  { label: "Mo", value: "MO" },
  { label: "Tu", value: "TU" },
  { label: "We", value: "WE" },
  { label: "Th", value: "TH" },
  { label: "Fr", value: "FR" },
  { label: "Sa", value: "SA" },
  { label: "Su", value: "SU" },
];

const DATE_TO_RDAY: RDay[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function dayFromDate(date: Date): RDay {
  return DATE_TO_RDAY[date.getDay()] ?? "MO";
}

function ruleWithAnchorDay(raw: string, anchorDate: Date): string {
  const parsed = parseRule(raw);
  if (!parsed || parsed.freq !== "WEEKLY" || parsed.byDay.length > 0) {
    return raw;
  }

  return serializeRule({ ...parsed, byDay: [dayFromDate(anchorDate)] });
}

function isoDateValue(date: Date) {
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

// Sensible default for the "Ends on date" field: one month after the start,
// rather than the start day itself (which would yield ~one occurrence).
function defaultUntilValue(date: Date) {
  const base = Number.isNaN(date.getTime()) ? new Date() : new Date(date);
  base.setMonth(base.getMonth() + 1);
  return base.toISOString().slice(0, 10);
}

function RecurrencePicker({
  value,
  anchorDate,
  onChange,
}: {
  value: string;
  anchorDate: Date;
  onChange: (v: string) => void;
}) {
  const parsed = parseRule(value);
  const [freq, setFreq] = useState<string>(
    value === "" ? "" : (parsed ? `FREQ=${parsed.freq};INTERVAL=${parsed.interval};COUNT=${parsed.count ?? 52}` : value)
  );
  const [byDay, setByDay] = useState<RDay[]>(
    parsed?.byDay && parsed.byDay.length > 0 ? parsed.byDay : parsed?.freq === "WEEKLY" ? [dayFromDate(anchorDate)] : []
  );
  const [interval, setCustomInterval] = useState(parsed?.interval ?? 1);
  const [customFreq, setCustomFreq] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY">(parsed?.freq ?? "WEEKLY");
  const [count, setCount] = useState(parsed?.count ?? 52);
  const [until, setUntil] = useState(parsed?.until ? `${parsed.until.slice(0, 4)}-${parsed.until.slice(4, 6)}-${parsed.until.slice(6, 8)}` : defaultUntilValue(anchorDate));
  const [endMode, setEndMode] = useState<"count" | "until" | "forever">(parsed?.until ? "until" : parsed && !parsed.count ? "forever" : "count");
  const [monthDay, setMonthDay] = useState(parsed?.byMonthDay ?? anchorDate.getDate());
  const [isCustom, setIsCustom] = useState(Boolean(parsed && (parsed.byMonthDay || parsed.until || !parsed.count)));

  function build(): string {
    if (!freq && !isCustom) return "";
    const f = isCustom ? customFreq : (parseRule(freq)?.freq ?? "WEEKLY");
    const iv = isCustom ? interval : (parseRule(freq)?.interval ?? 1);
    const presetCount = parseRule(freq)?.count ?? 52;
    const days = (f === "WEEKLY" && byDay.length > 0) ? byDay : [];
    const r: ParsedRule = {
      freq: f,
      interval: iv,
      byDay: days,
      byMonthDay: f === "MONTHLY" || f === "YEARLY" ? monthDay : undefined,
      count: endMode === "count" ? (isCustom ? count : presetCount) : undefined,
      until: endMode === "until" ? until : undefined,
    };
    return serializeRule(r);
  }

  return (
    <div className="mt-1.5 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] p-3 shadow-xl">
      <div className="mb-2 flex flex-col gap-1">
        {FREQ_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (opt.value === "__custom__") {
                setIsCustom(true);
                setFreq("");
                setByDay((current) => current.length > 0 ? current : [dayFromDate(anchorDate)]);
              } else if (opt.value === "") {
                onChange("");
              } else {
                setIsCustom(false);
                setFreq(opt.value);
                const parsedPreset = parseRule(ruleWithAnchorDay(opt.value, anchorDate));
                if (parsedPreset) {
                  onChange(serializeRule({
                    ...parsedPreset,
                    count: endMode === "count" ? parsedPreset.count : undefined,
                    until: endMode === "until" ? until : undefined,
                  }));
                }
              }
            }}
            className={`rounded-lg px-3 py-2 text-left text-sm transition ${
              (!isCustom && freq === opt.value && opt.value !== "__custom__") ||
              (isCustom && opt.value === "__custom__")
                ? "bg-[var(--app-accent)] text-[var(--app-bg)] font-medium"
                : "text-[var(--app-text)] hover:bg-[var(--app-surface-2)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Day picker for weekly — gate on the effective frequency so it hides
          for daily/monthly/yearly custom rules (freq state can hold a stale
          FREQ=WEEKLY string after switching the custom unit). */}
      {((!isCustom && freq.startsWith("FREQ=WEEKLY")) || (isCustom && customFreq === "WEEKLY")) && (
        <div className="mb-2 flex gap-1">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() =>
                setByDay((prev) =>
                  prev.includes(d.value) ? prev.filter((x) => x !== d.value) : [...prev, d.value]
                )
              }
              className={`flex-1 rounded-md py-1 text-[11px] font-medium transition ${
                byDay.includes(d.value)
                  ? "bg-[var(--app-accent)] text-[var(--app-bg)]"
                  : "bg-[var(--app-surface-2)] text-[var(--app-muted)] hover:text-[var(--app-text)]"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {/* Custom controls */}
      {isCustom && (
        <div className="mb-2 grid gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--app-muted)]">Every</span>
            <input
              type="number"
              min={1}
              max={99}
              value={interval}
              onChange={(e) => setCustomInterval(Number(e.target.value))}
              className="w-14 rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-2 py-1 text-center text-sm text-[var(--app-text)]"
            />
            <select
              value={customFreq}
              onChange={(e) => {
                const nextFreq = e.target.value as typeof customFreq;
                setCustomFreq(nextFreq);
                if (nextFreq === "WEEKLY") setByDay((current) => current.length > 0 ? current : [dayFromDate(anchorDate)]);
              }}
              className="flex-1 rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-2 py-1 text-sm text-[var(--app-text)]"
            >
              <option value="DAILY">days</option>
              <option value="WEEKLY">weeks</option>
              <option value="MONTHLY">months</option>
              <option value="YEARLY">years</option>
            </select>
          </div>
          {(customFreq === "MONTHLY" || customFreq === "YEARLY") && (
            <label className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
              Day
              <input
                type="number"
                min={1}
                max={31}
                value={monthDay}
                onChange={(event) => setMonthDay(Number(event.target.value))}
                className="w-16 rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-2 py-1 text-center text-sm text-[var(--app-text)]"
              />
              <span>of the month</span>
            </label>
          )}
        </div>
      )}

      {(freq !== "" || isCustom) && (
        <div className="mb-3 grid gap-2 rounded-lg border border-[var(--app-border)] p-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">Ends</p>
          <div className="grid grid-cols-3 gap-1">
            {(["count", "until", "forever"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setEndMode(mode)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                  endMode === mode
                    ? "bg-[var(--app-accent)] text-[var(--app-bg)]"
                    : "bg-[var(--app-surface-2)] text-[var(--app-muted)] hover:text-[var(--app-text)]"
                }`}
              >
                {mode === "count" ? "After" : mode === "until" ? "On date" : "Never"}
              </button>
            ))}
          </div>
          {endMode === "count" ? (
            <label className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
              Occurrences
              <input
                type="number"
                min={1}
                max={730}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-20 rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-2 py-1 text-center text-sm text-[var(--app-text)]"
              />
            </label>
          ) : null}
          {endMode === "until" ? (
            <label className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
              Until
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{4}-\d{2}-\d{2}"
                placeholder="YYYY-MM-DD"
                value={until}
                onChange={(event) => setUntil(event.target.value)}
                className="w-32 rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-2 py-1 text-center text-sm text-[var(--app-text)]"
              />
            </label>
          ) : null}
          {endMode === "forever" ? (
            <p className="text-[11px] text-[var(--app-muted)]">Generated with a safety cap of 730 occurrences.</p>
          ) : null}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(build())}
          className="flex-1 rounded-lg bg-[var(--app-accent)] py-1.5 text-sm font-semibold text-[var(--app-bg)]"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded-lg border border-[var(--app-border-strong)] px-3 py-1.5 text-sm text-[var(--app-muted)] hover:text-[var(--app-text)]"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ── Links Panel ────────────────────────────────────────────────────────────────

const VIDEO_HOSTS = ["zoom.us", "meet.google.com", "teams.microsoft.com", "teams.live.com", "webex.com", "whereby.com", "gotomeeting.com", "bluejeans.com"];

function linkIcon(url: string): string {
  try {
    const host = new URL(url).hostname.replace("www.", "");
    if (VIDEO_HOSTS.some((h) => host === h || host.endsWith("." + h))) return "🎥";
    if (host.includes("github") || host.includes("gitlab")) return "💻";
    if (host.includes("docs.google") || host.includes("notion") || host.includes("confluence")) return "📄";
    if (host.includes("figma")) return "🎨";
    if (host.includes("slack") || host.includes("discord")) return "💬";
  } catch { /* invalid url */ }
  return "🔗";
}

function LinksPanel({
  links,
  onChange,
}: {
  links: Array<{ url: string; title?: string }>;
  onChange: (links: Array<{ url: string; title?: string }>) => void;
}) {
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");

  function add() {
    const url = newUrl.trim();
    if (!url) return;
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    onChange([...links, { url: normalized, title: newTitle.trim() || undefined }]);
    setNewUrl("");
    setNewTitle("");
  }

  function remove(i: number) {
    onChange(links.filter((_, idx) => idx !== i));
  }

  return (
    <div className="grid gap-1.5 text-sm">
      <span className="text-[var(--app-muted)]">Links & meeting URLs</span>
      {links.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {links.map((link, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 py-2">
              <span className="text-base leading-none">{linkIcon(link.url)}</span>
              <div className="flex-1 min-w-0">
                {link.title && <p className="truncate text-xs font-medium text-[var(--app-text)]">{link.title}</p>}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-xs text-[var(--app-accent)] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {link.url}
                </a>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="shrink-0 text-[var(--app-muted)] hover:text-[var(--app-danger)] transition text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="url"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="https://meet.google.com/..."
          className="h-9 flex-1 min-w-0 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 text-xs text-[var(--app-text)] placeholder:text-[var(--app-muted)]"
        />
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Label (optional)"
          className="h-9 w-28 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 text-xs text-[var(--app-text)] placeholder:text-[var(--app-muted)]"
        />
        <button
          type="button"
          onClick={add}
          disabled={!newUrl.trim()}
          className="h-9 rounded-xl border border-[var(--app-border-strong)] px-3 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)] disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────

export function ItemModal({
  open,
  mode,
  item,
  projects,
  tags,
  initialStart,
  initialEnd,
  defaultKind,
  defaultProjectId,
  timeFormat = "24h",
  onClose,
  onSubmit,
  onDelete,
}: ItemModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState(toDateTimeLocalValue(initialStart));
  const [endAt, setEndAt] = useState(toDateTimeLocalValue(initialEnd));
  const [allDay, setAllDay] = useState(false);
  const [kind, setKind] = useState<ApiItemKind>("EVENT");
  const [status, setStatus] = useState<ApiItemStatus>("TODO");
  const [projectId, setProjectId] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [links, setLinks] = useState<Array<{ url: string; title?: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<string>("");
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);
  const [editScope, setEditScope] = useState<"this" | "following" | "all">("this");
  const [showMore, setShowMore] = useState(false);
  const [initialSignature, setInitialSignature] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const modalTitle = useMemo(() => (mode === "create" ? "Create" : "Save"), [mode]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && item) {
      setTitle(item.title);
      setDescription(item.description ?? "");
      setStartAt(toDateTimeLocalValue(new Date(item.startAt)));
      setEndAt(toDateTimeLocalValue(new Date(item.endAt)));
      setAllDay(item.allDay);
      setKind(item.kind);
      setStatus(item.kind === "EVENT" && item.status === "DONE" ? "TODO" : item.status);
      setProjectId(item.projectId ?? "");
      setColor(item.color ?? null);
      setSelectedTagIds(item.tags.map((tag) => tag.id));
      setLinks(item.links ?? []);
      setRecurrenceRule(item.recurrenceRule ?? "");
      setEditScope("this");
      setShowMore(Boolean(item.description || item.recurrenceRule || item.links?.length || item.color));
      setError("");
      setInitialSignature(JSON.stringify({
        title: item.title,
        description: item.description ?? "",
        startAt: toDateTimeLocalValue(new Date(item.startAt)),
        endAt: toDateTimeLocalValue(new Date(item.endAt)),
        allDay: item.allDay,
        kind: item.kind,
        status: item.kind === "EVENT" && item.status === "DONE" ? "TODO" : item.status,
        projectId: item.projectId ?? "",
        color: item.color ?? null,
        selectedTagIds: item.tags.map((tag) => tag.id),
        links: item.links ?? [],
        recurrenceRule: item.recurrenceRule ?? "",
      }));
      return;
    }

    setTitle("");
    setDescription("");
    setStartAt(toDateTimeLocalValue(initialStart));
    setEndAt(toDateTimeLocalValue(initialEnd));
    setAllDay(false);
    setKind(defaultKind ?? "EVENT");
    setStatus("TODO");
    setProjectId(defaultProjectId ?? "");
    setColor(null);
    setSelectedTagIds([]);
    setLinks([]);
    setRecurrenceRule("");
    setEditScope("this");
    setShowMore(false);
    setError("");
    setInitialSignature(JSON.stringify({
      title: "",
      description: "",
      startAt: toDateTimeLocalValue(initialStart),
      endAt: toDateTimeLocalValue(initialEnd),
      allDay: false,
      kind: defaultKind ?? "EVENT",
      status: "TODO",
      projectId: defaultProjectId ?? "",
      color: null,
      selectedTagIds: [],
      links: [],
      recurrenceRule: "",
    }));
  }, [open, mode, item, initialStart, initialEnd, defaultKind, defaultProjectId]);

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      setShowRecurrencePicker(false);
      setConfirmDiscard(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function handleKindChange(nextKind: ApiItemKind) {
    setKind(nextKind);
    if (nextKind === "EVENT" && status === "DONE") {
      setStatus("TODO");
    }
  }

  const currentSignature = JSON.stringify({
    title,
    description,
    startAt,
    endAt,
    allDay,
    kind,
    status,
    projectId,
    color,
    selectedTagIds,
    links,
    recurrenceRule,
  });
  const isDirty = initialSignature.length > 0 && currentSignature !== initialSignature;

  function requestClose() {
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const cleanTitle = title.trim();
      if (!cleanTitle) {
        throw new Error("Title is required.");
      }

      const start = new Date(startAt);
      const end = kind === "TASK" ? defaultEndFromStart(start, 1) : new Date(endAt);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error("Enter a valid date and time.");
      }

      if (kind === "EVENT" && end.getTime() <= start.getTime()) {
        throw new Error("End date should be greater than start date.");
      }

      await onSubmit({
        title: cleanTitle,
        description: description.trim().length > 0 ? description.trim() : null,
        color,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        allDay,
        kind,
        status: kind === "EVENT" && status === "DONE" ? "TODO" : status,
        projectId: projectId.length > 0 ? projectId : null,
        tagIds: selectedTagIds,
        links: links.filter((l) => l.url.trim()).length > 0 ? links.filter((l) => l.url.trim()) : null,
        recurrenceRule: recurrenceRule || null,
        editScope,
        seriesAnchorId: item?.id,
        seriesEditFrom: item?.startAt,
      });

      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save item.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!item) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await onDelete(item.id, item.seriesId ? editScope : undefined);
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete item.");
    } finally {
      setBusy(false);
    }
  }

  function handleStartChange(nextStart: string) {
    setStartAt(nextStart);

    const parsedStart = new Date(nextStart);
    const parsedEnd = new Date(endAt);

    if (parsedEnd.getTime() <= parsedStart.getTime()) {
      setEndAt(toDateTimeLocalValue(defaultEndFromStart(parsedStart)));
    }
  }

  function handleProjectChange(nextProjectId: string) {
    setProjectId(nextProjectId);

    if (color === null) {
      const project = projects.find((p) => p.id === nextProjectId);
      if (project) {
        setColor(project.color);
      }
    }
  }

  const selectedProject = projects.find((project) => project.id === projectId) ?? null;
  const visibleColor = color ?? selectedProject?.color ?? "#64748b";
  const selectedTagCount = selectedTagIds.length;
  const hasDetails = Boolean(description.trim() || recurrenceRule || links.length || color || selectedTagCount > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 backdrop-blur-sm"
      style={{ backgroundColor: "color-mix(in srgb, var(--app-bg) 82%, transparent)" }}
    >
      <form
        onSubmit={handleSubmit}
        className="relative my-auto w-full max-w-[640px] overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_32px_80px_rgba(3,7,18,0.5)]"
      >
        {/* Discard confirmation — in-app styled, replaces native confirm() */}
        {confirmDiscard && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--app-bg)_70%,transparent)] p-4 backdrop-blur-sm">
            <div className="w-full max-w-xs rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] p-4 shadow-xl">
              <p className="text-sm font-semibold text-[var(--app-text)]">Discard unsaved changes?</p>
              <p className="mt-1 text-xs text-[var(--app-muted)]">Your edits will be lost.</p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDiscard(false)}
                  className="rounded-lg border border-[var(--app-border-strong)] px-3 py-1.5 text-xs text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirmDiscard(false); onClose(); }}
                  className="rounded-lg bg-[var(--app-danger)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-80"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_86%,var(--app-accent)_8%)] px-4 py-3">
          <div className="flex rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface)] p-0.5">
            {kindOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleKindChange(opt)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                  kind === opt
                    ? "bg-[var(--app-accent)] text-[var(--app-bg)]"
                    : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
                }`}
              >
                {kindLabels[opt]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-[var(--app-muted)] sm:inline">{mode === "create" ? "New item" : "Edit item"}</span>
            <button
              type="submit"
              disabled={busy}
              className="h-8 rounded-lg bg-[var(--app-accent)] px-3 text-xs font-semibold text-[var(--app-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Saving..." : modalTitle}
            </button>
            <button
              type="button"
              onClick={requestClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[var(--app-muted)] transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-2)] hover:text-[var(--app-text)]"
              aria-label="Close"
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1l9 9M10 1L1 10"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="space-y-3 px-4 py-4">
          {/* Recurring scope */}
          {mode === "edit" && item?.seriesId && (
            <div className="rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] p-2.5">
              <p className="mb-1.5 text-[11px] font-semibold text-[var(--app-muted)]">Recurring — edit:</p>
              <div className="flex gap-1.5">
                {(["this", "following", "all"] as const).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setEditScope(scope)}
                    className={`flex-1 rounded-lg py-1 text-xs font-medium transition ${
                      editScope === scope
                        ? "bg-[var(--app-accent)] text-[var(--app-bg)]"
                        : "border border-[var(--app-border-strong)] text-[var(--app-muted)] hover:text-[var(--app-text)]"
                    }`}
                  >
                    {scope === "this" ? "This event" : scope === "following" ? "This and following" : "All events"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full rounded-xl border bg-[color-mix(in_srgb,var(--app-surface-2)_72%,transparent)] px-3 py-3 text-lg font-semibold text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--app-accent)] ${
              error === "Title is required." ? "border-[var(--app-danger)]" : "border-[var(--app-border-strong)]"
            }`}
            placeholder={kind === "TASK" ? "What needs to be done?" : "What's the event?"}
          />
          {error === "Title is required." ? (
            <p className="text-xs text-[var(--app-danger)]">Title is required.</p>
          ) : null}

          {/* Start + End */}
          <div className={`grid gap-2 rounded-xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface-2)_46%,transparent)] p-3 ${kind === "TASK" ? "md:grid-cols-[1fr_auto]" : "md:grid-cols-[1fr_1fr_auto]"}`}>
            <div className="space-y-1">
              <p className="text-[11px] text-[var(--app-muted)]">{kind === "TASK" ? "Due" : "Start"}</p>
              <div className="flex gap-1">
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}-\d{2}-\d{2}"
                  placeholder="YYYY-MM-DD"
                  value={startAt.slice(0, 10)}
                  onChange={(e) => handleStartChange(e.target.value + "T" + (startAt.slice(11, 16) || "00:00"))}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-2 py-1.5 text-xs text-[var(--app-text)]"
                />
                {!allDay && (
                  <TimeSelect
                    value={startAt.slice(11, 16)}
                    onChange={(value) => handleStartChange((startAt.slice(0, 10) || new Date().toISOString().slice(0, 10)) + "T" + value)}
                    timeFormat={timeFormat}
                    className="w-[88px]"
                  />
                )}
              </div>
            </div>
            {kind === "EVENT" ? (
            <div className="space-y-1">
              <p className="text-[11px] text-[var(--app-muted)]">End</p>
              <div className="flex gap-1">
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}-\d{2}-\d{2}"
                  placeholder="YYYY-MM-DD"
                  value={endAt.slice(0, 10)}
                  onChange={(e) => setEndAt(e.target.value + "T" + (endAt.slice(11, 16) || "00:00"))}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-2 py-1.5 text-xs text-[var(--app-text)]"
                />
                {!allDay && (
                  <TimeSelect
                    value={endAt.slice(11, 16)}
                    onChange={(value) => setEndAt((endAt.slice(0, 10) || new Date().toISOString().slice(0, 10)) + "T" + value)}
                    timeFormat={timeFormat}
                    className="w-[88px]"
                  />
                )}
              </div>
            </div>
            ) : null}
          </div>

          {/* All day */}
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-[var(--app-border-strong)] px-3 py-2 text-xs text-[var(--app-muted)]">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            All day
          </label>

          {(() => {
            const s = new Date(startAt), e = new Date(endAt);
            return kind === "EVENT" && !isNaN(s.getTime()) && !isNaN(e.getTime()) && e <= s ? (
              <p className="text-xs text-[var(--app-danger)]">End must be after start.</p>
            ) : null;
          })()}

          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <p className="mb-1 text-xs text-[var(--app-muted)]">Project</p>
              <ProjectPicker projects={projects} value={projectId} onChange={handleProjectChange} />
            </div>
            <div>
              <p className="mb-1 text-xs text-[var(--app-muted)]">Tags</p>
              <TagPicker tags={tags} selectedIds={selectedTagIds} onChange={setSelectedTagIds} />
            </div>
            {kind === "TASK" ? (
              <div>
                <p className="mb-1 text-xs text-[var(--app-muted)]">Status</p>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ApiItemStatus)}
                  className="h-11 w-full rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 text-sm text-[var(--app-text)] md:w-32"
                >
                  <option value="TODO">To do</option>
                  <option value="DONE">Done</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--app-muted)]">
            <span className="rounded-full border border-[var(--app-border-strong)] px-2 py-1" style={{ borderColor: visibleColor }}>
              {selectedProject ? selectedProject.name : "No project"}
            </span>
            {selectedTagCount > 0 ? (
              <span className="rounded-full border border-[var(--app-border-strong)] px-2 py-1">{selectedTagCount} tag{selectedTagCount === 1 ? "" : "s"}</span>
            ) : null}
            {recurrenceRule ? <span className="rounded-full border border-[var(--app-border-strong)] px-2 py-1">{ruleLabel(recurrenceRule)}</span> : null}
          </div>

          {/* Tracked time (edit mode only) */}
          {mode === "edit" && item && item.trackedSeconds > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-2">
              <span className="text-base">⏱</span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/80">Time tracked</p>
                <p className="font-mono text-sm font-bold text-amber-300">
                  {item.trackedSeconds < 3600
                    ? `${Math.floor(item.trackedSeconds / 60)}m ${item.trackedSeconds % 60}s`
                    : `${Math.floor(item.trackedSeconds / 3600)}h ${Math.floor((item.trackedSeconds % 3600) / 60)}m`}
                </p>
              </div>
            </div>
          )}

          {/* More options toggle */}
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition hover:border-[var(--app-accent)] hover:text-[var(--app-text)] ${
              hasDetails
                ? "border-[color-mix(in_srgb,var(--app-accent)_38%,transparent)] bg-[color-mix(in_srgb,var(--app-accent)_8%,transparent)] text-[var(--app-accent)]"
                : "border-[var(--app-border-strong)] text-[var(--app-muted)]"
            }`}
          >
            <span>{showMore ? "Hide details" : hasDetails ? "Details added" : "Add details"}</span>
            <svg
              width="10" height="10" viewBox="0 0 10 10" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
              style={{ transform: showMore ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
            >
              <path d="M1 3l4 4 4-4"/>
            </svg>
          </button>

          {/* Expanded options */}
          {showMore && (
            <div className="space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
              {/* Notes */}
              <label className="grid gap-1 text-xs">
                <span className="text-[var(--app-muted)]">Notes</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-text)]"
                  placeholder="Optional notes..."
                />
              </label>

              {/* Repeat */}
              <div>
                <p className="mb-1 text-xs text-[var(--app-muted)]">Repeat</p>
                <button
                  type="button"
                  onClick={() => setShowRecurrencePicker((v) => !v)}
                  className="flex h-9 w-full items-center justify-between rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text)]"
                >
                  <span className={recurrenceRule ? "text-[var(--app-accent)]" : "text-[var(--app-muted)]"}>
                    {ruleLabel(recurrenceRule)}
                  </span>
                  <span className="text-[var(--app-muted)]">&#9662;</span>
                </button>
                {showRecurrencePicker && (
                  <RecurrencePicker
                    value={recurrenceRule}
                    anchorDate={new Date(startAt)}
                    onChange={(v) => { setRecurrenceRule(v); setShowRecurrencePicker(false); }}
                  />
                )}
              </div>

              {/* Links */}
              <LinksPanel links={links} onChange={setLinks} />

              {/* Color */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs text-[var(--app-muted)]">Color</p>
                  {color !== null && (
                    <button type="button" onClick={() => setColor(null)}
                      className="text-[11px] text-[var(--app-muted)] transition hover:text-[var(--app-text)]">
                      Reset
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button" onClick={() => setColor(null)} title="Use project color"
                    className={`relative h-6 w-6 rounded-full border-2 transition ${color === null ? "scale-110 border-[var(--app-accent)]" : "border-[var(--app-border-strong)] hover:border-[var(--app-accent)]"}`}
                    style={{ background: `linear-gradient(135deg, ${projectId ? (projects.find((p) => p.id === projectId)?.color ?? "#64748b") : "#64748b"} 50%, #1d2434 50%)` }}
                  >
                    {color === null && <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow">✓</span>}
                  </button>
                  {COLOR_PRESETS.map((preset) => (
                    <button key={preset} type="button" onClick={() => setColor(preset)} title={preset}
                      className={`h-6 w-6 rounded-full border-2 transition ${color === preset ? "scale-110 border-white" : "border-transparent hover:border-white/60"}`}
                      style={{ backgroundColor: preset }}
                    />
                  ))}
                  <label title="Custom color"
                    className={`relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 transition ${color !== null && !COLOR_PRESETS.includes(color) ? "scale-110 border-white" : "border-[var(--app-border-strong)] hover:border-white/60"}`}
                    style={{ backgroundColor: color !== null && !COLOR_PRESETS.includes(color) ? color : "var(--app-surface)" }}
                  >
                    <span className="text-[11px] text-[var(--app-muted)]">+</span>
                    <input type="color" value={color ?? "#14b8a6"} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {error ? <p className="px-4 pb-2 text-xs text-[var(--app-danger)]">{error}</p> : null}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-[var(--app-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            {mode === "edit" && item ? (
              confirmDelete ? (
                <>
                  <span className="text-xs text-[var(--app-danger)]">Delete?</span>
                  <button type="button" onClick={handleDelete} disabled={busy}
                    className="rounded-lg bg-[var(--app-danger)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-80 disabled:opacity-60">
                    Yes
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-[var(--app-border-strong)] px-2.5 py-1.5 text-xs text-[var(--app-muted)] transition hover:text-[var(--app-text)]">
                    No
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy}
                  className="rounded-lg border border-[var(--app-danger)] px-2.5 py-1.5 text-xs text-[var(--app-danger)] transition hover:opacity-80 disabled:opacity-60">
                  Delete
                </button>
              )
            ) : null}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={requestClose}
              className="rounded-lg border border-[var(--app-border-strong)] px-3 py-1.5 text-xs text-[var(--app-muted)] transition hover:text-[var(--app-text)]">
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
