# Release Notes - Dinox

## 0.1.3

### Fixed
- Stabilized Windows startup on systems where Electron 40 crashes inside the Chromium sandbox shortly after the main window opens.

### Validation
- Reproduced the installed shortcut crash without `--no-sandbox`.
- Verified the installed executable stays alive when launched with the sandbox workaround.

## 0.1.2

### Fixed
- Prevented a Windows Electron crash when launching Dinox from the installed desktop shortcut.
- Made the launcher use a safer Windows rendering path by avoiding fragile GPU compositor effects.
- Fixed update checks so older release metadata is not offered as a downgrade.

### Validation
- Installed `Dinox-Setup-0.1.2.exe` over the existing local install.
- Launched Dinox through `Dinox.lnk`; process stayed alive, server listened on `127.0.0.1:3131`, and no new `APPCRASH` event was recorded.
- `pnpm qa:smoke:exe:quick` passed against the installed executable.

### Artifacts
- Installer: `release/Dinox-Setup-0.1.2.exe`
- Update metadata: `release/latest.yml`
- SHA256: `159C6763CBFDF5AD5EFEE4B4223FFB18CA2CCF36964D5918D31266FF6748507D`

## 0.1.0 MVP

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
