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
- Windows NSIS assisted installer generation (`Dinox-Setup-0.1.0.exe`)
- Desktop launcher with startup status and update-channel check

## Validation
- Desktop entrypoints passed targeted ESLint and `node --check`
- `pnpm build` passed
- `pnpm desktop:package:win` passed

## Artifacts
- Installer: `release/Dinox-Setup-0.1.0.exe`
- Update metadata: `release/latest.yml`

## Known Warnings
- Next.js workspace-root warning due lockfile outside repository
- Full `pnpm lint` still reports pre-existing issues outside the desktop launcher path.
