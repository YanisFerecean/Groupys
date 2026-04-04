function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function readNumber(value: unknown): string | null {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : null
}

export function summarizeError(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }

  if (error && typeof error === 'object') {
    const record = error as {
      constructor?: { name?: string }
      name?: unknown
      message?: unknown
      code?: unknown
      type?: unknown
      reason?: unknown
    }

    const parts = [
      readString(record.name),
      readString(record.message),
      readNumber(record.code),
      readString(record.type),
      readString(record.reason),
    ].filter(Boolean)

    if (parts.length > 0) {
      return parts.join(' | ')
    }

    const constructorName = readString(record.constructor?.name)
    if (constructorName) {
      return constructorName
    }
  }

  return 'Unknown error'
}

export function logError(context: string, error: unknown) {
  console.error(`${context}: ${summarizeError(error)}`)
}

export function logWarn(context: string, error: unknown) {
  console.warn(`${context}: ${summarizeError(error)}`)
}
