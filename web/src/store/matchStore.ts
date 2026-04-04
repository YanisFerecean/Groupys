import { create } from "zustand";
import type { UserMatch } from "@/types/match";

interface MatchState {
  matches: UserMatch[];
  matchesLoading: boolean;
  pendingMatchModal: UserMatch | null;
  setMatches: (matches: UserMatch[]) => void;
  addMatch: (match: UserMatch) => void;
  removeMatch: (matchId: string) => void;
  setMatchesLoading: (loading: boolean) => void;
  setPendingMatchModal: (match: UserMatch | null) => void;
  updateMatchUnread: (matchId: string, unreadCount: number) => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  matches: [],
  matchesLoading: false,
  pendingMatchModal: null,
  setMatches: (matches) => set({ matches }),
  addMatch: (match) =>
    set((state) => ({
      matches: [match, ...state.matches.filter((m) => m.matchId !== match.matchId)],
    })),
  removeMatch: (matchId) =>
    set((state) => ({
      matches: state.matches.filter((m) => m.matchId !== matchId),
    })),
  setMatchesLoading: (matchesLoading) => set({ matchesLoading }),
  setPendingMatchModal: (pendingMatchModal) => set({ pendingMatchModal }),
  updateMatchUnread: (matchId, unreadCount) =>
    set((state) => ({
      matches: state.matches.map((m) =>
        m.matchId === matchId ? { ...m, unreadCount } : m
      ),
    })),
}));
