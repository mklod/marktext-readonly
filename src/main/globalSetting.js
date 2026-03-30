import path from 'path'

// Set `__static` path to static files in production.
if (process.env.NODE_ENV !== 'development') {
  global.__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\')
}

// READ-ONLY MODE: Log startup time for benchmarking.
global.__perfMainStart = Date.now()
console.log(`[PERF] main-start: ${global.__perfMainStart}`)
