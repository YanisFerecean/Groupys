import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth, useUser } from '@clerk/expo'
import { AppState } from 'react-native'

interface AuthTokenContextType {
  token: string | null
  loading: boolean
  refreshToken: () => Promise<string | null>
}

const AuthTokenContext = createContext<AuthTokenContextType>({
  token: null,
  loading: true,
  refreshToken: async () => null,
})

const TOKEN_REFRESH_INTERVAL_MS = 4 * 60 * 1000
const TOKEN_REFRESH_FOREGROUND_THROTTLE_MS = 45 * 1000

export function AuthTokenProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth()
  const { isLoaded } = useUser()
  const getTokenRef = useRef(getToken)
  const lastRefreshAtRef = useRef(0)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const refreshToken = useCallback(async () => {
    if (!isSignedIn) {
      setToken(null)
      setLoading(false)
      return null
    }
    try {
      const t = await getTokenRef.current()
      setToken(t)
      lastRefreshAtRef.current = Date.now()
      return t
    } catch (err) {
      console.error('Failed to get auth token:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [isSignedIn])

  useEffect(() => {
    if (isLoaded) {
      void refreshToken()
    }
  }, [isLoaded, refreshToken])

  useEffect(() => {
    if (!isSignedIn) return

    const interval = setInterval(() => {
      void refreshToken()
    }, TOKEN_REFRESH_INTERVAL_MS)

    return () => {
      clearInterval(interval)
    }
  }, [isSignedIn, refreshToken])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return
      if (!isSignedIn) return
      const now = Date.now()
      if (now - lastRefreshAtRef.current < TOKEN_REFRESH_FOREGROUND_THROTTLE_MS) return
      void refreshToken()
    })

    return () => {
      sub.remove()
    }
  }, [isSignedIn, refreshToken])

  return (
    <AuthTokenContext.Provider value={{ token, loading, refreshToken }}>
      {children}
    </AuthTokenContext.Provider>
  )
}

export function useAuthTokenContext() {
  return useContext(AuthTokenContext)
}
