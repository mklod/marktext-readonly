# MarkText Viewer — Changelog

## Build 2026-03-27--0000 (pending)

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

### Testing Checklist
- [ ] App launches without errors
  - Notes:
- [ ] Opens .md file from File > Open
  - Notes:
- [ ] Opens .md file from command line argument
  - Notes:
- [ ] Renders markdown correctly (headings, lists, code, tables, images)
  - Notes:
- [ ] Cannot type/edit in the document
  - Notes:
- [ ] Closes instantly without save prompt (window X button)
  - Notes:
- [ ] Closes instantly without save prompt (Ctrl+W / close tab)
  - Notes:
- [ ] Closes instantly without save prompt (Alt+F4)
  - Notes:
- [ ] No Format or Paragraph menus visible
  - Notes:
- [ ] Edit menu only has Copy, Find items
  - Notes:
- [ ] File menu has no Save/New/Import items
  - Notes:
- [ ] Right-click context menu only shows Copy
  - Notes:
- [ ] Sidebar folder browsing works
  - Notes:
- [ ] Theme switching works
  - Notes:
- [ ] No console errors or crashes
  - Notes:
