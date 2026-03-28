import { useCallback, useRef } from 'react'
import { useAuth } from '@clerk/expo'
import { useDiscoveryStore } from '@/store/discoveryStore'
import { useMatchStore } from '@/store/matchStore'
import {
  fetchSuggestedCommunities,
  fetchSuggestedUsers,
  likeUser,
  passUser,
  syncSpotifyMusic,
  apiPost,
} from '@/lib/api'
import type { SuggestedUser } from '@/models/SuggestedUser'

export function useDiscovery() {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  const store = useDiscoveryStore()

  const loadCommunities = useCallback(async (refresh = false) => {
    try {
      const state = useDiscoveryStore.getState()
      if (refresh) state.setCommunitiesRefreshing(true)
      else if (state.communities.length === 0) state.setCommunitiesLoading(true)

      const token = await getTokenRef.current()
      const data = await fetchSuggestedCommunities(token, 20, refresh)
      useDiscoveryStore.getState().setCommunities(data)
    } catch (err) {
      console.error('Failed to load communities:', err)
    } finally {
      useDiscoveryStore.getState().setCommunitiesLoading(false)
      useDiscoveryStore.getState().setCommunitiesRefreshing(false)
    }
  }, [])

  const loadUsers = useCallback(async (refresh = false) => {
    try {
      const state = useDiscoveryStore.getState()
      if (refresh) state.setUsersRefreshing(true)
      else if (state.users.length === 0) state.setUsersLoading(true)

      const token = await getTokenRef.current()
      const data = await fetchSuggestedUsers(token, 20, refresh)
      useDiscoveryStore.getState().setUsers(data)
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      useDiscoveryStore.getState().setUsersLoading(false)
      useDiscoveryStore.getState().setUsersRefreshing(false)
    }
  }, [])

  const handleDismiss = useCallback(async (type: 'community' | 'user', id: string) => {
    try {
      const state = useDiscoveryStore.getState()
      if (type === 'community') state.removeCommunity(id)
      else state.removeUser(id)

      const token = await getTokenRef.current()
      if (type === 'community') {
        await apiPost(`/discovery/recommendations/community/${encodeURIComponent(id)}/dismiss`, token, {
          actionType: 'DISMISS',
          surface: 'DISCOVER',
        })
      } else {
        await passUser(id, token)
      }
    } catch (err) {
      console.error(`Failed to dismiss ${type}:`, err)
    }
  }, [])

  const handleJoinCommunity = useCallback(async (communityId: string) => {
    try {
      useDiscoveryStore.getState().removeCommunity(communityId)

      const token = await getTokenRef.current()
      await apiPost(`/communities/${encodeURIComponent(communityId)}/join`, token, {})
    } catch (err) {
      console.error('Failed to join community:', err)
    }
  }, [])

  const handleLikeUser = useCallback(async (user: SuggestedUser) => {
    try {
      useDiscoveryStore.getState().removeUser(user.userId)
      const token = await getTokenRef.current()
      const response = await likeUser(user.userId, token)
      if (response.isMatch && response.matchId && response.conversationId) {
        useMatchStore.getState().setPendingMatchModal({
          matchId: response.matchId,
          otherUserId: user.userId,
          otherUsername: user.username,
          otherDisplayName: user.displayName,
          otherProfileImage: user.profileImage,
          conversationId: response.conversationId,
          status: 'ACTIVE',
          matchedAt: new Date().toISOString(),
          unreadCount: 0,
        })
      }
    } catch (err) {
      console.error('Failed to like user:', err)
    }
  }, [])

  const triggerMusicSync = useCallback(async () => {
    try {
      const token = await getTokenRef.current()
      await syncSpotifyMusic(token)
    } catch (err) {
      console.error('Failed background music sync:', err)
    }
  }, [])

  return {
    ...store,
    loadCommunities,
    loadUsers,
    dismiss: handleDismiss,
    joinCommunity: handleJoinCommunity,
    like: handleLikeUser,
    triggerMusicSync,
  }
}
