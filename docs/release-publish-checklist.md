# Dinox Release Publish Checklist

## Preconditions
- [x] `pnpm lint`
- [x] `pnpm build`
- [x] `pnpm qa:smoke:api`
- [x] Installer artifacts present in `release/`

## Artifacts to Upload
- `release/Dinox-Setup-<version>.exe`
- `release/latest.yml`

## GitHub Release Steps
1. Push release branch and open PR.
2. Merge PR into `main` after review.
3. Create a GitHub Release tag `v<version>` from `main`.
4. Copy content from `docs/release-notes.md` into release description.
5. Attach all files listed in "Artifacts to Upload".
6. Publish release.

## Post-Publish Quick Checks
- Download and install `Dinox-Setup-<version>.exe` on clean Windows profile.
- Launch app and verify DB path is `%APPDATA%/Dinox/dinox.db`.
- Run CRUD smoke manually in UI (month/week/day/agenda).
- Install the previous version and launch it with `DINOX_UPDATE_URL` pointed at published `latest.yml`; verify the launcher shows the update card.

See `docs/update-release-guide.md` for the full update release flow.
