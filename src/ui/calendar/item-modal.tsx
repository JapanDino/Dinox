"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ApiItem,
  ApiItemMutationInput,
  ApiItemStatus,
  ApiProject,
  ApiTag,
} from "@/src/ui/api/types";
import { defaultEndFromStart, toDateTimeLocalValue } from "./date-utils";

interface ItemModalProps {
  open: boolean;
  mode: "create" | "edit";
  item: ApiItem | null;
  projects: ApiProject[];
  tags: ApiTag[];
  initialStart: Date;
  initialEnd: Date;
  onClose: () => void;
  onSubmit: (input: ApiItemMutationInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const statusOptions: ApiItemStatus[] = ["TODO", "DONE", "CANCELLED"];

const COLOR_PRESETS = [
  "#14b8a6", // teal (accent)
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#ef4444", // red
  "#64748b", // slate
  "#f1f5f9", // light
];

const statusLabels: Record<ApiItemStatus, string> = {
  TODO: "To do",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export function ItemModal({
  open,
  mode,
  item,
  projects,
  tags,
  initialStart,
  initialEnd,
  onClose,
  onSubmit,
  onDelete,
}: ItemModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState(toDateTimeLocalValue(initialStart));
  const [endAt, setEndAt] = useState(toDateTimeLocalValue(initialEnd));
  const [allDay, setAllDay] = useState(false);
  const [status, setStatus] = useState<ApiItemStatus>("TODO");
  const [projectId, setProjectId] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const modalTitle = useMemo(() => (mode === "create" ? "Create item" : "Edit item"), [mode]);

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
      setStatus(item.status);
      setProjectId(item.projectId ?? "");
      setColor(item.color ?? null);
      setSelectedTagIds(item.tags.map((tag) => tag.id));
      setError("");
      return;
    }

    setTitle("");
    setDescription("");
    setStartAt(toDateTimeLocalValue(initialStart));
    setEndAt(toDateTimeLocalValue(initialEnd));
    setAllDay(false);
    setStatus("TODO");
    setProjectId("");
    setColor(null);
    setSelectedTagIds([]);
    setError("");
  }, [open, mode, item, initialStart, initialEnd]);

  useEffect(() => {
    if (!open) setConfirmDelete(false);
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const start = new Date(startAt);
      const end = new Date(endAt);

      if (end.getTime() < start.getTime()) {
        throw new Error("End date should be greater than start date.");
      }

      await onSubmit({
        title,
        description: description.trim().length > 0 ? description.trim() : null,
        color,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        allDay,
        status,
        projectId: projectId.length > 0 ? projectId : null,
        tagIds: selectedTagIds,
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
      await onDelete(item.id);
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
    // Auto-inherit project color only if no custom color is set
    if (color === null) {
      const project = projects.find((p) => p.id === nextProjectId);
      if (project) setColor(project.color);
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((current) => {
      if (current.includes(tagId)) {
        return current.filter((entry) => entry !== tagId);
      }

      return [...current, tagId];
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: "color-mix(in srgb, var(--app-bg) 82%, transparent)" }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[0_40px_120px_rgba(3,7,18,0.45)]"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--app-muted)]">Dinox item</p>
            <h2 className="text-2xl font-semibold text-[var(--app-text)]">{modalTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--app-border-strong)] px-3 py-1.5 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm">
            <span className="text-[var(--app-muted)]">Title *</span>
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-11 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 text-[var(--app-text)]"
              placeholder="What needs to be done?"
            />
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="text-[var(--app-muted)]">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 py-2 text-[var(--app-text)]"
              placeholder="Optional details"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="text-[var(--app-muted)]">Start</span>
              <input
                required
                type="datetime-local"
                value={startAt}
                onChange={(event) => handleStartChange(event.target.value)}
                className="h-11 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 text-[var(--app-text)]"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-[var(--app-muted)]">End</span>
              <input
                required
                type="datetime-local"
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
                className="h-11 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 text-[var(--app-text)]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1.4fr]">
            <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 text-sm text-[var(--app-muted)]">
              <input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} />
              All day
            </label>

            <div className="inline-flex rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] p-1">
              {statusOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatus(option)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs transition ${
                    status === option
                      ? "bg-[var(--app-accent)] text-[var(--app-bg)]"
                      : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
                  }`}
                >
                  {statusLabels[option]}
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-1.5 text-sm">
            <span className="text-[var(--app-muted)]">Project</span>
            <select
              value={projectId}
              onChange={(event) => handleProjectChange(event.target.value)}
              className="h-11 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 text-[var(--app-text)]"
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--app-muted)]">Event color</span>
              {color !== null && (
                <button
                  type="button"
                  onClick={() => setColor(null)}
                  className="text-[11px] text-[var(--app-muted)] hover:text-[var(--app-text)] transition"
                >
                  ↩ Use project color
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* "Inherit" swatch */}
              <button
                type="button"
                onClick={() => setColor(null)}
                title="Use project color"
                className={`relative h-7 w-7 rounded-full border-2 transition ${
                  color === null
                    ? "border-[var(--app-accent)] scale-110"
                    : "border-[var(--app-border-strong)] hover:border-[var(--app-accent)]"
                }`}
                style={{
                  background: `linear-gradient(135deg, ${
                    projectId ? (projects.find((p) => p.id === projectId)?.color ?? "#64748b") : "#64748b"
                  } 50%, #1d2434 50%)`,
                }}
              >
                {color === null && (
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow">✓</span>
                )}
              </button>

              {/* Preset swatches */}
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  title={preset}
                  className={`h-7 w-7 rounded-full border-2 transition ${
                    color === preset
                      ? "border-white scale-110"
                      : "border-transparent hover:border-white/60"
                  }`}
                  style={{ backgroundColor: preset }}
                />
              ))}

              {/* Custom color picker */}
              <label
                title="Custom color"
                className={`relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 transition ${
                  color !== null && !COLOR_PRESETS.includes(color)
                    ? "border-white scale-110"
                    : "border-[var(--app-border-strong)] hover:border-white/60"
                }`}
                style={{ backgroundColor: color !== null && !COLOR_PRESETS.includes(color) ? color : "var(--app-surface-2)" }}
              >
                <span className="text-[11px] text-[var(--app-muted)]">+</span>
                <input
                  type="color"
                  value={color ?? "#14b8a6"}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>

              {/* Preview chip */}
              {color !== null && (
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: color }}
                >
                  {color}
                </span>
              )}
            </div>
          </div>

          <fieldset className="rounded-xl border border-[var(--app-border-strong)] p-3">
            <legend className="px-1 text-[11px] uppercase tracking-[0.13em] text-[var(--app-muted)]">Tags</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = selectedTagIds.includes(tag.id);

                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      selected ? "text-[var(--app-text)]" : "text-[var(--app-muted)]"
                    }`}
                    style={{
                      borderColor: selected ? tag.color : "var(--app-border-strong)",
                      backgroundColor: selected ? `color-mix(in srgb, ${tag.color} 75%, transparent)` : "transparent",
                    }}
                  >
                    #{tag.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        {error ? <p className="mt-3 text-sm text-[var(--app-danger)]">{error}</p> : null}

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mode === "edit" && item ? (
              confirmDelete ? (
                <>
                  <span className="text-sm text-[var(--app-danger)]">Delete?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={busy}
                    className="rounded-xl bg-[var(--app-danger)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-60"
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-xl border border-[var(--app-border-strong)] px-3 py-2 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy}
                  className="rounded-xl border border-[var(--app-danger)] px-4 py-2 text-sm text-[var(--app-danger)] transition hover:opacity-80 disabled:opacity-60"
                >
                  Delete
                </button>
              )
            ) : null}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--app-border-strong)] px-4 py-2 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-[var(--app-accent)] px-4 py-2 text-sm font-semibold text-[var(--app-bg)] transition hover:bg-[var(--app-accent-strong)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Saving..." : mode === "create" ? "Create" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}