# MarkText Viewer — Read-Only Mod

## Project Summary
Fork of MarkText (Electron markdown editor) stripped down to a lightweight read-only markdown viewer. Goal: open .md files as fast as SumatraPDF opens PDFs. Never prompt to save.

## Tech Stack
- Electron 18 + Vue.js (inherited from MarkText)
- Muya editor engine (set to contenteditable=false)
- System tray for persistent background process

## Key Files Modified
### Core read-only changes
- `src/main/windows/editor.js` — hide-to-tray on close, no save prompts
- `src/renderer/store/editor.js` — close/save logic neutralized
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

### System tray
- `src/main/app/index.js` — tray icon, hide-to-tray, don't quit on window-all-closed

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

### Stage 3: Speed Optimization — IN PROGRESS
- [x] Benchmarked: our build matches original MarkText speed
- [x] Implemented system tray mode (hide-to-tray on close)
- [x] Tray re-open benchmark: ~750ms (vs ~1000ms cold)
- [ ] Investigate content-ready time (not just window-visible)
- [ ] Consider named pipe / protocol handler to skip second-process launch
- [ ] Consider stripping heavy unused deps (mermaid 24MB, etc.)

### Stage 4: Polish & Ship — TODO
- [ ] Push all changes to git
- [ ] Build installer
- [ ] Custom app name/icon if desired
