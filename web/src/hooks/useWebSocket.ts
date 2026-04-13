import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { chatWs } from "@/lib/ws";
import { useConversationStore } from "@/store/conversationStore";
import type { Message } from "@/types/chat";

export function useWebSocket() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      chatWs.disconnect();
      return;
    }

    chatWs.connect(getToken);

    const handlePageHide = () => chatWs.disconnect();
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) chatWs.connect(getToken);
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [getToken, isLoaded, isSignedIn]);

  // Keep the conversation store's unread counts up to date globally
  // so the sidebar badge reflects new messages on any page.
  useEffect(() => {
    return chatWs.on("MESSAGE_NEW", (payload: Message) => {
      const { bubbleConversation, conversations } = useConversationStore.getState();
      const current = conversations.find((c) => c.id === payload.conversationId);
      bubbleConversation(payload.conversationId, {
        lastMessage: payload.content,
        lastMessageAt: payload.createdAt,
        unreadCount: (current?.unreadCount ?? 0) + 1,
      });
    });
  }, []);

  return { isConnected: (isLoaded && isSignedIn), chatWs };
}
