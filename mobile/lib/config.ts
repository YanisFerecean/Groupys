import { NativeModules, Platform } from 'react-native'

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

function getMetroHost(): string | null {
  const sourceCode = (NativeModules as { SourceCode?: { scriptURL?: string } }).SourceCode
  const scriptURL = sourceCode?.scriptURL
  if (typeof scriptURL !== 'string' || scriptURL.length === 0) return null

  const match = scriptURL.match(/^[a-z]+:\/\/([^/:?#]+)/i)
  return match?.[1] ?? null
}

function normalizeLoopbackUrl(rawUrl: string): string {
  if (!__DEV__ || Platform.OS === 'web') return rawUrl

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return rawUrl
  }

  if (!LOOPBACK_HOSTS.has(parsed.hostname)) return rawUrl

  const metroHost = getMetroHost()
  if (metroHost && !LOOPBACK_HOSTS.has(metroHost)) {
    parsed.hostname = metroHost
    return parsed.toString().replace(/\/$/, '')
  }

  if (Platform.OS === 'android') {
    parsed.hostname = '10.0.2.2'
    return parsed.toString().replace(/\/$/, '')
  }

  return rawUrl
}

export function resolveRuntimeUrl(rawUrl: string): string {
  return normalizeLoopbackUrl(rawUrl)
}

const envApiUrl = process.env.EXPO_PUBLIC_API_URL
if (!envApiUrl) {
  throw new Error('Missing EXPO_PUBLIC_API_URL')
}

export const API_URL = normalizeLoopbackUrl(envApiUrl)
