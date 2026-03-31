# MarkText Viewer (Read-Only Mod) - Status

## Current Milestone
COMPLETE — Read-only markdown viewer, fast and functional.

## Completed (2026-03-27 to 2026-03-30)
- Converted MarkText to read-only viewer (contenteditable=false, no save prompts)
- Stripped editing menus (Format, Paragraph removed; Edit=Copy+Find; File=Open+Export+Close)
- Webpack compile-time stubs for native modules (no VS Build Tools needed)
- System tray with named pipe server for instant file opening
- Go launcher (marktext-open.exe, 1ms pipe send) replaces Electron second-instance
- Ready-pool: pre-warmed hidden window for instant second-file open
- Each file opens in its own window, no blank screens
- Verified with automated tests + screenshots

## Performance
- Pipe launcher: 1ms
- File load: 2-17ms
- Window show (from pool): instant
- Cold start: ~2-3s (Electron boot + Vue/Muya init)

## Portable Install
- `C:\tools\marktext-viewer\`
- File association: `C:\tools\marktext-viewer\marktext-open.exe`

## Repo
- https://github.com/mklod/marktext-readonly (develop branch)

## Next (if needed)
- Custom app icon/name
- Strip unused heavy deps (mermaid 24MB, vega, etc.) for smaller build
- Installer with file association auto-setup
