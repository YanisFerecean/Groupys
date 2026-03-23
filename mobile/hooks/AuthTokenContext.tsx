import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth, useUser } from '@clerk/expo'

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

export function AuthTokenProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth()
  const { isLoaded } = useUser()
  const getTokenRef = useRef(getToken)
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
      refreshToken()
    }
  }, [isLoaded, refreshToken])

  return (
    <AuthTokenContext.Provider value={{ token, loading, refreshToken }}>
      {children}
    </AuthTokenContext.Provider>
  )
}

export function useAuthTokenContext() {
  return useContext(AuthTokenContext)
}
