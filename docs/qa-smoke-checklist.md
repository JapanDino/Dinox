# Dinox QA Smoke Checklist

Date: 2026-03-06 (Europe/Moscow)
Branch: `J-D/qa-smoke-automation`

## Automated (Completed)
- [x] Build web app: `pnpm build`
- [x] Automated API smoke: `pnpm qa:smoke:api`
  - [x] Starts `next start` on isolated host/port (`127.0.0.1:3100`)
  - [x] `POST /api/projects`
  - [x] `POST /api/tags`
  - [x] `POST /api/items`
  - [x] `PATCH /api/items/[id]`
  - [x] `GET /api/items/[id]` assertion
  - [x] Cleanup deletes (`items`, `tags`, `projects`)
- [x] Build installer: `pnpm desktop:package:win`

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
- API smoke is now codified in `scripts/qa/smoke-api.mjs` and can be rerun on demand.
