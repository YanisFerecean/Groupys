import { create } from "zustand";
import type { Conversation } from "@/types/chat";

interface ConversationState {
  conversations: Conversation[];
  setConversations: (convos: Conversation[]) => void;
  appendConversations: (convos: Conversation[]) => void;
  updateConversation: (id: string, patch: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  bubbleConversation: (id: string, patch: Partial<Conversation>) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  appendConversations: (incoming) =>
    set((state) => ({ conversations: [...state.conversations, ...incoming] })),
  updateConversation: (id, patch) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    })),
  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
    })),
  bubbleConversation: (id, patch) =>
    set((state) => {
      const idx = state.conversations.findIndex((c) => c.id === id);
      if (idx === -1) return state;
      const updated = [...state.conversations];
      updated[idx] = { ...updated[idx], ...patch };
      updated.splice(idx, 1);
      return { conversations: [{ ...state.conversations[idx], ...patch }, ...updated] };
    }),
}));
