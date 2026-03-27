// Last modified: 2026-03-27--0000
// READ-ONLY MODE: Context menu only has Copy.
import { Menu, MenuItem } from 'electron'
import {
  COPY,
  COPY_AS_MARKDOWN,
  COPY_AS_HTML,
  SEPARATOR
} from './menuItems'

const CONTEXT_ITEMS = [COPY, SEPARATOR, COPY_AS_MARKDOWN, COPY_AS_HTML]

export const showEditorContextMenu = (win, event, params, isSpellcheckerEnabled) => {
  const { selectionText } = params
  const hasText = selectionText && selectionText.trim().length > 0

  if (hasText) {
    const menu = new Menu()
    COPY.enabled = true
    COPY_AS_MARKDOWN.enabled = true
    COPY_AS_HTML.enabled = true
    CONTEXT_ITEMS.forEach(item => {
      menu.append(new MenuItem(item))
    })
    menu.popup([{ window: win, x: event.clientX, y: event.clientY }])
  }
}
