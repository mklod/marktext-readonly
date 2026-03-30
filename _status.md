# MarkText Viewer (Read-Only Mod) - Status

## Current Milestone
Speed optimization — system tray mode implemented and benchmarked.

## Completed This Session (2026-03-30)
- Stubbed native modules (ced, keytar, native-keymap, fontmanager) at webpack compile time — eliminates runtime filesystem probing
- Disabled spellcheck in webPreferences for faster renderer init
- Implemented minimize-to-tray: window hides on close, app stays resident
- Tray icon with Show/Quit context menu, double-click to show
- Second-instance file opening works (existing MarkText single-instance support)
- Benchmarked: cold start 1000ms, tray re-open ~750ms
- Confirmed our build matches original MarkText speed (both ~1.2s cold)

## Benchmark Results
| Test | Time |
|---|---|
| Cold start (with file) | ~1000ms |
| Tray re-open #1 | ~720ms |
| Tray re-open #2 | ~789ms |
| Original MarkText cold | ~1200ms |

## Current Bottleneck
Warm re-open is ~750ms because launching a second Electron process (just to pass the file path via single-instance IPC) costs ~600ms. Possible next steps:
- File watcher / named pipe listener to avoid launching a second process
- Custom protocol handler (marktext://) for instant file opening
- Or accept ~750ms as Electron's floor and ship

## Next Immediate Task
- Decide: accept 750ms or pursue named-pipe/protocol approach
- Push tray changes to git
- Build installer with tray support

## Blockers
- Electron's inherent startup cost (~600ms) is the hard floor for second-instance handoff
