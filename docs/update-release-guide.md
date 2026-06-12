# Dinox Update Release Guide

Dinox launcher checks a hosted `latest.yml` file and compares its `version` with the installed app version. If a newer version exists, the launcher shows an update card and opens the release/download page when the user clicks `Update now`.

## Runtime configuration

The packaged app checks this feed by default:

```text
https://github.com/JapanDino/Dinox/releases/latest/download/latest.yml
```

Set these environment variables only if you need to override the default release location:

```powershell
$env:DINOX_UPDATE_URL="https://github.com/<owner>/<repo>/releases/latest/download/latest.yml"
$env:DINOX_RELEASE_URL="https://github.com/<owner>/<repo>/releases/latest"
```

`DINOX_RELEASE_URL` is optional. If it is not set, Dinox derives a release page URL from `DINOX_UPDATE_URL`.

## Release artifacts

The Windows release should publish these files from `release/`:

- `Dinox-Setup-<version>.exe`
- `latest.yml`

`latest.yml` is the launcher update index. It must be reachable at `DINOX_UPDATE_URL`.
Upload a `.blockmap` only if the build regenerated one for the same installer.

## Manual GitHub release flow

1. Update `version` in `package.json`.
2. Run the production installer build:

   ```powershell
   pnpm desktop:package:win
   ```

3. Confirm the artifacts exist:

   ```powershell
   Get-ChildItem release
   ```

4. Create a GitHub Release tagged as `v<version>`.
5. Upload the three release artifacts listed above.
6. Publish the release.
7. Install an older Dinox build and start it with `DINOX_UPDATE_URL` pointing at the published `latest.yml`.
8. The launcher should show the new version card before opening the calendar.

## Notes

- The current launcher performs update discovery and opens the release/download page. It does not silently download and replace the app.
- Full in-app auto-install would require adding `electron-updater` and wiring its download/install events into `desktop/launcher-window.cjs`.
- Keep the artifact names in `latest.yml` matching the files uploaded to the release.
