# Release Notes - Dinox MVP 0.1.0

## Delivered
- Backend architecture with domain/data/UI separation
- Prisma + SQLite schema/migrations/seed
- Service-backed API endpoints with Zod validation
- Calendar UI with item/project/tag CRUD
- Filters (projects/tags/search) and agenda list
- Debug demo-data loader
- Electron desktop shell
- Windows NSIS installer generation (`Dinox Setup 0.1.0.exe`)

## Smoke Validation
- `pnpm lint` passed
- `pnpm build` passed
- `pnpm desktop:pack` passed
- `pnpm desktop:package:win` passed

## Known Warnings
- Next.js workspace-root warning due lockfile outside repository
- Electron packaging warns that `asar` is disabled (intentional for runtime script compatibility in MVP)
