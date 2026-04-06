import { create } from "zustand";

interface HotTakeNotificationState {
  hasUnanswered: boolean;
  setHasUnanswered: (val: boolean) => void;
}

export const useHotTakeStore = create<HotTakeNotificationState>((set) => ({
  hasUnanswered: false,
  setHasUnanswered: (hasUnanswered) => set({ hasUnanswered }),
}));
