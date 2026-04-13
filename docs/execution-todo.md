# Dinox Execution ToDo

Updated: 2026-03-09 (Europe/Moscow)

## Phase Progress
- [x] P0-01. Agent architecture and branch workflow approved.

- [x] P1-01. `J D/backend-platform` - Next.js App Router + TS + Tailwind + pnpm scripts.
- [x] P1-02. `J D/backend-data-prisma` - Prisma + SQLite + schema + migrate + seed.
- [x] P1-03. `J D/backend-domain-service` - domain types, Zod DTO, repository interfaces, services.
- [x] P1-04. `J D/backend-repositories-api` - Prisma repositories + API routes through services.
- [x] P1-05. `J D/backend-debug-demo` - debug endpoint + demo data loader.

- [x] P2-01. `J D/ui-figma-calendar` - design structure docs/blueprint.
- [x] P2-02. `J D/ui-calendar-core` - calendar + agenda + item modal CRUD.
- [x] P2-03. `J D/ui-projects-tags` - CRUD projects/tags + assignment in item form.
- [x] P2-04. `J D/ui-filters-search` - filters + search without page reload.

- [x] P3-01. `J D/desktop-electron-shell` - Electron shell integrated with Next.
- [x] P3-02. `J D/desktop-db-runtime` - runtime DB path + migrate deploy on startup.
- [x] P3-03. `J D/desktop-installer-exe` - Windows installer EXE build.

- [ ] P4-01. `J D/qa-smoke` - packaged EXE interaction and persistence checks pending.
- [x] P4-02. `J D/docs-readme` - README with run/migrate/seed/studio/build instructions.
- [ ] P4-03. `J D/release-dinox-exe` - publish final release package + notes.

## Last Completed Actions
- Validated full build pipeline (`lint`, `build`, API smoke, desktop pack, desktop package).
- Rebuilt NSIS installer and verified local `Dinox.exe` startup from `win-unpacked`.
- Synced release/QA docs with current artifacts and runtime status.

## Next Focus
1. Complete packaged-app interaction and persistence smoke (P4-01).
2. Publish final release package and notes (P4-03).
3. Continue Figma-driven visual polish as the next feature cycle.

## Smoke Log
- 2026-03-06: API smoke passed on `next start` (GET/POST/PATCH/DELETE for projects, tags, items).
- 2026-03-06: Cleanup executed for temporary smoke entities.
- 2026-03-06: Added repeatable smoke runner `pnpm qa:smoke:api` (`scripts/qa/smoke-api.mjs`).
- 2026-03-08: Removed `next/font/google` usage; production build now succeeds offline.
- 2026-03-08: UI smoke passed on `next start` for month/week/day/agenda, create, search, edit, and delete flows.
- 2026-03-09: `pnpm desktop:package:win` passed; `release/win-unpacked/Dinox.exe` start verified.
