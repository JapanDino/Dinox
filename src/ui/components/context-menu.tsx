"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export interface ContextMenuItem {
  /** "item" (default), "separator", or "label" (non-interactive section heading). */
  type?: "item" | "separator" | "label";
  label?: string;
  icon?: ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

export interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
  /** Optional small heading shown at the very top of the menu. */
  title?: string;
}

const MENU_WIDTH = 224;

export function ContextMenu({
  state,
  onClose,
}: {
  state: ContextMenuState | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Position after mount so we can measure real height and clamp to the viewport.
  useLayoutEffect(() => {
    if (!state) {
      setPos(null);
      return;
    }
    const el = ref.current;
    const height = el?.offsetHeight ?? 0;
    const width = el?.offsetWidth ?? MENU_WIDTH;
    const left = Math.max(8, Math.min(state.x, window.innerWidth - width - 8));
    const top = Math.max(8, Math.min(state.y, window.innerHeight - height - 8));
    setPos({ left, top });
  }, [state]);

  useEffect(() => {
    if (!state) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("blur", onClose);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("blur", onClose);
    };
  }, [state, onClose]);

  if (!state) return null;

  return (
    <div
      ref={ref}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
      className="ctx-menu-in fixed z-[120] overflow-hidden rounded-xl border border-[var(--app-border-strong)] bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] p-1 shadow-[0_18px_50px_rgba(3,7,18,0.45)] backdrop-blur-md"
      style={{
        left: pos?.left ?? state.x,
        top: pos?.top ?? state.y,
        minWidth: MENU_WIDTH,
        // Keep it invisible for the first measuring frame to avoid a flash at the wrong spot.
        visibility: pos ? "visible" : "hidden",
      }}
    >
      {state.title ? (
        <p className="truncate px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">
          {state.title}
        </p>
      ) : null}
      {state.items.map((item, index) => {
        if (item.type === "separator") {
          return <div key={index} className="my-1 h-px bg-[var(--app-border)]" />;
        }
        if (item.type === "label") {
          return (
            <p
              key={index}
              className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]"
            >
              {item.label}
            </p>
          );
        }
        return (
          <button
            key={index}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              onClose();
              item.onSelect?.();
            }}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] leading-tight transition disabled:cursor-not-allowed disabled:opacity-40 ${
              item.danger
                ? "text-[var(--app-danger)] hover:bg-[color-mix(in_srgb,var(--app-danger)_14%,transparent)]"
                : "text-[var(--app-text)] hover:bg-[var(--app-surface-2)]"
            }`}
          >
            {item.icon !== undefined ? (
              <span className="w-4 shrink-0 text-center text-[13px] opacity-80">{item.icon}</span>
            ) : null}
            <span className="flex-1 truncate">{item.label}</span>
            {item.shortcut ? (
              <span className="shrink-0 font-mono text-[10px] text-[var(--app-muted)]">{item.shortcut}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
