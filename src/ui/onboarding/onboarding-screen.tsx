"use client";

interface OnboardingScreenProps {
  onCreateEvent: () => void;
}

const FEATURES = [
  {
    icon: "M",
    title: "4 calendar views",
    description: "Month, Week, Day, Agenda - switch instantly",
  },
  {
    icon: "#",
    title: "Projects & tags",
    description: "Organize events by project with color coding",
  },
  {
    icon: "L",
    title: "Local-first",
    description: "All data stays on your device, no cloud",
  },
];

export function OnboardingScreen({ onCreateEvent }: OnboardingScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-16">
      <div className="mb-10 text-center">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--app-muted)]">
          Welcome to
        </p>
        <h1 className="text-5xl font-bold tracking-tight text-[var(--app-text)]">Dinox</h1>
        <p className="mt-3 text-base text-[var(--app-muted)]">
          Local-first calendar for focused work
        </p>
      </div>

      <div className="mb-10 grid w-full max-w-lg gap-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="flex items-start gap-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-3"
          >
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--app-border-strong)] font-mono text-xs font-semibold"
              style={{ color: "var(--app-accent)" }}
              aria-hidden
            >
              {feature.icon}
            </span>
            <div>
              <p className="text-sm font-medium text-[var(--app-text)]">{feature.title}</p>
              <p className="text-xs text-[var(--app-muted)]">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onCreateEvent}
          className="h-11 min-w-[200px] rounded-xl bg-[var(--app-accent)] px-6 text-sm font-semibold text-[var(--app-bg)] transition hover:bg-[var(--app-accent-strong)] hover:text-[var(--app-text)]"
        >
          Create your first event
        </button>
      </div>

      <p className="mt-6 text-[11px] text-[var(--app-muted)]">
        Press{" "}
        <kbd className="rounded border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-1.5 py-0.5 font-mono text-[10px]">
          N
        </kbd>{" "}
        anytime to create a new event
      </p>
    </div>
  );
}
