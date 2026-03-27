# MarkText Viewer (Read-Only Mod) - Status

## Current Milestone
Read-only viewer mode — initial implementation complete.

## Completed This Session (2026-03-27)
- Disabled save prompts on window/tab close (force-close always)
- Made editor read-only (contenteditable=false, disabled keyboard/clipboard/drag handlers)
- Stripped editing menus (removed Format, Paragraph menus; stripped Edit to Copy/Find only; removed Save/New/Import from File menu)
- Added null guards for menu update functions that reference removed menus
- Simplified context menu to Copy only
- Disabled spellchecker initialization for faster startup
- Forced hideQuickInsertHint=true
- Always report isSaved=true (no dirty state)
- Updated title bar to say "MarkText Viewer"
- Removed rename-on-click from title bar

## Next Immediate Task
- Build and test the modified app on Win10
- Verify: opens markdown files, renders them, closes instantly without prompts
- Check for any runtime errors from disabled subsystems

## Blockers
- None known. Need to verify `yarn install` and build work on this machine.
