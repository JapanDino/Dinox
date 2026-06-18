# Changelog

## 0.2.2 - 2026-06-18

### Fixed
- Fresh installs failed with "Unexpected server error" because the bundled
  database template was missing newer columns (`Project.description`, `notes`).
  The template is now regenerated from the current schema at build time, so a
  brand-new install starts with a correct, empty database.

## 0.2.1 - 2026-06-17

First public release.

### Calendar
- Drag & drop to move and resize events across month, week, and day views.
- Right-click context menus on events, projects, and tags for quick actions.
- Delete a single occurrence, this-and-following, or an entire recurring series.

### Projects
- Redesigned project page with description, notes, and item attachment.

### Brand
- New logo: the red dinosaur paw on a warm circular badge, used as the app icon,
  installer icon, browser favicon, and desktop launcher splash.

### Desktop
- Checks GitHub releases on launch and offers to update when a newer build exists.
- Local database is migrated on startup and backed up automatically before changes.
- Hardened Windows startup; ships with an empty local database (no demo data).

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
