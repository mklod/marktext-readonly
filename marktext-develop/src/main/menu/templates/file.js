// Last modified: 2026-03-27--0000
// READ-ONLY MODE: Stripped save/edit/new items. Open, Export, Print, Close, Quit only.
import { app } from 'electron'
import * as actions from '../actions/file'
import { userSetting } from '../actions/marktext'
import { isOsx } from '../../config'

export default function (keybindings, userPreference, recentlyUsedFiles) {
  const fileMenu = {
    label: '&File',
    submenu: [{
      label: 'Open File...',
      accelerator: keybindings.getAccelerator('file.open-file'),
      click (menuItem, browserWindow) {
        actions.openFile(browserWindow)
      }
    }, {
      label: 'Open Folder...',
      accelerator: keybindings.getAccelerator('file.open-folder'),
      click (menuItem, browserWindow) {
        actions.openFolder(browserWindow)
      }
    }]
  }

  if (!isOsx) {
    const recentlyUsedMenu = {
      label: 'Open Recent',
      submenu: []
    }

    for (const item of recentlyUsedFiles) {
      recentlyUsedMenu.submenu.push({
        label: item,
        click (menuItem, browserWindow) {
          actions.openFileOrFolder(browserWindow, menuItem.label)
        }
      })
    }

    recentlyUsedMenu.submenu.push({
      type: 'separator',
      visible: recentlyUsedFiles.length > 0
    }, {
      label: 'Clear Recently Used',
      enabled: recentlyUsedFiles.length > 0,
      click (menuItem, browserWindow) {
        actions.clearRecentlyUsed()
      }
    })
    fileMenu.submenu.push(recentlyUsedMenu)
  } else {
    fileMenu.submenu.push({
      role: 'recentdocuments',
      submenu: [
        {
          role: 'clearrecentdocuments'
        }
      ]
    })
  }

  fileMenu.submenu.push({
    type: 'separator'
  }, {
    label: 'Export',
    submenu: [
      {
        label: 'HTML',
        click (menuItem, browserWindow) {
          actions.exportFile(browserWindow, 'styledHtml')
        }
      }, {
        label: 'PDF',
        click (menuItem, browserWindow) {
          actions.exportFile(browserWindow, 'pdf')
        }
      }
    ]
  }, {
    label: 'Print',
    accelerator: keybindings.getAccelerator('file.print'),
    click (menuItem, browserWindow) {
      actions.printDocument(browserWindow)
    }
  }, {
    type: 'separator',
    visible: !isOsx
  }, {
    label: 'Preferences...',
    accelerator: keybindings.getAccelerator('file.preferences'),
    visible: !isOsx,
    click () {
      userSetting()
    }
  }, {
    type: 'separator'
  }, {
    label: 'Close Tab',
    accelerator: keybindings.getAccelerator('file.close-tab'),
    click (menuItem, browserWindow) {
      actions.closeTab(browserWindow)
    }
  }, {
    label: 'Close Window',
    accelerator: keybindings.getAccelerator('file.close-window'),
    click (menuItem, browserWindow) {
      actions.closeWindow(browserWindow)
    }
  }, {
    type: 'separator',
    visible: !isOsx
  }, {
    label: 'Quit',
    accelerator: keybindings.getAccelerator('file.quit'),
    visible: !isOsx,
    click: app.quit
  })
  return fileMenu
}
