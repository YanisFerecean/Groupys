import { create } from 'zustand'
import type { SuggestedCommunity } from '@/models/SuggestedCommunity'
import type { SuggestedUser } from '@/models/SuggestedUser'

interface DiscoveryState {
  communities: SuggestedCommunity[]
  users: SuggestedUser[]
  communitiesLoading: boolean
  usersLoading: boolean
  communitiesRefreshing: boolean
  usersRefreshing: boolean
  communitiesError: boolean
  usersError: boolean
  setCommunities: (communities: SuggestedCommunity[]) => void
  setUsers: (users: SuggestedUser[]) => void
  setCommunitiesLoading: (loading: boolean) => void
  setUsersLoading: (loading: boolean) => void
  setCommunitiesRefreshing: (refreshing: boolean) => void
  setUsersRefreshing: (refreshing: boolean) => void
  setCommunitiesError: (error: boolean) => void
  setUsersError: (error: boolean) => void
  removeCommunity: (communityId: string) => void
  removeUser: (userId: string) => void
}

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  communities: [],
  users: [],
  communitiesLoading: true,
  usersLoading: true,
  communitiesRefreshing: false,
  usersRefreshing: false,
  communitiesError: false,
  usersError: false,
  setCommunities: (communities) => set({ communities, communitiesError: false }),
  setUsers: (users) => set({ users, usersError: false }),
  setCommunitiesLoading: (communitiesLoading) => set({ communitiesLoading }),
  setUsersLoading: (usersLoading) => set({ usersLoading }),
  setCommunitiesRefreshing: (communitiesRefreshing) => set({ communitiesRefreshing }),
  setUsersRefreshing: (usersRefreshing) => set({ usersRefreshing }),
  setCommunitiesError: (communitiesError) => set({ communitiesError }),
  setUsersError: (usersError) => set({ usersError }),
  removeCommunity: (communityId) =>
    set((state) => ({
      communities: state.communities.filter((c) => c.communityId !== communityId),
    })),
  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((u) => u.userId !== userId),
    })),
}))
