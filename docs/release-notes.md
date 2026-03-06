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

## Validation
- `pnpm lint` passed
- `pnpm build` passed
- `pnpm qa:smoke:api` passed (automated CRUD API smoke with cleanup)
- `pnpm desktop:pack` passed
- `pnpm desktop:package:win` produced release artifacts

## Artifacts
- Installer: `release/Dinox Setup 0.1.0.exe`
- Blockmap: `release/Dinox Setup 0.1.0.exe.blockmap`
- Update metadata: `release/latest.yml`

## Known Warnings
- Next.js workspace-root warning due lockfile outside repository
- Electron packaging warns that `asar` is disabled (intentional for runtime script compatibility in MVP)
