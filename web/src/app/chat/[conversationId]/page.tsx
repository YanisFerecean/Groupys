"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Info, Lock } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { useMessages } from "@/hooks/useMessages";
import { Message } from "@/types/chat";
import { useConversations } from "@/hooks/useConversations";
import { MessageThread } from "@/components/chat/MessageThread";
import { MessageInput } from "@/components/chat/MessageInput";
import { usePresence } from "@/hooks/usePresence";
import { useCrypto } from "@/hooks/useCrypto";
import { chatWs } from "@/lib/ws";
import { fetchPublicKey } from "@/lib/chat-api";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const conversationIdValue = Array.isArray(params.conversationId) 
    ? params.conversationId[0] 
    : params.conversationId;
    
  const conversationId = conversationIdValue ?? null;

  const { getToken } = useAuth();
  const { conversations, markAsRead } = useConversations();
  const { isOnline } = usePresence();
  const { ready: cryptoReady, makeEncrypt, makeDecrypt } = useCrypto();

  // Fetch the other participant's public key for E2E (direct chats only)
  const [otherPublicKey, setOtherPublicKey] = useState<string | null>(null);
  const conversation = conversations.find(c => c.id === conversationId);

  useEffect(() => {
    async function fetchKey() {
      if (!conversation || conversation.isGroup || !user) return;
      const other = conversation.participants.find(p => p.username !== user.username);
      if (!other) return;
      const token = await getToken();
      const key = await fetchPublicKey(other.username, token);
      setOtherPublicKey(key);
    }
    fetchKey();
  }, [conversation?.id, user?.username]); // eslint-disable-line react-hooks/exhaustive-deps

  const encryptFn = useMemo(
    () => (cryptoReady && otherPublicKey ? makeEncrypt(otherPublicKey) : undefined),
    [cryptoReady, otherPublicKey, makeEncrypt]
  );

  const decryptFn = useMemo(
    () => (cryptoReady && otherPublicKey ? makeDecrypt(otherPublicKey) : undefined),
    [cryptoReady, otherPublicKey, makeDecrypt]
  );

  const { messages, isLoading, hasMore, loadMore, sendMessage, resendMessage } = useMessages(
    conversationId,
    decryptFn,
    encryptFn
  );

  // Other participant's last read timestamp — seeded from conversation data, kept live via READ events
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);

  useEffect(() => {
    async function seed() {
      if (!conversation || !user) return;
      const other = conversation.participants.find(p => p.username !== user.username);
      setOtherLastReadAt(other?.lastReadAt ?? null);
    }
    seed();
  }, [conversation?.id, user?.username]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!conversationId) return;
    return chatWs.on("READ", (payload: { conversationId: string; readAt: string }) => {
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

  // Derive header info (no impure calls — Date.now handled separately below)
  const { headerTitle, avatarUrl, isOtherOnline, otherUsername } = useMemo(() => {
    let headerTitle = "Chat";
    let avatarUrl: string | null = null;
    let isOtherOnline = false;
    let otherUsername: string | null = null;

    if (conversation && user) {
      if (conversation.isGroup) {
        headerTitle = conversation.groupName || "Group Chat";
      } else {
        const other = conversation.participants.find(p => p.username !== user.username);
        if (other) {
          headerTitle = other.displayName || other.username;
          avatarUrl = other.profileImage;
          isOtherOnline = isOnline(other.userId);
          otherUsername = other.username;
        }
      }
    }

    return { headerTitle, avatarUrl, isOtherOnline, otherUsername };
  }, [conversation, user, isOnline]);

  // Compute "last seen X ago" outside render to avoid Date.now() purity violation
  const [lastSeenText, setLastSeenText] = useState<string | null>(null);

  useEffect(() => {
    async function update() {
      if (!conversation || !user || conversation.isGroup) { setLastSeenText(null); return; }
      const other = conversation.participants.find(p => p.username !== user.username);
      if (!other || isOnline(other.userId) || !other.lastSeenAt) { setLastSeenText(null); return; }
      const diff = Date.now() - new Date(other.lastSeenAt).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) setLastSeenText("last seen just now");
      else if (minutes < 60) setLastSeenText(`last seen ${minutes}m ago`);
      else if (minutes < 1440) setLastSeenText(`last seen ${Math.floor(minutes / 60)}h ago`);
      else setLastSeenText(`last seen ${Math.floor(minutes / 1440)}d ago`);
    }
    update();
  }, [conversation, user, isOnline]);

  const handleSend = useCallback((content: string) => {
    if (!user) return;
    sendMessage(content, user.id, user.username || "me");
  }, [user, sendMessage]);

  const handleLoadMore = useCallback(() => {
    const nextPage = Math.floor(messages.length / 30);
    loadMore(nextPage);
  }, [messages.length, loadMore]);

  const handleRetry = useCallback((msg: Message) => {
    if (msg.tempId) resendMessage(msg.tempId, msg.content);
  }, [resendMessage]);

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

          <Link
            href={otherUsername ? `/profile/${otherUsername}` : "#"}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt={headerTitle} width={40} height={40} className="rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg uppercase">
                {headerTitle.charAt(0)}
              </div>
            )}

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h2 className="font-semibold text-[15px]">{headerTitle}</h2>
                {encryptFn && (
                  <span
                    className="relative group/lock"
                    onClick={(e) => e.preventDefault()}
                  >
                    <Lock className="w-3 h-3 text-primary opacity-70 cursor-default" />
                    <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 rounded-lg bg-surface-container-high border border-surface-container-highest shadow-md px-3 py-2 text-xs text-on-surface opacity-0 group-hover/lock:opacity-100 transition-opacity duration-150 z-50">
                      <span className="flex items-center gap-1.5 font-semibold text-primary mb-1">
                        <Lock className="w-3 h-3" />
                        End-to-end encrypted
                      </span>
                      Messages are encrypted on your device and can only be read by you and {headerTitle}.
                    </span>
                  </span>
                )}
              </div>
              {isOtherOnline ? (
                <span className="text-xs text-primary font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                  Online
                </span>
              ) : lastSeenText ? (
                <span className="text-xs text-on-surface-variant">{lastSeenText}</span>
              ) : null}
            </div>
          </Link>
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
        onLoadMore={handleLoadMore}
        onRetry={handleRetry}
      />

      {/* Input */}
      <MessageInput 
        conversationId={conversationId || ""} 
        onSend={handleSend}
      />
    </div>
  );
}
