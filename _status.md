# MarkText Viewer (Read-Only Mod) - Status

## Current Milestone
COMPLETE — Read-only markdown viewer, fast and functional.

## Portable Install Location
`C:\marktext-viewer\`

Source build recovered from: `D:\win10 clean install\marktext-viewer\`

### Key Files
| File | Purpose |
|---|---|
| `MarkText.exe` | Main Electron app. Cold start ~2.7s. Sits in system tray. |
| `marktext-open.exe` | Go launcher. Sends file path via named pipe in 1-2ms. |
| `marktext-open.js` | Node.js launcher (fallback if Go binary unavailable). |
| `marktext-open.cmd` | Batch wrapper for the Node.js launcher. |

### How It Works
1. **First launch**: `MarkText.exe` cold-starts (~2.7s), creates tray icon, starts named pipe server (`\\.\pipe\marktext-viewer`), pre-warms 1 hidden window.
2. **Subsequent opens**: `marktext-open.exe` connects to pipe, sends file path (1-2ms). The pre-warmed window loads the file and shows instantly. A new warm window is created in the background for the next open.
3. **All windows closed**: App stays resident in tray. Pipe server keeps listening.
4. **Quit**: Right-click tray icon → Quit.

## Windows File Association Setup (for fast double-click opens)

The critical piece: `.md` double-click must go through `marktext-open.exe` (pipe), NOT `MarkText.exe` (cold Electron start).

### How it's configured
Windows `UserChoice` for `.md` points to `Applications\MarkText.exe`, but we redirect that shell command to actually run `marktext-open.exe`:

```
HKCU\Software\Classes\Applications\MarkText.exe\shell\open\command
  (Default) = "C:\marktext-viewer\marktext-open.exe" "%1"
```

### To set this up on a fresh machine
```cmd
:: Register marktext-open.exe as the handler behind the MarkText.exe association
reg add "HKCU\Software\Classes\Applications\MarkText.exe\shell\open\command" /ve /t REG_SZ /d "\"C:\marktext-viewer\marktext-open.exe\" \"%1\"" /f

:: Then set .md files to open with "MarkText.exe" via Windows Settings → Default Apps,
:: or right-click any .md → Open With → Choose Another App → MarkText → Always
```

### To verify
```cmd
:: Should show: "C:\marktext-viewer\marktext-open.exe" "%1"
reg query "HKCU\Software\Classes\Applications\MarkText.exe\shell\open\command"

:: Should show: Applications\MarkText.exe
reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.md\UserChoice"
```

### Auto-start on login (optional)
To have the tray icon ready at boot, add a shortcut to `C:\marktext-viewer\MarkText.exe` in:
`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\`

## Performance
| Metric | Time |
|---|---|
| Go launcher → pipe send | 1-2ms |
| File load from disk | 2-50ms |
| Pool window show with content | instant |
| Cold start (first launch) | ~2.7s |

## Source Code (`L:\PROJECTS\marktext-mod\marktext-develop\`)

### Key modified files
- `src/main/app/index.js` — tray icon, named pipe server, ready-pool, no-quit on window-all-closed, openFilesInNewWindow=true
- `src/main/windows/editor.js` — close without save prompts
- `src/muya/lib/index.js` — contenteditable=false
- `electron-builder.yml` — npmRebuild=false
- `static/preference.json` — openFilesInNewWindow=true, startUpAction=blank
- `launcher/main.go` — Go launcher source (not built from this machine, no Go installed)

### Build issues (2026-04-02)
- **webpack `net` module**: Old working build used code-splitting webpack config that properly externalized `require("net")`. Current webpack.main.config.js bundles everything into one file and handles `net` differently. Source now uses `require('net')` with eslint-disable as workaround.
- **Native modules (node-gyp)**: `electron-builder` tries to rebuild `native-keymap`, `ced`, `keytar`, `fontmanager-redux`. Fails without Python + VS Build Tools. Fixed with `npmRebuild: false` in electron-builder.yml — these modules aren't needed (stubs/fallbacks handle it), but causes stderr noise on launch.
- **Recommendation**: Use the working build from `D:\win10 clean install\marktext-viewer\` until build toolchain is fully set up.

## Repo
- https://github.com/mklod/marktext-readonly (master branch)

## Session Log

### 2026-10-02
- **Big viewer-mod build deployed** (CHANGELOG Build 2026-10-02--0212):
  - accent-colour title bar, no word counter;
  - true reader clicks (no syntax reveal, no edit UI);
  - Ctrl+drag highlights; Ctrl+click opens links;
  - checkboxes save the single line to the file;
  - silent live reload keeping scroll;
  - Sumatra-style window layering;
  - size/position saved on every move.
- **How mods ship now:** `node patches/viewer-mods.js <extracted-asar>` on the watcher-fixed base, which adds `viewer-mod.{js,css}` (renderer) and `viewer-mod-main.js` (main). Renderer/main bundles only get small anchored patches. `marktext-develop/src` is NOT updated for these (build toolchain still broken); `patches/` is the source of truth.
- **Key decisions:**
  - Checkbox writes flip one character in the file. It never uses muya's save, which re-serialises and can reformat the whole doc. It refuses when the page and the file can't be matched 1:1.
  - The accent comes from the registry (`DWM\AccentColor` + `ColorPrevalence`), not Electron's `getAccentColor()`, which returns DWM's blended colour.
  - Cascade: +32/+32, then slide right only (tall windows have about 1 vertical step on the 1440 px screen), then wrap to the remembered spot.
- **Found & fixed:** the 2026-04-15 CSS override block never closed its braces, so it was mostly dead. Repaired it in `viewer-mod.css`, minus two rules: `.editor-component` padding breaks drag-selection, and td `nowrap` pushed tables off-screen.
- **Test tooling** (scratch, documented here for reuse):
  - CDP-driven test copy: launch with `--remote-debugging-port=9333`, drive it with `Input.dispatchMouseEvent` and `Runtime.evaluate`.
  - The pre-warmed (pipe) path can only be tested by renaming the pipe in the test copy (`marktext-viewer-test`). Never ship that build.
  - Gotchas: Chromium flips a checkbox's `checked` BEFORE click handlers run. App encoding is reported as `utf-8`. Bash heredocs in this harness mangle `\\`, so write JS test files with the Write tool.
- Window state answer for the user: before this build it saved one shared rect, only on close; now it saves on every move as well.
- **Afternoon fixes (user live-tested with `demo/live-demo.md`)**, each with a failing-first test:
  - Checkbox tick drawn instantly. muya draws it from the `ag-checkbox-checked` class, so the user's second click had been undoing the first.
  - No link hover pop-up: all `.ag-float-wrapper` popups are hidden.
  - **Live updates never worked for double-clicked docs.** The April pipe path never started a file watcher; it now opens through `_doOpenTab`.
  - Unknown `:codes:` such as the `:04:` in `14:04:55` are no longer coloured.
  - User confirmed: live edits appear in real time, layering and remembered position work, Ctrl+drag highlight and Ctrl+click links work.
- **Test-harness lessons:**
  - Cover the double-click (pipe) path explicitly (`pipelive.mjs`); the default launch path is a different code path.
  - Test-copy hangs only happened while CDP polled `/json/list` during window creation (0/8 without the debug port).
  - Don't redirect the app's stdout in `launch.ps1`: the child inherits the pipes and `execFileSync` waits forever.
- **Deploy recipe:**
  - Back up the asar (`.bak-<date><letter>`), kill the tray, copy, relaunch via the Startup `.lnk`, then poll the pipe.
  - Reopen the user's open docs (minimised ones first, then re-minimise) through `marktext-open.exe`.
  - Window titles give only basenames, so keep a name→path map.

### 2026-09-25
- **Fixed recurring crash dialog** "An unexpected error occurred in the main process — TypeError: Object has been destroyed" (chokidar unlink handler). Cause: file watchers leaked from natively-closed windows. Root cause is in CHANGELOG Build 2026-09-25--1336.
  - Source fix in `src/main/filesystem/watcher.js`; asar patch script `patches/watcher-destroyed-window.js` (reusable, asserts exact matches).
  - Deployed to `C:\marktext-viewer\resources\app.asar` (backup `app.asar.bak-2026-09-25`); tray instance restarted via Startup shortcut.
- **Test harness recipe** (isolated from the live instance): copy `C:\marktext-viewer\*` except `resources\app.asar` to a scratch dir, add the candidate asar, and launch with `--user-data-dir=<scratch>\ud`. Env `MARKTEXT_ERROR_INTERACTION=1` sends main-process errors to `ud\logs\*\main.log` instead of the modal. Opening a second file in its own window needs `--new-window`. The live instance holds the pipe name, so the harness's pipe server errors harmlessly.
  - **Seed `ud\window-state.json`** (550x350 at x=4570,y=1050) before launching. A blank profile centers windows on the ultrawide, right over the user's work.
- Asar notes: `@electron/asar extract-file` on Windows needs backslash paths (`'dist\electron\main.js'`). A repacked asar is ~10 MB smaller than the Apr-15 one, but a header comparison shows identical content (only main.js differs).

### 2026-04-15
- **Table rendering fixes** via asar binary patching (no source rebuild needed):
  - Patched `renderer.js`: flipped `disableHtml` default to `false` — enables `<br>` line breaks in table cells
  - Patched `renderer.js`: `case "br"` now renders bare `<br>` element (no visible `<br>` tag text)
  - Patched `renderer.js`: fullwidth asterisk U+FF0A → regular `*` at render time (eliminates CJK double-width spacing)
  - Patched `renderer.css`: full-width editor area (`--editorAreaWidth: 100%`), `table-layout: auto`, 2.5px solid header border, `nowrap` on data cells, first column allows wrapping
- **Foreground focus fix** — patched `main.js`: `bringToFront()` and pipe show use `setAlwaysOnTop(true)` → `focus()` → `setAlwaysOnTop(false)` after 100ms to bypass Windows focus-stealing prevention
- **Window state persistence** — patched `main.js`: pipe-opened pool windows read `window-state.json` and apply saved bounds before showing
- **Auto-start on login**: startup shortcut at `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MarkText Viewer.lnk`
- **Asar patch procedure**: extract with `npx asar extract`, modify files, repack with `npx asar pack` — no webpack/electron-builder needed
- **Git**: initialized repo, pushed to `origin/master`

### 2026-04-02
- Recovered working build from `D:\win10 clean install\marktext-viewer\` → deployed to `C:\marktext-viewer\`
- Synced source code (src/main/app/index.js) with working build's tray/pipe/pool implementation
- Set openFilesInNewWindow=true (hardcoded in _openPathList — every file = own window, no tabs)
- Set startUpAction=blank, added npmRebuild:false to electron-builder.yml
- Fixed Windows file association: redirected `Applications\MarkText.exe` shell command to `marktext-open.exe` so double-click goes through pipe (1ms) instead of cold Electron start (2.7s)
- Confirmed pipe opens at 1-2ms with tray resident

### 2026-03-27 to 2026-03-30
- Converted MarkText to read-only viewer (contenteditable=false, no save prompts)
- Stripped editing menus (Format, Paragraph removed; Edit=Copy+Find; File=Open+Export+Close)
- System tray with named pipe server for instant file opening
- Go launcher (marktext-open.exe, 1ms pipe send)
- Ready-pool: pre-warmed hidden window for instant opens
- Verified with automated tests + screenshots

## Next immediate task
- Custom app icon/name

## Backlog
- [ ] Custom app icon/name
- [ ] Strip unused heavy deps (mermaid 24MB, vega, etc.) for smaller build
- [ ] Installer with automatic file association setup
- [ ] Fix build toolchain (install Python, or create proper webpack stubs for native modules)
