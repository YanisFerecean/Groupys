import { useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useDiscoveryStore } from "@/store/discoveryStore";
import { useMatchStore } from "@/store/matchStore";
import {
  fetchSuggestedUsers,
  likeUser,
  passUser,
} from "@/lib/match-api";
import type { SuggestedUser } from "@/types/match";

export function useDiscovery() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const store = useDiscoveryStore();

  const loadUsers = useCallback(async (refresh = false) => {
    try {
      const state = useDiscoveryStore.getState();
      if (refresh) state.setUsersRefreshing(true);
      else if (state.users.length === 0) state.setUsersLoading(true);

      const token = await getTokenRef.current();
      const data = await fetchSuggestedUsers(token, 4, refresh);
      useDiscoveryStore.getState().setUsers(data);
    } catch (err) {
      console.error("Failed to load suggested users:", err);
    } finally {
      useDiscoveryStore.getState().setUsersLoading(false);
      useDiscoveryStore.getState().setUsersRefreshing(false);
    }
  }, []);

  const loadMoreUsers = useCallback(async () => {
    const state = useDiscoveryStore.getState();
    if (state.isFetchingMore) return;
    try {
      state.setIsFetchingMore(true);
      const token = await getTokenRef.current();
      const data = await fetchSuggestedUsers(token, 4, false);
      useDiscoveryStore.getState().appendUsers(data);
    } catch (err) {
      console.error("Failed to load more suggested users:", err);
    } finally {
      useDiscoveryStore.getState().setIsFetchingMore(false);
    }
  }, []);

  const dismiss = useCallback(async (userId: string) => {
    try {
      useDiscoveryStore.getState().removeUser(userId);
      const token = await getTokenRef.current();
      await passUser(userId, token);
    } catch (err) {
      console.error("Failed to dismiss user:", err);
    }
  }, []);

  const like = useCallback(async (user: SuggestedUser) => {
    try {
      useDiscoveryStore.getState().removeUser(user.userId);
      const token = await getTokenRef.current();
      const response = await likeUser(user.userId, token);
      if (response.isMatch && response.matchId && response.conversationId) {
        const match = {
          matchId: response.matchId,
          otherUserId: user.userId,
          otherUsername: user.username,
          otherDisplayName: user.displayName,
          otherProfileImage: user.profileImage,
          conversationId: response.conversationId,
          status: "ACTIVE" as const,
          matchedAt: new Date().toISOString(),
          unreadCount: 0,
        };
        useMatchStore.getState().addMatch(match);
        useMatchStore.getState().setPendingMatchModal(match);
      }
    } catch (err) {
      console.error("Failed to like user:", err);
    }
  }, []);

  return { ...store, loadUsers, loadMoreUsers, dismiss, like };
}
