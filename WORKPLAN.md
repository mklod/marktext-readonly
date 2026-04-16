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

### Native module stubs (webpack compile-time)
- `src/stubs/ced.js` — UTF-8 stub
- `src/stubs/keytar.js` — no-op credential storage
- `src/stubs/native-keymap.js` — US keyboard stub
- `src/stubs/fontmanager-redux.js` — empty font list
- `.electron-vue/webpack.main.config.js` — alias stubs, exclude from externals
- `.electron-vue/webpack.renderer.config.js` — fontmanager stub

### Speed: tray + named pipe + ready-pool
- `src/main/app/index.js` — tray icon, named pipe server, ready-pool, don't quit on window-all-closed
- `launcher/main.go` — Go binary (2.3MB) sends file path to pipe in 1ms

### Supporting changes
- `src/main/menu/index.js` — null guards for removed menu items
- `src/main/menu/actions/format.js` — null guard
- `src/main/menu/actions/paragraph.js` — null guard
- `src/main/menu/templates/index.js` — filter(Boolean) for null menus
- `src/main/globalSetting.js` — perf logging
- `src/renderer/components/titleBar/index.vue` — "MarkText Viewer" title
- `src/renderer/components/editorWithTabs/editor.vue` — viewer-swap handler
- `src/renderer/store/preferences.js` — hideQuickInsertHint=true
- `electron-builder.yml` — npmRebuild=false, buildDependenciesFromSource=false

## Performance
| Metric | Time |
|---|---|
| Go launcher → pipe send | 1ms |
| File load from disk | 2-17ms |
| Pool window show with content | instant |
| Cold start (first launch) | ~2-3s |

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
- [x] Benchmarked: our build matches original MarkText speed (~1.2s cold)
- [x] System tray mode — app stays resident in background
- [x] Named pipe server replaces Electron second-instance IPC
- [x] Go launcher (1ms) replaces launching full Electron process (600ms)
- [x] Ready-pool: pre-warmed hidden window for instant file opens
- [x] Multi-window: each file opens in its own window, no blank screens
- [x] Verified with automated tests + screenshot verification (3/3 runs pass)

### Stage 4: Ship — COMPLETE
- [x] All changes pushed to git (10 commits on develop)
- [x] Portable build at C:\tools\marktext-viewer\
- [x] Installer build tested

### Stage 5: Future Polish — TODO (if needed)
- [ ] Custom app icon/name
- [ ] Strip unused heavy deps (mermaid 24MB, vega, etc.) for smaller build
- [ ] Installer with automatic .md file association setup
- [ ] Auto-start on login (so tray is always available)
