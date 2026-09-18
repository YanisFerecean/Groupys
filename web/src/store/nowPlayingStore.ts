import { create } from "zustand";
import type { NowPlayingState } from "@/types/chat";

interface NowPlayingStoreState {
  /** Last-known now-playing presence per user id (partners + community co-members). */
  byUser: Record<string, NowPlayingState>;
  /** What we are currently broadcasting ourselves (null when nothing / not sharing). */
  mine: NowPlayingState | null;
  setForUser: (userId: string, state: NowPlayingState | null) => void;
  setMine: (state: NowPlayingState | null) => void;
  reset: () => void;
}

export const useNowPlayingStore = create<NowPlayingStoreState>((set) => ({
  byUser: {},
  mine: null,
  setForUser: (userId, state) =>
    set((prev) => {
      const next = { ...prev.byUser };
      if (!state || !state.track) delete next[userId];
      else next[userId] = state;
      return { byUser: next };
    }),
  setMine: (mine) => set({ mine }),
  reset: () => set({ byUser: {}, mine: null }),
}));
