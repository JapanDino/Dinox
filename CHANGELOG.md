# Changelog

## 0.2.0 - 2026-06-15

### Item creation
- Tasks now use a single **Due** field instead of a forced start/end range; events keep the range.
- Time is picked from a 15-minute select that respects the 12h/24h preference.
- New items default to the nearest hour (or the selected time-grid slot) instead of midnight.
- Inline "Title is required" validation and an in-app "Discard unsaved changes?" guard.

### Recurrence
- Repeat presets apply on click; weekly pre-selects the start day.
- Custom rules: interval, weekly day picker, monthly/yearly day-of-month.
- End modes: **After N**, **On date** (UNTIL), or **Never** (with a generation safety cap).
- Human-readable summaries (e.g. "Weekly on Sun, Mon, Wed · 52 times").
- Edit/delete a series as **This event**, **This and following**, or **All events**.

### Views & data
- Week header range and the dashboard "This week" count use the same week start as the grid.
- Loading skeletons on the dashboard and project pages instead of a blank "Loading…".
- On mobile the Week view falls back to Day; added bottom navigation; wider settings.

### Release hygiene
- Ships with an empty local database — no demo data reaches end users.
- Removed the debug demo-loader route and UI from production; empty state offers a single "Create your first event".
- Demo seed remains available for development via `pnpm seed`.
- Synced displayed desktop/app versions with the packaged version.
