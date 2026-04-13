# Release Notes - Dinox MVP 0.1.0

## Delivered
- Backend architecture with domain/data/UI separation
- Prisma + SQLite schema/migrations/seed
- Service-backed API endpoints with Zod validation
- Calendar UI with item/project/tag CRUD and filters
- Agenda and dashboard views
- Onboarding, customized 404, and restyled debug page
- Settings shell and UX polish updates
- Electron desktop shell
- Windows NSIS installer generation (`Dinox Setup 0.1.0.exe`)

## Validation
- `pnpm lint` passed
- `pnpm build` passed
- `pnpm qa:smoke:api` passed (automated CRUD API smoke with cleanup)
- `pnpm desktop:pack` passed
- `pnpm desktop:package:win` passed
- `release/win-unpacked/Dinox.exe` start verified

## Artifacts
- Installer: `release/Dinox Setup 0.1.0.exe`
- Blockmap: `release/Dinox Setup 0.1.0.exe.blockmap`
- Update metadata: `release/latest.yml`

## Known Warnings
- Next.js workspace-root warning due lockfile outside repository
- Electron packaging warns that `asar` is disabled (intentional for runtime script compatibility in MVP)
- Electron packaging uses default app icon because custom `.ico` is not configured yet
