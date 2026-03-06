# Dinox QA Smoke Checklist

Date: 2026-03-06 (Europe/Moscow)
Branch: `J-D/release-dinox-exe`

## Automated (Completed)
- [x] Build web app: `pnpm build`
- [x] Build installer: `pnpm desktop:package:win`
- [x] API smoke on `next start`:
  - [x] `POST /api/projects`
  - [x] `POST /api/tags`
  - [x] `POST /api/items`
  - [x] `PATCH /api/items/[id]`
  - [x] `DELETE /api/items/[id]`
  - [x] `DELETE /api/tags/[id]`
  - [x] `DELETE /api/projects/[id]`

## Manual GUI (Pending)
- [ ] Launch `release/win-unpacked/Dinox.exe`
- [ ] Verify month/week/day/agenda switching
- [ ] Create item by slot click (quick create)
- [ ] Edit item and set status DONE/CANCELLED
- [ ] Project filter show/hide and "Only"
- [ ] Tag filter on/off
- [ ] Search by title/description
- [ ] Confirm item/project/tag deletes from UI
- [ ] Restart app and confirm data persistence in `%APPDATA%/Dinox/dinox.db`

## Notes
- In this sandbox, direct GUI runtime validation is limited.
- API layer and release packaging were validated successfully.
