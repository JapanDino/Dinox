"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type AppRoute = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
  icon: ReactNode;
};

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 18 18" fill="none">
      <path
        d="M4.25 3.25h9.5c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5h-9.5c-.83 0-1.5-.67-1.5-1.5v-9c0-.83.67-1.5 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path d="M5.75 1.75v3M12.25 1.75v3M2.75 6.6h12.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M6 9h2.2v2.2H6V9ZM9.8 9H12v2.2H9.8V9Z" fill="currentColor" opacity="0.82" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 18 18" fill="none">
      <path
        d="M3.25 13.5c1.35-2.7 3.28-4.07 5.75-4.07s4.4 1.37 5.75 4.07"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path d="M4.25 6.25h2.5v6h-2.5v-6ZM7.75 3.5h2.5v8.75h-2.5V3.5ZM11.25 5h2.5v7.25h-2.5V5Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <circle cx="9" cy="9.4" r="1.2" fill="currentColor" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 18 18" fill="none">
      <path d="M3.25 5.25h11.5M3.25 9h11.5M3.25 12.75h11.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <circle cx="6.5" cy="5.25" r="1.45" fill="var(--app-surface)" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="11.4" cy="9" r="1.45" fill="var(--app-surface)" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="8.25" cy="12.75" r="1.45" fill="var(--app-surface)" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

const routes: AppRoute[] = [
  {
    href: "/",
    label: "Calendar",
    match: (pathname) => pathname === "/" || pathname.startsWith("/projects"),
    icon: <CalendarIcon />,
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    match: (pathname) => pathname.startsWith("/dashboard"),
    icon: <DashboardIcon />,
  },
  {
    href: "/settings",
    label: "Settings",
    match: (pathname) => pathname.startsWith("/settings"),
    icon: <SettingsIcon />,
  },
];

export function AppBottomNav() {
  const pathname = usePathname() || "/";

  return (
    <nav className="mt-auto w-full shrink-0 border-t border-[var(--app-border)] pt-3" aria-label="Primary navigation">
      <div className="space-y-1 rounded-xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-bg)_42%,transparent)] p-1.5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--app-text)_6%,transparent)]">
        {routes.map((route) => {
          const active = route.match(pathname);

          return (
            <Link
              key={route.href}
              href={route.href}
              aria-label={route.label}
              aria-current={active ? "page" : undefined}
              title={route.label}
              className={`group relative flex h-10 min-w-0 items-center gap-2.5 rounded-lg px-2.5 text-xs font-semibold transition ${
                active
                  ? "bg-[color-mix(in_srgb,var(--app-accent)_14%,var(--app-surface-2))] text-[var(--app-accent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--app-accent)_38%,transparent)]"
                  : "text-[var(--app-muted)] hover:bg-[var(--app-surface-2)] hover:text-[var(--app-text)]"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
                  active
                    ? "bg-[color-mix(in_srgb,var(--app-accent)_18%,transparent)]"
                    : "bg-[color-mix(in_srgb,var(--app-surface-2)_65%,transparent)] group-hover:bg-[color-mix(in_srgb,var(--app-accent)_10%,var(--app-surface-2))]"
                }`}
              >
                {route.icon}
              </span>
              <span className="min-w-0 flex-1 truncate">{route.label}</span>
              {active ? (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--app-accent)] shadow-[0_0_14px_var(--app-accent)]" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
