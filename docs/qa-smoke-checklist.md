# Dinox QA Smoke Checklist

Date: 2026-03-08 (Europe/Moscow)
Branch: `J-D/qa-ui-smoke`

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

## UI Smoke on `next start` (Completed)
- [x] Verify month/week/day/agenda switching
- [x] Create item via `New` modal
- [x] Search by title
- [x] Edit item and set status `DONE`
- [x] Confirm item delete from UI
- [x] Validate URL sync for `view/date/q`

## Packaged EXE Smoke (Pending)
- [ ] Launch `release/win-unpacked/Dinox.exe`
- [ ] Verify project filter show/hide and `Only`
- [ ] Verify tag filter on/off in packaged runtime
- [ ] Verify slot-click quick create in packaged runtime
- [ ] Restart app and confirm data persistence in `%APPDATA%/Dinox/dinox.db`

## Notes
- In this sandbox, direct packaged-GUI runtime validation is still limited.
- `next/font/google` was removed in favor of local font stacks so offline/restricted builds succeed.
- API smoke remains codified in `scripts/qa/smoke-api.mjs`.
