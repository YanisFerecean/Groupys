import { create } from "zustand";
import type { Conversation } from "@/types/chat";

interface ConversationState {
  conversations: Conversation[];
  setConversations: (convos: Conversation[]) => void;
  appendConversations: (convos: Conversation[]) => void;
  /** Inserts or merges a conversation; `moveToTop` bubbles it to the head of the list. */
  upsertConversation: (convo: Conversation, moveToTop?: boolean) => void;
  updateConversation: (id: string, patch: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  bubbleConversation: (id: string, patch: Partial<Conversation>) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  appendConversations: (incoming) =>
    set((state) => {
      const known = new Set(state.conversations.map((c) => c.id));
      return { conversations: [...state.conversations, ...incoming.filter((c) => !known.has(c.id))] };
    }),
  upsertConversation: (convo, moveToTop = false) =>
    set((state) => {
      const idx = state.conversations.findIndex((c) => c.id === convo.id);
      if (idx === -1) {
        return { conversations: moveToTop ? [convo, ...state.conversations] : [...state.conversations, convo] };
      }
      const merged = { ...state.conversations[idx], ...convo };
      const rest = state.conversations.filter((c) => c.id !== convo.id);
      if (moveToTop) return { conversations: [merged, ...rest] };
      const next = [...state.conversations];
      next[idx] = merged;
      return { conversations: next };
    }),
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
      const updated = { ...state.conversations[idx], ...patch };
      const rest = state.conversations.filter((c) => c.id !== id);
      return { conversations: [updated, ...rest] };
    }),
}));
