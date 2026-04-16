#!/usr/bin/env node
// Last modified: 2026-04-02--2300
// Fast launcher for MarkText Viewer.
// Sends file path via named pipe to running instance, or cold-starts MarkText.exe.

const net = require('net')
const path = require('path')
const { spawn } = require('child_process')

const PIPE_NAME = '\\\\.\\pipe\\marktext-viewer'

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: marktext-open <file.md>')
  process.exit(1)
}

const absPath = path.resolve(filePath)
const start = Date.now()

const client = net.createConnection(PIPE_NAME, () => {
  client.end(absPath + '\n', () => {
    console.log(`[PERF] Pipe send: ${Date.now() - start}ms`)
    process.exit(0)
  })
})

client.on('error', () => {
  // No running instance — cold start
  console.log(`[PERF] No pipe (${Date.now() - start}ms), cold starting...`)
  const exeDir = path.dirname(process.execPath)
  const marktext = path.join(exeDir, 'MarkText.exe')
  const child = spawn(marktext, [absPath], { detached: true, stdio: 'ignore' })
  child.unref()
  console.log(`[PERF] Launched: ${Date.now() - start}ms`)
  process.exit(0)
})
