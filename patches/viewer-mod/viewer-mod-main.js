// MarkText Viewer mods — main process: window placement + remembered size/position.
// Last modified: 2026-10-02--0210
// Required lazily from dist/electron/main.js (patched by patches/viewer-mods.js).
//
// - New doc windows cascade ("layer", like SumatraPDF) one title bar down/right
//   from the most recently focused visible viewer window, same size; wrap back to
//   the remembered spot when the next step would leave the screen's work area.
// - With no viewer window showing, a doc opens at the remembered spot.
// - The remembered spot (userData/window-state.json, electron-window-state format)
//   is saved whenever a visible viewer window is moved, resized, (un)maximised or
//   closed — not only on close — so restarts/crashes don't lose it. Hidden
//   pre-warmed windows never write it.
'use strict'
const fs = require('fs')
const path = require('path')
const { app, screen } = require('electron')

const STEP = 32 // one title bar
const PLACING_GRACE_MS = 600 // ignore move/resize events caused by our own placement
const SAVE_DEBOUNCE_MS = 400

const stateFile = () => path.join(app.getPath('userData'), 'window-state.json')
const tracked = new Set()
let focusOrder = [] // most recent last

const readState = () => {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile(), 'utf8'))
    if ([s.x, s.y, s.width, s.height].every(Number.isFinite)) return s
  } catch (e) {}
  return null
}

const writeState = win => {
  if (!win || win.isDestroyed() || !win.isVisible() || win.isFullScreen()) return
  const b = win.getNormalBounds()
  const state = {
    width: b.width,
    height: b.height,
    x: b.x,
    y: b.y,
    displayBounds: screen.getDisplayMatching(b).bounds,
    isMaximized: win.isMaximized(),
    isFullScreen: false
  }
  try {
    fs.writeFileSync(stateFile(), JSON.stringify(state))
  } catch (e) {}
}

const visibleOthers = exclude =>
  Array.from(tracked).filter(w => w !== exclude && !w.isDestroyed() && w.isVisible() && !w.isMinimized())

const onSomeDisplay = (x, y) => screen.getAllDisplays().some(d =>
  x >= d.bounds.x && x < d.bounds.x + d.bounds.width && y >= d.bounds.y && y < d.bounds.y + d.bounds.height)

// The remembered spot, kept on-screen.
const rememberedBounds = fallback => {
  const s = readState()
  let b = s ? { x: s.x, y: s.y, width: s.width, height: s.height } : Object.assign({}, fallback)
  if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || !onSomeDisplay(b.x, b.y)) {
    const wa = screen.getPrimaryDisplay().workArea
    const width = Math.min(b.width || 1200, wa.width)
    const height = Math.min(b.height || 800, wa.height)
    b = { x: Math.round(wa.x + (wa.width - width) / 2), y: Math.round(wa.y + (wa.height - height) / 2), width, height }
  }
  return { bounds: b, maximized: !!(s && s.isMaximized) }
}

const fits = (b, wa) => b.x + b.width <= wa.x + wa.width && b.y + b.height <= wa.y + wa.height

// The window new docs cascade from: most recently focused visible viewer window.
const refWindow = others => focusOrder.filter(w => others.includes(w)).pop() || others[others.length - 1]

// Where a new doc window should go. `exclude` is the window being placed (if it exists).
const computePlacement = (exclude, fallback) => {
  const others = visibleOthers(exclude)
  const remembered = rememberedBounds(fallback)
  if (!others.length) return remembered

  const ref = refWindow(others)
  const rb = ref.getNormalBounds()
  const wa = screen.getDisplayMatching(rb).workArea
  const size = { width: rb.width, height: rb.height }
  const taken = b => others.some(w => { const o = w.getNormalBounds(); return o.x === b.x && o.y === b.y })
  // Next layer: one title bar down and right. Tall windows run out of room below
  // quickly (1303 px on a 1440 px screen = 1 step), so then slide right only.
  // Null when there is no room to the right either.
  const stepFrom = b => {
    const x = b.x + STEP
    let y = b.y + STEP
    if (y + size.height > wa.y + wa.height) y = b.y
    return x + size.width > wa.x + wa.width ? null : Object.assign({ x, y }, size)
  }
  // Start of the stack: the remembered spot, or the work area's corner if this size won't fit there.
  let origin = Object.assign({ x: remembered.bounds.x, y: remembered.bounds.y }, size)
  if (!fits(origin, wa) || origin.x < wa.x || origin.y < wa.y) origin = Object.assign({ x: wa.x, y: wa.y }, size)

  let b = stepFrom(rb)
  let wrapped = false
  if (!b) { b = origin; wrapped = true }
  while (taken(b)) {
    const n = stepFrom(b)
    if (n) { b = n; continue }
    if (wrapped) { b = origin; break } // every spot taken: start overlapping at the origin
    b = origin
    wrapped = true
  }
  return { bounds: b, maximized: ref.isMaximized() }
}

const track = win => {
  if (tracked.has(win)) return
  tracked.add(win)
  let timer = null
  const userChange = () => {
    if (Date.now() - (win.__mtPlacedAt || 0) < PLACING_GRACE_MS) return
    clearTimeout(timer)
    timer = setTimeout(() => writeState(win), SAVE_DEBOUNCE_MS)
  }
  for (const ev of ['move', 'resize', 'maximize', 'unmaximize']) win.on(ev, userChange)
  win.on('focus', () => { focusOrder = focusOrder.filter(w => w !== win).concat(win) })
  win.on('close', () => { clearTimeout(timer); writeState(win) })
  win.on('closed', () => { tracked.delete(win); focusOrder = focusOrder.filter(w => w !== win) })
}

module.exports = {
  // Fresh-window path: bounds for the BrowserWindow options (window not created yet).
  initialBounds (fallback, hidden) {
    return hidden ? Object.assign({}, fallback) : computePlacement(null, fallback).bounds
  },

  // Fresh-window path, right after creation (replaces electron-window-state's manage()).
  manage (win, hidden) {
    track(win)
    if (!hidden) {
      win.__mtPlacedAt = Date.now()
      const others = visibleOthers(win)
      if (others.length ? refWindow(others).isMaximized() : rememberedBounds({}).maximized) win.maximize()
    }
  },

  // Pre-warmed window path: position the hidden window just before it is shown.
  place (win) {
    track(win)
    const { bounds, maximized } = computePlacement(win, win.getBounds())
    win.__mtPlacedAt = Date.now()
    win.setBounds(bounds)
    if (maximized) win.maximize()
  },

  // Test hooks.
  _computePlacement: computePlacement,
  _tracked: tracked
}
