import { create } from "zustand";
import type { SuggestedUser } from "@/types/match";

interface DiscoveryState {
  users: SuggestedUser[];
  usersLoading: boolean;
  usersRefreshing: boolean;
  isFetchingMore: boolean;
  setUsers: (users: SuggestedUser[]) => void;
  appendUsers: (users: SuggestedUser[]) => void;
  setUsersLoading: (loading: boolean) => void;
  setUsersRefreshing: (refreshing: boolean) => void;
  setIsFetchingMore: (fetching: boolean) => void;
  removeUser: (userId: string) => void;
}

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  users: [],
  usersLoading: true,
  usersRefreshing: false,
  isFetchingMore: false,
  setUsers: (users) => set({ users }),
  appendUsers: (incoming) =>
    set((state) => {
      const existingIds = new Set(state.users.map((u) => u.userId));
      const newUsers = incoming.filter((u) => !existingIds.has(u.userId));
      return { users: [...state.users, ...newUsers] };
    }),
  setUsersLoading: (usersLoading) => set({ usersLoading }),
  setUsersRefreshing: (usersRefreshing) => set({ usersRefreshing }),
  setIsFetchingMore: (isFetchingMore) => set({ isFetchingMore }),
  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((u) => u.userId !== userId),
    })),
}));
