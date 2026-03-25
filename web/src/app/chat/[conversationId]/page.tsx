"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Info } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useMessages } from "@/hooks/useMessages";
import { useConversations } from "@/hooks/useConversations";
import { MessageThread } from "@/components/chat/MessageThread";
import { MessageInput } from "@/components/chat/MessageInput";
import { usePresence } from "@/hooks/usePresence";
import { chatWs } from "@/lib/ws";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const conversationIdValue = Array.isArray(params.conversationId) 
    ? params.conversationId[0] 
    : params.conversationId;
    
  const conversationId = conversationIdValue ?? null;

  const { conversations, markAsRead } = useConversations();
  const { messages, isLoading, hasMore, loadMore, sendMessage, resendMessage } = useMessages(conversationId);
  const { isOnline } = usePresence();

  // Find current conversation info from the list
  const conversation = conversations.find(c => c.id === conversationId);

  // Other participant's last read timestamp — seeded from conversation data, kept live via READ events
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);

  useEffect(() => {
    if (!conversation || !user) return;
    const other = conversation.participants.find(p => p.username !== user.username);
    setOtherLastReadAt(other?.lastReadAt ?? null);
  }, [conversation?.id, user?.username]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!conversationId) return;
    return chatWs.on("READ", (payload: any) => {
      if (payload.conversationId === conversationId) {
        setOtherLastReadAt(payload.readAt);
      }
    });
  }, [conversationId]);

  // Set read status whenever we view it or when new msgs arrive
  useEffect(() => {
    if (conversationId && conversation?.unreadCount) {
      markAsRead(conversationId);
    }
  }, [conversationId, messages.length, conversation?.unreadCount, markAsRead]);

  // Derive header info
  let headerTitle = "Chat";
  let avatarUrl = null;
  let isOtherOnline = false;
  let lastSeenText: string | null = null;

  if (conversation && user) {
    if (conversation.isGroup) {
      headerTitle = conversation.groupName || "Group Chat";
    } else {
      const other = conversation.participants.find(p => p.username !== user.username);
      if (other) {
        headerTitle = other.displayName || other.username;
        avatarUrl = other.profileImage;
        isOtherOnline = isOnline(other.userId);
        if (!isOtherOnline && other.lastSeenAt) {
          const diff = Date.now() - new Date(other.lastSeenAt).getTime();
          const minutes = Math.floor(diff / 60000);
          if (minutes < 1) lastSeenText = "last seen just now";
          else if (minutes < 60) lastSeenText = `last seen ${minutes}m ago`;
          else if (minutes < 1440) lastSeenText = `last seen ${Math.floor(minutes / 60)}h ago`;
          else lastSeenText = `last seen ${Math.floor(minutes / 1440)}d ago`;
        }
      }
    }
  }

  const handleSend = (content: string) => {
    if (!user) return;
    sendMessage(content, user.id, user.username || "me");
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="h-16 border-b border-surface-container-high flex items-center px-4 justify-between flex-shrink-0 bg-surface/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/chat')}
            className="md:hidden p-2 -ml-2 rounded-full hover:bg-surface-container text-on-surface transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {avatarUrl ? (
             /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarUrl} alt={headerTitle} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg uppercase">
              {headerTitle.charAt(0)}
            </div>
          )}

          <div className="flex flex-col">
            <h2 className="font-semibold text-[15px]">{headerTitle}</h2>
            {isOtherOnline ? (
              <span className="text-xs text-primary font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                Online
              </span>
            ) : lastSeenText ? (
              <span className="text-xs text-on-surface-variant">{lastSeenText}</span>
            ) : null}
          </div>
        </div>

        <button className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors">
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <MessageThread
        conversationId={conversationId || ""}
        messages={messages}
        hasMore={hasMore}
        isLoadingMore={isLoading}
        otherLastReadAt={otherLastReadAt}
        onLoadMore={() => {
          const nextPage = Math.floor(messages.length / 30);
          loadMore(nextPage);
        }}
        onRetry={(msg) => {
          if (msg.tempId) resendMessage(msg.tempId, msg.content);
        }}
      />

      {/* Input */}
      <MessageInput 
        conversationId={conversationId || ""} 
        onSend={handleSend} 
      />
    </div>
  );
}
