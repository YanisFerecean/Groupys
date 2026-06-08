/**
 * Temporary diagnostic: capture uncaught JS errors and console.error output so
 * the LoadingGate can surface them on-screen in release/TestFlight builds where
 * there is no Metro console. Remove once the endless-loading cause is found.
 */

const trapped: string[] = []
const MAX = 25

function safeStringify(value: unknown): string {
  try {
    if (value instanceof Error) {
      return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ''}`
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value)
    }
    return String(value)
  } catch {
    return '[unstringifiable]'
  }
}

function record(prefix: string, parts: unknown[]) {
  try {
    const msg = parts.map(safeStringify).join(' ')
    trapped.push(`[${prefix}] ${msg}`.slice(0, 800))
    if (trapped.length > MAX) trapped.shift()
  } catch {
    /* never throw from the trap */
  }
}

export function getTrappedErrors(): string[] {
  return trapped
}

const g = globalThis as unknown as {
  ErrorUtils?: {
    getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined
    setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void
  }
  __groupysErrorTrapInstalled?: boolean
}

if (!g.__groupysErrorTrapInstalled) {
  g.__groupysErrorTrapInstalled = true

  // Uncaught JS exceptions (chains to RN's existing handler so behavior is unchanged).
  if (g.ErrorUtils?.setGlobalHandler) {
    const previous = g.ErrorUtils.getGlobalHandler?.()
    g.ErrorUtils.setGlobalHandler((error, isFatal) => {
      record(isFatal ? 'fatal' : 'uncaught', [error])
      previous?.(error, isFatal)
    })
  }

  // console.error — Clerk and our own code log failures here.
  const originalError = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    record('console.error', args)
    originalError(...args)
  }
}
