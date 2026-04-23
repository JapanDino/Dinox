"use client";

import Link from "next/link";
import type { CSSProperties, MouseEventHandler, ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Shared visual language for projects across the app.
//
//   - ProjectDot      → compact emoji-or-color marker (with soft glow)
//   - ProjectTag      → small inline pill used inside lists / agendas
//   - ProjectLinkTag  → same as ProjectTag but navigates to /projects/[id]
//
// All styles use project.color via color-mix so they auto-adapt to the theme
// and feel cohesive with the Dinox design tokens.
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectLike {
  id: string;
  name: string;
  color: string;
  emoji?: string | null;
}

// ── Marker (emoji or color dot with subtle glow) ─────────────────────────────

export function ProjectDot({
  project,
  size = 14,
  glow = true,
}: {
  project: Pick<ProjectLike, "color" | "emoji">;
  size?: number;
  glow?: boolean;
}) {
  if (project.emoji) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center leading-none transition-transform duration-200 ease-out group-hover/project:scale-110"
        style={{
          fontSize: size,
          filter: glow
            ? `drop-shadow(0 0 6px color-mix(in srgb, ${project.color} 55%, transparent))`
            : undefined,
        }}
        aria-hidden
      >
        {project.emoji}
      </span>
    );
  }

  const dotStyle: CSSProperties = {
    width: size * 0.72,
    height: size * 0.72,
    background: `radial-gradient(circle at 30% 30%, color-mix(in srgb, ${project.color} 90%, white), ${project.color})`,
    boxShadow: glow
      ? `0 0 0 1px color-mix(in srgb, ${project.color} 45%, transparent), 0 0 8px color-mix(in srgb, ${project.color} 55%, transparent)`
      : undefined,
  };

  return (
    <span
      className="inline-block shrink-0 rounded-full transition-transform duration-200 ease-out group-hover/project:scale-125"
      style={dotStyle}
      aria-hidden
    />
  );
}

// ── Inline pill (agenda, dashboard recent, calendar event meta) ───────────────

export function ProjectTag({
  project,
  size = "md",
  interactive = false,
  onClick,
  className = "",
  leading,
}: {
  project: ProjectLike;
  size?: "xs" | "sm" | "md";
  interactive?: boolean;
  onClick?: MouseEventHandler<HTMLElement>;
  className?: string;
  leading?: ReactNode;
}) {
  const sizing =
    size === "xs"
      ? "h-5 px-1.5 gap-1 text-[10px]"
      : size === "sm"
        ? "h-6 px-2 gap-1.5 text-[11px]"
        : "h-7 px-2.5 gap-1.5 text-xs";

  const style: CSSProperties = {
    // soft tinted background with a 1px color halo — looks like a proper chip
    background: `linear-gradient(135deg,
      color-mix(in srgb, ${project.color} 28%, transparent) 0%,
      color-mix(in srgb, ${project.color} 14%, transparent) 100%)`,
    borderColor: `color-mix(in srgb, ${project.color} 55%, transparent)`,
    color: `color-mix(in srgb, ${project.color} 78%, var(--app-text))`,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${project.color} 18%, transparent)`,
  };

  const interactiveClasses = interactive
    ? "cursor-pointer hover:-translate-y-0.5 hover:saturate-150 active:translate-y-0 active:scale-95"
    : "";

  return (
    <span
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      className={`group/project inline-flex shrink-0 items-center rounded-full border font-medium tabular-nums transition-all duration-200 ease-out ${sizing} ${interactiveClasses} ${className}`}
      style={style}
    >
      {leading}
      <ProjectDot project={project} size={size === "xs" ? 12 : 14} />
      <span className="truncate font-semibold tracking-tight">{project.name}</span>
    </span>
  );
}

// ── Link variant (no onClick handler; navigates) ─────────────────────────────

export function ProjectLinkTag({
  project,
  size = "md",
  className = "",
}: {
  project: ProjectLike;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const sizing =
    size === "xs"
      ? "h-5 px-1.5 gap-1 text-[10px]"
      : size === "sm"
        ? "h-6 px-2 gap-1.5 text-[11px]"
        : "h-7 px-2.5 gap-1.5 text-xs";

  const style: CSSProperties = {
    background: `linear-gradient(135deg,
      color-mix(in srgb, ${project.color} 28%, transparent) 0%,
      color-mix(in srgb, ${project.color} 14%, transparent) 100%)`,
    borderColor: `color-mix(in srgb, ${project.color} 55%, transparent)`,
    color: `color-mix(in srgb, ${project.color} 78%, var(--app-text))`,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${project.color} 18%, transparent)`,
  };

  return (
    <Link
      href={`/projects/${project.id}`}
      className={`group/project inline-flex shrink-0 items-center rounded-full border font-medium transition-all duration-200 ease-out hover:-translate-y-0.5 hover:saturate-150 active:translate-y-0 active:scale-95 ${sizing} ${className}`}
      style={style}
    >
      <ProjectDot project={project} size={size === "xs" ? 12 : 14} />
      <span className="truncate font-semibold tracking-tight">{project.name}</span>
    </Link>
  );
}
