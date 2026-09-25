// Last modified: 2026-09-25--1340
// Asar patch for dist/electron/main.js — fixes main-process crash
// "TypeError: Object has been destroyed" from the chokidar unlink handler.
//
// Root cause: read-only mode lets windows close natively, so by the time
// "window-closed" fires the BrowserWindow is destroyed. Watcher.unwatchByWindowId()
// read `w.win.id`, which throws on a destroyed window; windowManager swallowed the
// throw, so the file watcher leaked (and every later cleanup aborted on the same
// stale entry). When the file was later deleted/renamed, the leaked watcher's
// unlink handler touched `win.webContents` on the dead window -> uncaught exception.
//
// Mirrors the source fix in marktext-develop/src/main/filesystem/watcher.js.
//
// Usage: node watcher-destroyed-window.js <path/to/extracted/dist/electron/main.js> [--step1-only]
const fs = require('fs')

const file = process.argv[2]
const step1Only = process.argv.includes('--step1-only')
if (!file) {
  console.error('usage: node watcher-destroyed-window.js <main.js> [--step1-only]')
  process.exit(1)
}

let src = fs.readFileSync(file, 'utf8')

// Each [from, to] must match exactly once.
const replacements = [
  // --- step 1: root cause — capture the window id while the window is alive ---
  ['o=C(),s=Rn().watch(n,{', 'o=C(),_wid=e.id,s=Rn().watch(n,{'],
  ['_shouldIgnoreEvent(e.id,n,r,i)', '_shouldIgnoreEvent(_wid,n,r,i)'],
  ['_shouldIgnoreEvent(e.id,t,r,i)', '_shouldIgnoreEvent(_wid,t,r,i)'],
  ['this.watchers[o]={win:e,watcher:s,', 'this.watchers[o]={win:e,winId:_wid,watcher:s,'],
  ['i.win.id===e&&(t.push(i.watcher)', 'i.winId===e&&(t.push(i.watcher)']
]

if (!step1Only) {
  // --- step 2: defense in depth — never send to a destroyed window from a watcher
  // callback (async handlers can resume after the window closed mid-await).
  replacements.push(
    ['c.data=e}catch(t){if("file"===r)return void e.webContents.send(', 'c.data=e}catch(t){if("file"===r)return void(e.isDestroyed()||e.webContents.send('],
    ['message:t.message})}e.webContents.send(Sn[r],{type:"add",change:c})', 'message:t.message}))}e.isDestroyed()||e.webContents.send(Sn[r],{type:"add",change:c})'],
    ['data:await be(t,r,i,o)};e.webContents.send("mt::update-file",{type:"change",change:n})}catch(t){"file"===n&&e.webContents.send(', 'data:await be(t,r,i,o)};e.isDestroyed()||e.webContents.send("mt::update-file",{type:"change",change:n})}catch(t){"file"===n&&!e.isDestroyed()&&e.webContents.send('],
    ['const r={pathname:t};e.webContents.send(Sn[n],{type:"unlink",change:r})', 'const r={pathname:t};e.isDestroyed()||e.webContents.send(Sn[n],{type:"unlink",change:r})'],
    ['folders:[],files:[]};e.webContents.send("mt::update-object-tree",{type:"addDir",change:i})', 'folders:[],files:[]};e.isDestroyed()||e.webContents.send("mt::update-object-tree",{type:"addDir",change:i})'],
    ['const r={pathname:t};e.webContents.send("mt::update-object-tree",{type:"unlinkDir",change:r})', 'const r={pathname:t};e.isDestroyed()||e.webContents.send("mt::update-object-tree",{type:"unlinkDir",change:r})']
  )
}

for (const [from, to] of replacements) {
  const count = src.split(from).length - 1
  if (count !== 1) {
    console.error(`FAIL: expected 1 match, found ${count}: ${from}`)
    process.exit(2)
  }
  src = src.replace(from, () => to)
}

fs.writeFileSync(file, src)
console.log(`patched ${replacements.length} sites in ${file}`)
