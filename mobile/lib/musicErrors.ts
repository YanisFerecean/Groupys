interface MusicApiLikeError {
  status: number
  message?: string
}

function isMusicApiLikeError(error: unknown): error is MusicApiLikeError {
  if (!error || typeof error !== 'object') return false
  const maybeStatus = (error as { status?: unknown }).status
  return typeof maybeStatus === 'number'
}

export function getMusicErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (isMusicApiLikeError(error)) {
    if (error.status === 401) {
      return 'Apple Music authorization expired. Please reconnect your Apple Music account.'
    }
    if (error.status === 403) {
      return 'Apple Music access is forbidden for this account. Check your Apple Music subscription and permissions.'
    }
    if (error.status === 429) {
      return 'Apple Music is rate limiting requests right now. Please try again in a moment.'
    }
    return error.message || fallback
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
