# Dinox - Local-First Calendar MVP

Dinox is a local-first calendar app built with Next.js + TypeScript + SQLite + Prisma.

## Implemented Scope
- Calendar views: `month`, `week`, `day`, `agenda`
- Dashboard view: `/dashboard`
- Onboarding flow and custom `404` page
- Settings shell with theme preferences
- CRUD: Projects, Tags, Items (task/event)
- Item assignment: optional `project` + many-to-many `tags`
- Filters: project show/hide (multi-select), tags, search (`title`/`description`)
- Quick create: click day/time slot in calendar
- Debug tools: `/debug` page + `POST /api/debug/load-demo`
- Desktop shell: Electron
- Windows installer build: NSIS (`Dinox Setup ... .exe`)

## Tech Stack
- Next.js (App Router), TypeScript
- TailwindCSS
- Prisma ORM + SQLite
- Zod validation
- react-big-calendar
- Electron + electron-builder

## Architecture
Code is split by layers:
- `src/domain` - domain models, repository interfaces, Zod schemas, services (`ItemService`, `ProjectService`, `TagService`)
- `src/data/prisma` - Prisma client + repository implementations + mappers
- `app` + `src/ui` - API routes and UI components

Design rule:
- UI/API never call Prisma directly
- API uses service layer
- Domain services validate inputs and enforce rules

## Data Model
Main Prisma models (`prisma/schema.prisma`):
- `Project`
- `Tag`
- `Item`
- `ItemTag`

Future-ready nullable fields are already present:
- `externalSource`, `externalId`
- `recurrenceRule`
- `seriesId`, `parentId`

## Prerequisites
- Node.js 22+
- pnpm 10+
- Windows for desktop packaging (`.exe`)

## Run (Web)
```bash
pnpm install
pnpm prisma:migrate:dev
pnpm prisma:generate
pnpm prisma:seed
pnpm dev
```

App URLs:
- Main app: `http://localhost:3000`
- Dashboard: `http://localhost:3000/dashboard`
- Debug/demo seed page: `http://localhost:3000/debug`

## Prisma Commands
```bash
pnpm prisma:migrate:dev
pnpm prisma:generate
pnpm prisma:seed
pnpm prisma:studio
```

## Desktop Commands
Development shell:
```bash
pnpm desktop:dev
```

Create unpacked desktop app:
```bash
pnpm desktop:pack
```

Create Windows installer EXE:
```bash
pnpm desktop:package:win
```

Installer output:
- `release/Dinox Setup 0.1.0.exe`

## Local DB Runtime (Desktop)
At desktop startup, runtime config does:
- set SQLite path to `%APPDATA%/Dinox/dinox.db`
- run `prisma migrate deploy`
- start embedded Next server and load it in Electron window

## API Endpoints
- `GET/POST /api/projects`
- `GET/PATCH/DELETE /api/projects/[id]`
- `GET/POST /api/tags`
- `GET/PATCH/DELETE /api/tags/[id]`
- `GET/POST /api/items`
- `GET/PATCH/DELETE /api/items/[id]`
- `POST /api/debug/load-demo`

## Validation + Date Handling
- Incoming data is validated with Zod in service layer
- API transport uses ISO date strings
- Domain/repository logic uses `Date`

## Figma Workflow
- Figma blueprint doc: `docs/figma/calendar-structure.md`
- FigJam blueprint generated for structure/flows (screen composition + interactions)
- Final visual adjustments should be approved before finalizing UI styling

## Future Extension Points
Prepared but not implemented yet:
- Sync metadata + hooks in `src/domain/services/item-service.ts`
  - `validateConflict(...)`
  - `prepareSyncMetadata(...)`
  - `handleRecurrenceStub(...)`
- Recurrence and series fields are already in Prisma schema and domain models
- Multi-user/tenant context can be added at API boundary and service dependency wiring

## Quality Checks Used
```bash
pnpm lint
pnpm build
pnpm qa:smoke:api
pnpm qa:smoke:api:quick
pnpm desktop:pack
pnpm desktop:package:win
```

## QA Smoke Commands
- `pnpm qa:smoke:api`: runs build + starts production server + executes API CRUD smoke + cleanup
- `pnpm qa:smoke:api:quick`: runs smoke flow only (expects build artifacts available)

## Notes
- Close running `Dinox.exe` or app from `release/win-unpacked` before re-running `pnpm desktop:package:win` to avoid file lock errors during packaging.
- If PowerShell blocks `pnpm` scripts, use `pnpm.cmd` equivalents.
- Next.js may print a workspace-root warning because another lockfile exists outside this repo; it does not block functionality.
