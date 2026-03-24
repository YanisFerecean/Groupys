import { useState, useEffect, useCallback } from "react";
import { Conversation, Message } from "@/types/chat";
import { fetchConversations, markRead } from "@/lib/chat-api";
import { chatWs } from "@/lib/ws";
import { useAuth } from "@clerk/nextjs";

export function useConversations() {
  const { getToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      try {
        const token = await getToken();
        if (token && isMounted) {
          const convos = await fetchConversations(token);
          setConversations(convos);
        }
      } catch (e) {
        console.error("Failed to load conversations:", e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, [getToken]);

  useEffect(() => {
    const unsubs = [
      chatWs.on("MESSAGE_NEW", (payload: Message) => {
        setConversations((prev) => {
          let updated = [...prev];
          const idx = updated.findIndex((c) => c.id === payload.conversationId);
          
          if (idx !== -1) {
            const convo = { ...updated[idx] };
            convo.lastMessage = payload.content;
            convo.lastMessageAt = payload.createdAt;
            convo.unreadCount += 1;
            
            updated.splice(idx, 1);
            updated.unshift(convo); // Bubble up
          }
          return updated;
        });
      }),
      chatWs.on("READ", (payload: any) => {
         setConversations((prev) => {
           let updated = [...prev];
           const idx = updated.findIndex(c => c.id === payload.conversationId);
           if (idx !== -1) {
             const convo = { ...updated[idx] };
             // On READ receipt (either us reading or them reading), typically we only care about OUR unread count.
             // If this READ event was triggered by our own mark_read action, unread => 0.
             convo.unreadCount = 0; 
             updated[idx] = convo;
           }
           return updated;
         });
      })
    ];

    return () => unsubs.forEach((u) => u());
  }, []);

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      const token = await getToken();
      await markRead(conversationId, token);
      chatWs.send({ type: "READ_RECEIPT", conversationId });
      
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === conversationId);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], unreadCount: 0 };
          return updated;
        }
        return prev;
      });
    } catch(e) {
      console.error("markAsRead failed", e);
    }
  }, [getToken]);

  return { conversations, isLoading, markAsRead, setConversations };
}
