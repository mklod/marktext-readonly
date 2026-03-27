# MarkText Viewer — Read-Only Mod

## Project Summary
Fork of MarkText (Electron markdown editor) stripped down to a lightweight read-only markdown viewer. Goal: open .md files as fast as SumatraPDF opens PDFs. Never prompt to save.

## Tech Stack
- Electron + Vue.js (inherited from MarkText)
- Muya editor engine (set to contenteditable=false)

## Key Files Modified
- `src/main/windows/editor.js` — window close handler (force close)
- `src/renderer/store/editor.js` — close/save logic neutralized
- `src/muya/lib/index.js` — contenteditable=false, disabled keyboard/clipboard/drag
- `src/main/menu/templates/edit.js` — stripped to Copy/Find only
- `src/main/menu/templates/format.js` — returns null (removed)
- `src/main/menu/templates/paragraph.js` — returns null (removed)
- `src/main/menu/templates/file.js` — stripped save/new/import items
- `src/main/menu/templates/index.js` — filter(Boolean) for null menus
- `src/main/menu/index.js` — null guards for removed menu items
- `src/main/menu/actions/format.js` — null guard
- `src/main/menu/actions/paragraph.js` — null guard
- `src/main/contextMenu/editor/index.js` — copy-only context menu
- `src/main/app/index.js` — disabled spellchecker init
- `src/renderer/store/preferences.js` — hideQuickInsertHint=true
- `src/renderer/components/titleBar/index.vue` — "MarkText Viewer" title, no rename

## Stages

### Stage 1: Core Read-Only Mode — COMPLETE
- [x] Disable save prompts on close
- [x] contenteditable=false
- [x] Strip editing menus
- [x] Disable spellchecker
- [x] Always report saved state

### Stage 2: Build & Test — TODO
- [ ] Build on Win10
- [ ] Test opening files, closing, folder sidebar
- [ ] Verify no runtime errors

### Stage 3: Optional Polish — TODO
- [ ] Consider removing source code mode toggle (editing feature)
- [ ] Consider stripping more unused dependencies for smaller build
- [ ] Custom app icon/name if desired
