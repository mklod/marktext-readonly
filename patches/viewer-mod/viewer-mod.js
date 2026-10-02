// MarkText Viewer mods — reader behaviour, checkbox toggling, accent title bar.
// Last modified: 2026-10-02--1325
// Loaded by dist/electron/index.html after renderer.js (nodeIntegration is on).
// Installed by patches/viewer-mods.js.
;(function () {
  'use strict'
  const fs = require('fs')
  let remote = null
  try { remote = require('@electron/remote') } catch (e) {}

  const EDITOR = '#ag-editor-id'
  const CHECKBOX = 'input.ag-task-list-item-checkbox'

  // --- Title bar accent ------------------------------------------------------
  // Paint the bar like a native Win10 title bar: the Settings accent colour
  // (HKCU\...\DWM AccentColor, ABGR) when "Show accent color on title bars" is on
  // (ColorPrevalence = 1). Electron's getAccentColor() returns DWM's blended
  // colorization colour instead, so it is only a fallback. Re-read on focus so
  // theme changes follow.
  const { execFile } = require('child_process')
  const setAccent = (rgb, enabled) => {
    const root = document.documentElement
    if (rgb) root.style.setProperty('--mtAccent', rgb)
    root.classList.toggle('mt-accent-titlebar', !!enabled)
  }
  const applyAccent = () => {
    execFile('reg', ['query', 'HKCU\\Software\\Microsoft\\Windows\\DWM'], { windowsHide: true }, (err, out) => {
      const reg = name => {
        const m = !err && new RegExp(`^\\s*${name}\\s+REG_DWORD\\s+0x([0-9a-f]+)`, 'im').exec(out)
        return m ? parseInt(m[1], 16) : null
      }
      const abgr = reg('AccentColor')
      const prevalence = reg('ColorPrevalence')
      let rgb = null
      if (abgr !== null) {
        rgb = '#' + [abgr & 0xff, (abgr >> 8) & 0xff, (abgr >> 16) & 0xff].map(v => v.toString(16).padStart(2, '0')).join('')
      } else {
        try {
          const c = remote && remote.systemPreferences.getAccentColor() // "rrggbbaa"
          if (/^[0-9a-f]{6}/i.test(c)) rgb = '#' + c.slice(0, 6)
        } catch (e) {}
      }
      setAccent(rgb, prevalence === null ? !!rgb : prevalence === 1)
    })
  }
  applyAccent()
  window.addEventListener('focus', applyAccent)

  // --- Store access ----------------------------------------------------------
  const getStore = () => {
    for (const el of document.querySelectorAll('body *')) {
      if (el.__vue__ && el.__vue__.$store) return el.__vue__.$store
    }
    return null
  }

  // --- Task lines in the markdown source -------------------------------------
  // Mirrors muya's rules: list marker [-*+] or 1. / 1), then "[ ]" / "[x]" and
  // at least one space (muya: /^\[([ xX])\] +/). Skips front matter and fenced
  // code. Anything else that could disagree with the rendered page (indented
  // code, HTML blocks) is caught by the count/text checks in toggleTask().
  const TASK = /^((?:[ \t]*>)*[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+\[)([ xX])\] +(.*)$/
  const FENCE = /^(?:[ \t]*>)*[ \t]*(`{3,}|~{3,})/

  const findTaskLines = lines => {
    const hits = []
    let i = 0
    if (/^---\s*$/.test(lines[0] || '')) {
      for (i = 1; i < lines.length; i++) {
        if (/^(---|\.\.\.)\s*$/.test(lines[i])) { i++; break }
      }
    }
    let fence = null
    for (; i < lines.length; i++) {
      const line = lines[i].replace(/\r$/, '')
      const f = FENCE.exec(line)
      if (fence) {
        if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null
        continue
      }
      if (f) { fence = f[1]; continue }
      const m = TASK.exec(line)
      if (m) hits.push({ line: i, col: m[1].length, checked: m[2] !== ' ', text: m[3] })
    }
    return hits
  }

  const norm = s => (s || '').replace(/[^0-9A-Za-z]+/g, '').toLowerCase()

  // Raw markdown text of the checkbox's own line (muya keeps syntax in hidden spans,
  // so textContent matches the source text).
  const itemText = cb => {
    const li = cb.closest('li')
    const line = li && li.querySelector(':scope > .ag-paragraph .ag-line, :scope > p .ag-line, :scope > .ag-paragraph, :scope > p')
    return line ? line.textContent : ''
  }

  // --- Checkbox toggle: flip exactly one "[ ]"/"[x]" in the file -------------
  // wasChecked: the box state before the click (Chromium flips `checked` before
  // dispatching click and only reverts it after preventDefault'ed handlers run).
  const toggleTask = (cb, wasChecked) => {
    const store = getStore()
    const file = store && store.state.editor.currentFile
    const notify = msg => {
      if (store && file) {
        store.commit('PUSH_TAB_NOTIFICATION', { tabId: file.id, msg, style: 'warn', showConfirm: false, exclusiveType: 'viewer_checkbox' })
      } else {
        console.error('[viewer-mod]', msg)
      }
    }
    if (!file || !file.pathname) return notify('Checkbox not saved: this document has no file on disk.')
    const enc = file.encoding && file.encoding.encoding
    if (enc && !/^utf-?8$/i.test(enc)) return notify(`Checkbox not saved: file encoding is ${enc}, only UTF-8 is supported.`)

    const boxes = Array.from(document.querySelectorAll(`${EDITOR} ${CHECKBOX}`))
    const idx = boxes.indexOf(cb)
    let text
    try {
      text = fs.readFileSync(file.pathname, 'utf8')
    } catch (err) {
      return notify(`Checkbox not saved: ${err.message}`)
    }
    const lines = text.split('\n')
    const hits = findTaskLines(lines)
    if (idx < 0 || hits.length !== boxes.length) {
      return notify(`Checkbox not saved: the file has ${hits.length} task items but the page shows ${boxes.length}.`)
    }
    const hit = hits[idx]
    const shown = norm(itemText(cb))
    const src = norm(hit.text)
    if (hit.checked !== wasChecked || (src && !shown.startsWith(src.slice(0, 40)))) {
      return notify('Checkbox not saved: the page and the file disagree about this item. Reloading may help.')
    }

    const want = !hit.checked
    const l = lines[hit.line]
    lines[hit.line] = l.slice(0, hit.col) + (want ? 'x' : ' ') + l.slice(hit.col + 1)
    try {
      fs.writeFileSync(file.pathname, lines.join('\n'), 'utf8')
    } catch (err) {
      return notify(`Checkbox not saved: ${err.message}`)
    }
    // Show the new state now (muya draws the tick from the ag-checkbox-checked class,
    // not from `checked`); the file watcher reloads the document ~1-2 s later.
    cb.classList.toggle('ag-checkbox-checked', want)
    setTimeout(() => { cb.checked = want }, 0)
  }

  // --- Highlights: Ctrl+drag marks text, in the viewer only (never written) ---
  // Each highlight is remembered as (anchor text, occurrence, char range) so it can
  // be re-applied after muya re-renders (live reload, checkbox toggle, search).
  const HL = 'mt-hl'
  const ANCHOR = '.ag-line, .ag-paragraph, td, th'
  let hlSeq = 0
  let records = [] // { id, anchorText, occurrence, start, end, spans: [] }

  const anchorsLike = text => Array.from(document.querySelectorAll(`${EDITOR} ${ANCHOR}`))
    .filter(a => !a.querySelector(ANCHOR) && a.textContent === text)

  const textOffset = (anchor, node) => {
    const w = document.createTreeWalker(anchor, NodeFilter.SHOW_TEXT)
    let pos = 0
    let n
    while ((n = w.nextNode()) && n !== node) pos += n.nodeValue.length
    return pos
  }

  const wrapText = (node, s, e, id) => {
    if (e < node.nodeValue.length) node.splitText(e)
    if (s > 0) node = node.splitText(s)
    const span = document.createElement('span')
    span.className = HL
    span.dataset.hl = id
    node.parentNode.insertBefore(span, node)
    span.appendChild(node)
    return span
  }

  const applyRecord = rec => {
    const anchor = anchorsLike(rec.anchorText)[rec.occurrence]
    if (!anchor) return false
    const parts = []
    const w = document.createTreeWalker(anchor, NodeFilter.SHOW_TEXT)
    let pos = 0
    let n
    while ((n = w.nextNode())) {
      const len = n.nodeValue.length
      const s = Math.max(rec.start, pos)
      const e = Math.min(rec.end, pos + len)
      if (s < e) parts.push([n, s - pos, e - pos])
      pos += len
    }
    rec.spans = parts.map(([node, s, e]) => wrapText(node, s, e, rec.id))
    return rec.spans.length > 0
  }

  const highlightSelection = () => {
    const sel = window.getSelection()
    const root = document.querySelector(EDITOR)
    if (!sel || sel.isCollapsed || !sel.rangeCount || !root) return false
    const range = sel.getRangeAt(0)
    if (!root.contains(range.commonAncestorContainer)) return false
    const id = String(++hlSeq)
    const segs = new Map() // anchor -> [start, end]
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let n
    while ((n = w.nextNode())) {
      if (!range.intersectsNode(n) || !n.nodeValue.length) continue
      const anchor = n.parentElement && n.parentElement.closest(ANCHOR)
      if (!anchor || !root.contains(anchor)) continue
      const s = n === range.startContainer ? range.startOffset : 0
      const e = n === range.endContainer ? range.endOffset : n.nodeValue.length
      if (s >= e) continue
      const base = textOffset(anchor, n)
      const seg = segs.get(anchor)
      if (seg) seg[1] = base + e
      else segs.set(anchor, [base + s, base + e])
    }
    if (!segs.size) return false
    sel.removeAllRanges()
    for (const [anchor, [start, end]] of segs) {
      const anchorText = anchor.textContent
      const occurrence = anchorsLike(anchorText).indexOf(anchor)
      const rec = { id, anchorText, occurrence, start, end, spans: [] }
      if (applyRecord(rec)) records.push(rec)
    }
    return true
  }

  const removeHighlight = id => {
    for (const rec of records.filter(r => r.id === id)) {
      for (const span of rec.spans) {
        const parent = span.parentNode
        if (!parent) continue
        while (span.firstChild) parent.insertBefore(span.firstChild, span)
        parent.removeChild(span)
        parent.normalize()
      }
    }
    records = records.filter(r => r.id !== id)
  }

  // Re-apply highlights that a re-render removed; drop ones whose text is gone.
  let reapplyTimer = null
  const reapply = () => {
    reapplyTimer = null
    records = records.filter(rec => rec.spans.every(s => s.isConnected) || applyRecord(rec))
  }
  const observer = new MutationObserver(() => {
    if (records.length && !reapplyTimer) reapplyTimer = setTimeout(reapply, 50)
  })
  const observeEditor = () => {
    const root = document.querySelector(EDITOR)
    if (root) observer.observe(root, { childList: true, subtree: true })
    else setTimeout(observeEditor, 500)
  }
  observeEditor()

  // --- Reader: keep muya from reacting to clicks ------------------------------
  // muya's click handler places its cursor, which reveals markdown syntax (**, #,
  // link targets) and opens image/table/code tools and the format bar. All mouse
  // events inside the editor are stopped in the capture phase. Default actions are
  // left alone, so native text selection and Ctrl+C still work.
  //   checkbox click   -> toggle "[ ]"/"[x]" in the file
  //   Ctrl+drag        -> highlight (viewer only)
  //   Ctrl+click       -> open link / remove highlight
  //   code-copy button -> passed through to muya
  let suppressClick = false
  const openLink = a => {
    const store = getStore()
    if (store) {
      store.dispatch('FORMAT_LINK_CLICK', { data: { text: a.textContent, href: a.getAttribute('href') || '' }, dirname: window.DIRNAME })
    }
  }

  const onMouse = e => {
    const t = e.target
    if (!(t instanceof Element) || !t.closest(EDITOR)) return
    if (t.closest('.ag-code-copy')) return
    e.stopPropagation()

    if (e.ctrlKey || e.metaKey) {
      if (e.type === 'mouseup') {
        suppressClick = highlightSelection()
      } else if (e.type === 'click') {
        if (suppressClick) {
          suppressClick = false
          return
        }
        const hl = t.closest(`.${HL}`)
        const a = t.closest('a.ag-inline-rule')
        if (hl) removeHighlight(hl.dataset.hl)
        else if (a) openLink(a)
      }
      return
    }

    const cb = t.closest(CHECKBOX)
    if (cb) {
      e.preventDefault() // the file is the source of truth; toggleTask sets the box
      if (e.type === 'click') toggleTask(cb, !cb.checked)
    }
  }
  // mouseover/mouseout: muya opens its link/footnote hover tools from these.
  for (const type of ['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'mouseover', 'mouseout']) {
    window.addEventListener(type, onMouse, true)
  }

  // Test hook.
  window.__mtViewerMod = { findTaskLines, getStore, toggleTask, itemText, highlightSelection, records: () => records }
})()
