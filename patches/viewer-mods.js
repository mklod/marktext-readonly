// Last modified: 2026-10-02--0123
// Asar patch: MarkText Viewer reader mods (see patches/viewer-mod/).
//   - renderer.js: reload silently when the file changes on disk, keep scroll
//     position, clear stale "changed/removed on disk" notices on reload
//   - index.html: load viewer-mod.css / viewer-mod.js after the renderer bundle
//   - renderer.<hash>.css: remove the 2026-04-15 override block (it had no closing
//     braces); a repaired copy lives in viewer-mod.css
//
// Run on a freshly extracted asar (every replacement must match exactly once):
//   node viewer-mods.js <extracted-asar-root>
const fs = require('fs')
const path = require('path')

const root = process.argv[2]
if (!root) {
  console.error('usage: node viewer-mods.js <extracted-asar-root>')
  process.exit(1)
}
const dir = path.join(root, 'dist', 'electron')
const modDir = path.join(__dirname, 'viewer-mod')

const patchFile = (file, replacements) => {
  let src = fs.readFileSync(file, 'utf8')
  for (const [from, to] of replacements) {
    const count = src.split(from).length - 1
    if (count !== 1) {
      console.error(`FAIL ${path.basename(file)}: expected 1 match, found ${count}: ${from.slice(0, 120)}`)
      process.exit(2)
    }
    src = src.replace(from, () => to)
  }
  fs.writeFileSync(file, src)
  console.log(`patched ${replacements.length} sites in ${path.basename(file)}`)
}

// --- renderer.js ---------------------------------------------------------------
patchFile(path.join(dir, 'renderer.js'), [
  // LISTEN_FOR_FILE_CHANGE: a viewer has no local edits to lose -> always reload.
  [
    'case"add":case"change":{const{autoSave:o}=i.preferences;',
    'case"add":case"change":{return void e("LOAD_CHANGE",r);const{autoSave:o}=i.preferences;'
  ],
  // LOAD_CHANGE: drop stale "changed/removed on disk" notices (atomic saves can
  // briefly look like a delete).
  [
    'h.notifications=f,',
    'h.notifications=f.filter((e=>"file_changed"!==e.exclusiveType)),'
  ],
  // LOAD_CHANGE: don't jump to the cursor; ask the editor to keep the scroll position.
  [
    'Be.Z.$emit("file-changed",{id:t,markdown:d,cursor:i,renderCursor:!0,history:n})}},SET_PATHNAME',
    'Be.Z.$emit("file-changed",{id:t,markdown:d,cursor:i,renderCursor:!1,keepScroll:!0,history:n})}},SET_PATHNAME'
  ],
  // editor.vue handleFileChange: restore scrollTop after re-rendering when asked.
  [
    'handleFileChange({id:e,markdown:t,cursor:i,renderCursor:n,history:o}){const{editor:r}=this;this.$nextTick((()=>{r&&(o&&r.setHistory(o),"string"==typeof t?r.setMarkdown(t,i,n):i&&r.setCursor(i),n&&this.scrollToCursor(0))}))}',
    'handleFileChange({id:e,markdown:t,cursor:i,renderCursor:n,history:o,keepScroll:ks}){const{editor:r}=this;this.$nextTick((()=>{if(r){const c=r.container,st=c?c.scrollTop:0;o&&r.setHistory(o),"string"==typeof t?r.setMarkdown(t,i,n):i&&r.setCursor(i),n&&this.scrollToCursor(0),ks&&c&&(c.scrollTop=st)}}))}'
  ]
])

// --- index.html ----------------------------------------------------------------
{
  const file = path.join(dir, 'index.html')
  let html = fs.readFileSync(file, 'utf8')
  const css = html.match(/<link href=renderer\.[0-9a-f]+\.css rel=stylesheet>/g)
  const js = '<script defer=defer src=renderer.js></script>'
  if (!css || css.length !== 1 || html.split(js).length !== 2 || html.includes('viewer-mod')) {
    console.error('FAIL index.html: unexpected structure or already patched')
    process.exit(2)
  }
  html = html
    .replace(js, () => js + '<script defer=defer src=viewer-mod.js></script>')
    .replace(css[0], () => css[0] + '<link href=viewer-mod.css rel=stylesheet>')
  fs.writeFileSync(file, html)
  console.log('patched index.html')
}

// --- renderer.<hash>.css: remove the unbalanced 2026-04-15 block ----------------
{
  const cssFiles = fs.readdirSync(dir).filter(f => /^renderer\.[0-9a-f]+\.css$/.test(f))
  if (cssFiles.length !== 1) {
    console.error(`FAIL: expected one renderer.<hash>.css, found ${cssFiles.length}`)
    process.exit(2)
  }
  const file = path.join(dir, cssFiles[0])
  const css = fs.readFileSync(file, 'utf8')
  const start = css.indexOf('/* === MarkText Viewer overrides (2026-04-15) === */')
  const endMark = '/* === end overrides === */'
  const end = css.indexOf(endMark)
  if (start < 0 || end < start || css.indexOf(endMark, end + 1) >= 0) {
    console.error('FAIL renderer css: 2026-04-15 override block not found exactly once')
    process.exit(2)
  }
  fs.writeFileSync(file, css.slice(0, start) + css.slice(end + endMark.length))
  console.log(`removed broken override block from ${cssFiles[0]}`)
}

// --- mod files -----------------------------------------------------------------
for (const f of ['viewer-mod.js', 'viewer-mod.css']) {
  fs.copyFileSync(path.join(modDir, f), path.join(dir, f))
  console.log(`installed ${f}`)
}
