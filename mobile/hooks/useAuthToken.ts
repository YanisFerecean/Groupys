import { useAuthTokenContext } from './AuthTokenContext'

export function useAuthToken() {
  const { token, loading, refreshToken } = useAuthTokenContext()

  return { token, loading, refreshToken }
}
