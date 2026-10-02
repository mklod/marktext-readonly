# MarkText Viewer — Changelog

## TODO
> [!tip] Queued for next build
> - Custom app icon/name
> - Strip unused heavy deps (mermaid 24MB, vega, etc.) for smaller build
> - Installer with automatic .md file association setup

## Build 2026-10-02--0212

### Changes
- **Title bar = native Win10 look**: painted in the Settings accent colour (registry `DWM\AccentColor`, `#018574`) while focused, white text/icons, red close hover; dark when unfocused. Follows the "accent on title bars" setting and theme changes. (Electron's `getAccentColor()` returns DWM's blended `#017b6b`, so it is only a fallback.)
- **Word/char/paragraph counter removed** from the title bar.
- **Reader behaviour**: clicks no longer place muya's cursor, so no `**`/`#`/link syntax appears, nothing jumps, and the table/image/code tools and floating format bar never show. Drag-select + Ctrl+C still work.
- **Ctrl+drag highlights** text (viewer only, never written); Ctrl+click a highlight removes it; highlights survive reloads. **Ctrl+click opens links** (handled directly, no syntax reveal).
- **Checkboxes save to the file**: a click flips exactly that one `[ ]`↔`[x]` line. Refuses (with a notice, file untouched) when the page's checkboxes can't be matched 1:1 with the file's task lines.
- **Live update**: files changed on disk (Claude Code edits, checkbox ticks) reload silently, keep scroll position, and clear stale "changed/removed on disk" bars.
- **Window layering like SumatraPDF**: each new doc opens one title bar (32 px) down/right of the most recently used viewer window, same size; slides right when there's no room below; wraps to the remembered spot at the right edge.
- **Remembered size/position** saved on every move/resize/(un)maximise and on close, not only on close, so restarts/crashes keep it; hidden pre-warmed windows never overwrite it.
- **Repaired 2026-04-15 CSS** (it had no closing braces, so only its first rule ever applied). Dropped two of its rules in the process: `.editor-component` padding (breaks drag-selection) and table-cell `nowrap` (pushed prose tables off-screen).
- Patch files: `patches/viewer-mods.js` (asserts every replacement matches once) + `patches/viewer-mod/{viewer-mod.js, viewer-mod.css, viewer-mod-main.js}`. Applies on top of `watcher-destroyed-window.js`.
- Backups: `app.asar.bak-2026-10-02` (pre-mods, watcher fix only), `app.asar.bak-2026-10-02b` (first mod deploy, before layering).

### Testing Checklist
> [!warning] Testing Checklist
> - [x] Automated (test copy over CDP, 34 checks): accent bar focused/unfocused, counter hidden, bold click changes nothing (fails on unmodified build = valid test), drag-select works, no format bar, Ctrl+drag highlight + survives reload + Ctrl+click removes, checkbox flips exactly one line and restores byte-for-byte, quoted task OK / fenced fake task ignored / mismatch refused, live edit reload keeps scroll, links plain vs Ctrl+click, table CSS, 7-window cascade incl. slide + wrap on both open paths, save-on-move, survives kill
> - [ ] Click into a viewer window: title bar turns teal; click elsewhere: goes dark
>   - Notes:
> - [ ] Tick/untick a box in `CalibReader\release_todo.md`; Claude Code / Obsidian see the change
>   - Notes:
> - [ ] Ctrl+drag to highlight a sentence; Ctrl+click it to remove
>   - Notes:
> - [ ] Keep a doc open while a CC session edits it: updates in place, scroll stays
>   - Notes:
> - [ ] Open 3 docs: they fan out from where you last left a window; move one, close all, open one: it's back where you moved it
>   - Notes:
> - [ ] Wide tables (e.g. ASO doc) wrap instead of running off the right edge
>   - Notes:

## Build 2026-09-25--1336

### Changes
- **Fixed main-process crash** `TypeError: Object has been destroyed` (error dialog pointing at `main.js:2:250188` / chokidar `index.js:581`). Hit 4x on 2026-09-25 alone.
  - Root cause: read-only mode closes windows natively, so `Watcher.unwatchByWindowId()` ran after the BrowserWindow was destroyed; `w.win.id` threw, `windowManager` swallowed it, and the file watcher leaked. Every later cleanup then aborted on that stale entry, so leaks piled up. Deleting/renaming a file that had ever been open made the leaked `unlink` handler touch the dead window's `webContents`.
  - Fix: capture window id at watch time (`winId`) and match on it in `unwatchByWindowId`; all watcher sends go through a `send()` guard that skips destroyed windows.
  - Source: `src/main/filesystem/watcher.js`. Deployed as asar patch: `node patches/watcher-destroyed-window.js <extracted>/dist/electron/main.js` (asserts each of 11 sites matches exactly once).
  - Backup of previous deployed asar: `C:\marktext-viewer\resources\app.asar.bak-2026-09-25`

### Testing Checklist
> [!warning] Testing Checklist
> - [x] Repro on unmodified app copy: open file → close window → delete file → identical crash stack
>   - Notes: isolated copy + separate --user-data-dir; error logged via MARKTEXT_ERROR_INTERACTION=1
> - [x] Same repro on patched copy (delete + atomic replace): no crash
>   - Notes: root-cause fix alone (step 1) already passes; guards added on top
> - [x] Two windows: close A, delete A's file, edit B → no crash, B still gets the "changed on disk" bar
>   - Notes: proves B's watcher survives A's cleanup
> - [x] Deployed asar hash == tested asar; tray restart silent, pipe listening, 0 visible windows
> - [ ] Normal use for a day: no more "unexpected error in the main process" dialogs
>   - Notes:

## Build 2026-04-15--2223

### Changes
- **Table rendering** — asar binary patches (no source rebuild):
  - Full-width editor area (`--editorAreaWidth: 100%`) — tables fill window
  - `table-layout: auto`, 2.5px solid header border, `nowrap` on data cells, first column wraps
  - Enabled HTML in table cells (`disableHtml` default → `false`) — `<br>` line breaks work
  - `<br>` tag renders as bare line break (no visible `<br>` markup)
  - Fullwidth asterisk U+FF0A → regular `*` at render time (no CJK double-width spacing)
- **Foreground focus** — `bringToFront()` and pipe-show use `setAlwaysOnTop` trick to bypass Windows focus-stealing prevention
- **Window state persistence** — pipe-opened pool windows read `window-state.json` and apply saved bounds before showing
- **Auto-start on login** — startup shortcut in `%APPDATA%\...\Startup\`
- **Portable install** redeployed to `C:\marktext-viewer\` from `D:\win10 clean install\marktext-viewer\`
- **File association** — `Applications\MarkText.exe` shell command redirected to `marktext-open.exe` for fast pipe-based opens
- **openFilesInNewWindow=true** hardcoded — every file opens in its own window, no tabs
- **Git repo** initialized, pushed to `origin/master`

### Asar Patch Procedure
```bash
npx asar extract "C:\marktext-viewer\resources\app.asar" /tmp/marktext-asar-patch
# edit files in /tmp/marktext-asar-patch/dist/electron/
npx asar pack /tmp/marktext-asar-patch "C:\marktext-viewer\resources\app.asar"
```

Patched files:
- `dist/electron/renderer.js` — disableHtml, br case, fullwidth asterisk
- `dist/electron/renderer.*.css` — table/width overrides appended at end

### Testing Checklist
> [!warning] Testing Checklist
> - [x] Tables fill window width on resize
>   - Notes: Confirmed with bloodwork-comparison-2026-04-10.md
> - [x] `<br>` renders as line break in table cells (no visible tag)
>   - Notes: Units (ng/dL) appear on second line below biomarker name
> - [x] Fullwidth asterisks ＊＊＊ render tight (no spacing)
>   - Notes: Converted to regular * at render time
> - [x] Table header has solid border
>   - Notes: 2.5px solid currentColor
> - [x] Double-click .md opens fast via pipe
>   - Notes: 1-2ms via marktext-open.exe
> - [x] Auto-start on login works
>   - Notes: Startup shortcut created
> - [ ] Opened window always comes to foreground
>   - Notes: Sometimes opens behind other windows

## Build 2026-03-27--0000

### Changes
- Converted MarkText editor to read-only viewer mode
- Window/tab close always force-closes without save prompts
- Editor set to contenteditable=false; keyboard, clipboard, drag-drop handlers disabled
- Removed Format and Paragraph menus entirely
- Stripped Edit menu to Copy + Find operations only
- Stripped File menu of Save, New, Import, Rename, Move items
- Context menu reduced to Copy only
- Disabled spellchecker initialization
- Quick insert hint always hidden
- Save status always reports "saved" (no dirty dot)
- Title bar shows "MarkText Viewer"
- System tray + named pipe server + ready-pool for instant file opens
- Go launcher (marktext-open.exe) for 1ms pipe-based opens
