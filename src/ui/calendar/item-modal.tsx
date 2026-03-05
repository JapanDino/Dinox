"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiItem, ApiItemMutationInput, ApiItemStatus } from "@/src/ui/api/types";
import { defaultEndFromStart, toDateTimeLocalValue } from "./date-utils";

interface ItemModalProps {
  open: boolean;
  mode: "create" | "edit";
  item: ApiItem | null;
  initialStart: Date;
  initialEnd: Date;
  onClose: () => void;
  onSubmit: (input: ApiItemMutationInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const statusOptions: ApiItemStatus[] = ["TODO", "DONE", "CANCELLED"];

export function ItemModal({
  open,
  mode,
  item,
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      setError("");
      return;
    }

    setTitle("");
    setDescription("");
    setStartAt(toDateTimeLocalValue(initialStart));
    setEndAt(toDateTimeLocalValue(initialEnd));
    setAllDay(false);
    setStatus("TODO");
    setError("");
  }, [open, mode, item, initialStart, initialEnd]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await onSubmit({
        title,
        description: description.trim().length > 0 ? description.trim() : null,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        allDay,
        status,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{modalTitle}</h2>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-sm text-[var(--app-muted)] hover:bg-[var(--app-bg)]">
            Close
          </button>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-1 text-sm">
            <span>Title</span>
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-md border border-[var(--app-border)] px-3 py-2"
              placeholder="What needs to be done?"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="rounded-md border border-[var(--app-border)] px-3 py-2"
              placeholder="Optional details"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span>Start</span>
              <input
                required
                type="datetime-local"
                value={startAt}
                onChange={(event) => handleStartChange(event.target.value)}
                className="rounded-md border border-[var(--app-border)] px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>End</span>
              <input
                required
                type="datetime-local"
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
                className="rounded-md border border-[var(--app-border)] px-3 py-2"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} />
              All day
            </label>

            <label className="grid gap-1 text-sm">
              <span>Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ApiItemStatus)}
                className="rounded-md border border-[var(--app-border)] px-3 py-2"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex items-center justify-between">
          <div>
            {mode === "edit" && item ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete
              </button>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-[var(--app-accent)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Saving..." : mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
