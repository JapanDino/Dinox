"use client";

interface OnboardingScreenProps {
  onLoadDemo: () => void;
  onCreateEvent: () => void;
  loading: boolean;
}

const FEATURES = [
  {
    icon: "◈",
    title: "4 calendar views",
    description: "Month, Week, Day, Agenda — switch instantly",
  },
  {
    icon: "◉",
    title: "Projects & tags",
    description: "Organize events by project with color coding",
  },
  {
    icon: "◎",
    title: "Local-first",
    description: "All data stays on your device, no cloud",
  },
];

export function OnboardingScreen({ onLoadDemo, onCreateEvent, loading }: OnboardingScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-16">
      {/* Header */}
      <div className="mb-10 text-center">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--app-muted)]">
          Welcome to
        </p>
        <h1 className="text-5xl font-bold tracking-tight text-[var(--app-text)]">Dinox</h1>
        <p className="mt-3 text-base text-[var(--app-muted)]">
          Local-first calendar for focused work
        </p>
      </div>

      {/* Feature pills */}
      <div className="mb-10 grid w-full max-w-lg gap-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-3"
          >
            <span
              className="mt-0.5 shrink-0 text-xl"
              style={{ color: "var(--app-accent)" }}
              aria-hidden
            >
              {f.icon}
            </span>
            <div>
              <p className="text-sm font-medium text-[var(--app-text)]">{f.title}</p>
              <p className="text-xs text-[var(--app-muted)]">{f.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onLoadDemo}
          disabled={loading}
          className="h-11 min-w-[180px] rounded-xl bg-[var(--app-accent)] px-6 text-sm font-semibold text-[var(--app-bg)] transition hover:bg-[var(--app-accent-strong)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Loading…" : "Load demo data"}
        </button>
        <button
          type="button"
          onClick={onCreateEvent}
          className="h-11 min-w-[180px] rounded-xl border border-[var(--app-border-strong)] px-6 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
        >
          Start fresh
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
