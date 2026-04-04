import { useCallback, useRef } from 'react'
import { useAuth } from '@clerk/expo'
import { useMatchStore } from '@/store/matchStore'
import { fetchMatches, unmatchUser } from '@/lib/match-api'

export function useMatches() {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  const store = useMatchStore()

  const loadMatches = useCallback(async () => {
    try {
      useMatchStore.getState().setMatchesLoading(true)
      const token = await getTokenRef.current()
      const data = await fetchMatches(token)
      useMatchStore.getState().setMatches(data)
    } catch (err) {
      console.error('Failed to load matches:', err)
    } finally {
      useMatchStore.getState().setMatchesLoading(false)
    }
  }, [])

  const unmatch = useCallback(async (matchId: string) => {
    try {
      useMatchStore.getState().removeMatch(matchId)
      const token = await getTokenRef.current()
      await unmatchUser(matchId, token)
    } catch (err) {
      console.error('Failed to unmatch:', err)
    }
  }, [])

  return {
    ...store,
    loadMatches,
    unmatch,
  }
}
