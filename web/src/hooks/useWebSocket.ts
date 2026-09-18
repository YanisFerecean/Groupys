import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { chatWs } from "@/lib/ws";
import { useConversationStore } from "@/store/conversationStore";
import { useUserStore } from "@/store/userStore";
import type { Conversation, Message } from "@/types/chat";

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
    const offNew = chatWs.on("MESSAGE_NEW", (payload: Message) => {
      const { bubbleConversation, conversations } = useConversationStore.getState();
      const myId = useUserStore.getState().backendUserId;
      const current = conversations.find((c) => c.id === payload.conversationId);
      // Our own message (e.g. sent from another tab) must not bump our unread count.
      const mine = !!myId && payload.senderId === myId;
      bubbleConversation(payload.conversationId, {
        lastMessage: payload.content,
        lastMessageAt: payload.createdAt,
        unreadCount: mine ? current?.unreadCount ?? 0 : (current?.unreadCount ?? 0) + 1,
      });
    });

    // Other participant read the conversation — keep lastReadAt fresh for "Seen" receipts.
    const offRead = chatWs.on("READ", (payload: { conversationId: string; userId: string; readAt: string }) => {
      const { conversations, updateConversation } = useConversationStore.getState();
      const convo = conversations.find((c) => c.id === payload.conversationId);
      if (!convo) return;
      updateConversation(convo.id, {
        participants: convo.participants.map((p) =>
          p.userId === payload.userId ? { ...p, lastReadAt: payload.readAt } : p
        ),
      } as Partial<Conversation>);
    });

    return () => {
      offNew();
      offRead();
    };
  }, []);

  return { isConnected: (isLoaded && isSignedIn), chatWs };
}
