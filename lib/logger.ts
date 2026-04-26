// ─── SERVER LOGGER ────────────────────────────────────────────────────────────
// Structured logging for API routes and server-side code
// In production, integrate with Sentry, Datadog, or Axiom

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
}

function formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {}),
  }
}

function output(entry: LogEntry) {
  const prefix = {
    debug: '🔍 [DEBUG]',
    info:  'ℹ️  [INFO] ',
    warn:  '⚠️  [WARN] ',
    error: '🔴 [ERROR]',
  }[entry.level]

  const msg = `${prefix} ${entry.timestamp} — ${entry.message}`

  if (entry.level === 'error') {
    console.error(msg, entry.context || '')
  } else if (entry.level === 'warn') {
    console.warn(msg, entry.context || '')
  } else {
    console.log(msg, entry.context || '')
  }

  // TODO: In production, send to your logging service:
  // await sendToSentry(entry)
  // await sendToAxiom(entry)
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      output(formatEntry('debug', message, context))
    }
  },
  info: (message: string, context?: Record<string, unknown>) => {
    output(formatEntry('info', message, context))
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    output(formatEntry('warn', message, context))
  },
  error: (message: string, context?: Record<string, unknown>) => {
    output(formatEntry('error', message, context))
  },
}

/**
 * Logs an API request — call this at the top of each route handler
 */
export function logRequest(method: string, path: string, userId?: string) {
  logger.info(`${method} ${path}`, { userId })
}

/**
 * Logs an API error with context for debugging
 */
export function logApiError(error: unknown, context: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  logger.error(message, { ...context, stack })
}
