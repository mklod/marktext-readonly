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
- https://github.com/mklod/marktext-readonly (develop branch)

## Session Log

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

## Next
- [ ] Auto-start on login (tray always available)
- [ ] Custom app icon/name
- [ ] Strip unused heavy deps (mermaid 24MB, vega, etc.) for smaller build
- [ ] Installer with automatic file association setup
- [ ] Fix build toolchain (install Python, or create proper webpack stubs for native modules)
