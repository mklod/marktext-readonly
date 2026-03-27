// Last modified: 2026-03-27--0000
// READ-ONLY MODE: Only keep Find and Copy operations.
import * as actions from '../actions/edit'
import { COMMANDS } from '../../commands'

export default function (keybindings) {
  return {
    label: '&Edit',
    submenu: [{
      label: 'Copy',
      accelerator: keybindings.getAccelerator(COMMANDS.EDIT_COPY),
      click (menuItem, browserWindow) {
        actions.nativeCopy(browserWindow)
      }
    }, {
      label: 'Copy as Markdown',
      accelerator: keybindings.getAccelerator(COMMANDS.EDIT_COPY_AS_MARKDOWN),
      click (menuItem, browserWindow) {
        actions.editorCopyAsMarkdown(browserWindow)
      }
    }, {
      label: 'Copy as HTML',
      accelerator: keybindings.getAccelerator(COMMANDS.EDIT_COPY_AS_HTML),
      click (menuItem, browserWindow) {
        actions.editorCopyAsHtml(browserWindow)
      }
    }, {
      type: 'separator'
    }, {
      label: 'Select All',
      accelerator: keybindings.getAccelerator(COMMANDS.EDIT_SELECT_ALL),
      click (menuItem, browserWindow) {
        actions.editorSelectAll(browserWindow)
      }
    }, {
      type: 'separator'
    }, {
      label: 'Find',
      accelerator: keybindings.getAccelerator(COMMANDS.EDIT_FIND),
      click (menuItem, browserWindow) {
        actions.editorFind(browserWindow)
      }
    }, {
      label: 'Find Next',
      accelerator: keybindings.getAccelerator(COMMANDS.EDIT_FIND_NEXT),
      click (menuItem, browserWindow) {
        actions.editorFindNext(browserWindow)
      }
    }, {
      label: 'Find Previous',
      accelerator: keybindings.getAccelerator(COMMANDS.EDIT_FIND_PREVIOUS),
      click (menuItem, browserWindow) {
        actions.editorFindPrevious(browserWindow)
      }
    }, {
      type: 'separator'
    }, {
      label: 'Find in Folder',
      accelerator: keybindings.getAccelerator(COMMANDS.EDIT_FIND_IN_FOLDER),
      click (menuItem, browserWindow) {
        actions.findInFolder(browserWindow)
      }
    }]
  }
}
