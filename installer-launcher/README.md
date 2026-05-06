# HiroCrosshair installer launcher (Windows)

Bootstrapper wizard that runs the official **NSIS** `HiroCrosshair_*-setup.exe` next to this binary.

## Local build

From repo root:

```bash
npm run build:installer-launcher
```

Or inside this folder:

```bash
npm ci
npm run tauri build
```

Output: `src-tauri/target/release/HiroCrosshair-launcher.exe`

## Distribution layout

Ship **together** in the same folder:

- `HiroCrosshair_*-setup.exe` (from `npm run tauri build` in the main app)
- `HiroCrosshair-launcher.exe` (this project)

## Manual validation (E2E)

1. **Current user**: run launcher → install for current user → custom folder → toggle desktop shortcut → finish → Launch.
2. **All users**: choose “All users”, accept UAC, verify install under Program Files.
3. **Uninstall**: Windows Settings → Apps → HiroCrosshair → Uninstall (NSIS uninstaller).
