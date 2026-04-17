import { create } from "zustand";

interface UserState {
  backendUserId: string | null;
  backendUsername: string | null;
  setBackendUser: (id: string, username: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  backendUserId: null,
  backendUsername: null,
  setBackendUser: (id, username) => set({ backendUserId: id, backendUsername: username }),
}));
