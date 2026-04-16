# MarkText Viewer — Read-Only Mod

## Project Summary
Fork of MarkText (Electron markdown editor) stripped down to a lightweight read-only markdown viewer. Goal: open .md files as fast as SumatraPDF opens PDFs. Never prompt to save.

## Tech Stack
- Electron 18 + Vue.js (inherited from MarkText)
- Muya editor engine (set to contenteditable=false)
- Go launcher + named pipe for instant file opening
- System tray with ready-pool of pre-warmed windows

## Key Files Modified

### Core read-only changes
- `src/main/windows/editor.js` — close windows normally, no save prompts
- `src/renderer/store/editor.js` — close/save logic neutralized, viewer-swap listener
- `src/muya/lib/index.js` — contenteditable=false, disabled keyboard/clipboard/drag
- `src/main/config.js` — spellcheck disabled in webPreferences

### Menu stripping
- `src/main/menu/templates/edit.js` — Copy/Find only
- `src/main/menu/templates/format.js` — removed
- `src/main/menu/templates/paragraph.js` — removed
- `src/main/menu/templates/file.js` — Open/Export/Print/Close only
- `src/main/contextMenu/editor/index.js` — Copy only

### Speed: tray + named pipe + ready-pool
- `src/main/app/index.js` — tray icon, named pipe server, ready-pool, don't quit on window-all-closed, openFilesInNewWindow=true hardcoded
- `launcher/main.go` — Go binary (2.3MB) sends file path to pipe in 1ms

### Asar binary patches (deployed build only)
- `dist/electron/renderer.js` — disableHtml=false, `<br>` renders bare element, fullwidth asterisk→regular
- `dist/electron/renderer.*.css` — full-width editor, table styling, header borders

### Supporting changes
- `src/main/menu/index.js` — null guards for removed menu items
- `src/main/menu/actions/format.js` — null guard
- `src/main/menu/actions/paragraph.js` — null guard
- `src/main/menu/templates/index.js` — filter(Boolean) for null menus
- `src/main/globalSetting.js` — perf logging
- `src/renderer/components/titleBar/index.vue` — "MarkText Viewer" title
- `src/renderer/components/editorWithTabs/editor.vue` — viewer-swap handler
- `src/renderer/store/preferences.js` — hideQuickInsertHint=true, openFilesInNewWindow=true
- `electron-builder.yml` — npmRebuild=false, buildDependenciesFromSource=false
- `static/preference.json` — openFilesInNewWindow=true, startUpAction=blank

## Performance
| Metric | Time |
|---|---|
| Go launcher → pipe send | 1-2ms |
| File load from disk | 2-50ms |
| Pool window show with content | instant |
| Cold start (first launch) | ~2.7s |

## Stages

### Stage 1: Core Read-Only Mode — COMPLETE
- [x] Disable save prompts on close
- [x] contenteditable=false
- [x] Strip editing menus
- [x] Disable spellchecker
- [x] Always report saved state

### Stage 2: Build & Native Module Fixes — COMPLETE
- [x] Build on Win10 without VS Build Tools
- [x] Webpack compile-time stubs for native modules
- [x] Runtime guards for windowManager destroyed objects

### Stage 3: Speed Optimization — COMPLETE
- [x] System tray mode — app stays resident in background
- [x] Named pipe server replaces Electron second-instance IPC
- [x] Go launcher (1ms) replaces launching full Electron process (600ms)
- [x] Ready-pool: pre-warmed hidden window for instant file opens
- [x] Multi-window: each file opens in its own window, no blank screens

### Stage 4: Ship — COMPLETE
- [x] Portable build at C:\marktext-viewer\
- [x] Windows file association via registry redirect
- [x] Auto-start on login

### Stage 5: Table Rendering — COMPLETE
- [x] Full-width editor area (tables fill window)
- [x] `<br>` line breaks in table cells
- [x] Hidden `<br>` tag markup (bare element rendering)
- [x] Fullwidth asterisk normalization
- [x] Solid header border, nowrap data cells

### Stage 6: Polish — IN PROGRESS
- [x] Force opened window to foreground (setAlwaysOnTop trick)
- [x] Window remembers size/position (read window-state.json on pool show)
- [ ] Custom app icon/name
- [ ] Strip unused heavy deps (mermaid 24MB, vega, etc.) for smaller build
- [ ] Installer with automatic .md file association setup
- [ ] Fix build toolchain (install Python, or create proper webpack stubs for native modules)
