"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Bell, ChevronLeft, Info, Lock, Check, X } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useUserStore } from "@/store/userStore";
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
  const { backendUserId, backendUsername } = useUserStore();
  const conversationIdValue = Array.isArray(params.conversationId) 
    ? params.conversationId[0] 
    : params.conversationId;
    
  const conversationId = conversationIdValue ?? null;

  const { getToken } = useAuth();
  const { conversations, markAsRead, acceptRequest, denyRequest } = useConversations();
  const [requestBusy, setRequestBusy] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const { isOnline } = usePresence();
  const { ready: cryptoReady, makeEncrypt, makeDecrypt } = useCrypto();

  // Fetch the other participant's public key for E2E (direct chats only)
  const [otherPublicKey, setOtherPublicKey] = useState<string | null>(null);
  const conversation = conversations.find(c => c.id === conversationId);

  useEffect(() => {
    async function fetchKey() {
      if (!conversation || conversation.isGroup || !backendUserId) return;
      const other = conversation.participants.find(p => p.userId !== backendUserId);
      if (!other) return;
      const token = await getToken();
      const key = await fetchPublicKey(other.username, token);
      setOtherPublicKey(key);
    }
    fetchKey();
  }, [conversation?.id, backendUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const encryptFn = useMemo(
    () => (cryptoReady && otherPublicKey ? makeEncrypt(otherPublicKey) : undefined),
    [cryptoReady, otherPublicKey, makeEncrypt]
  );

  const decryptFn = useMemo(
    () => (cryptoReady && otherPublicKey ? makeDecrypt(otherPublicKey) : undefined),
    [cryptoReady, otherPublicKey, makeDecrypt]
  );

  const isInitialLoadRef = useRef(true);

  const { messages, isLoading, hasMore, loadMore, sendMessage, resendMessage, rateLimitError, isDecrypting } = useMessages(
    conversationId,
    decryptFn,
    encryptFn
  );

  useEffect(() => {
    if (!isLoading) isInitialLoadRef.current = false;
  }, [isLoading]);

  // Other participant's last read timestamp — seeded from conversation data, kept live via READ events
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);

  useEffect(() => {
    async function seed() {
      if (!conversation || !backendUserId) return;
      const other = conversation.participants.find(p => p.userId !== backendUserId);
      setOtherLastReadAt(other?.lastReadAt ?? null);
    }
    seed();
  }, [conversation?.id, backendUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Current user's last read timestamp — captured once on open, before markAsRead clears it
  const [myLastReadAt, setMyLastReadAt] = useState<string | null>(null);
  const myLastReadAtSeededRef = useRef(false);

  useEffect(() => {
    if (myLastReadAtSeededRef.current || !conversation || !backendUserId) return;
    const me = conversation.participants.find(p => p.userId === backendUserId);
    setMyLastReadAt(me?.lastReadAt ?? null);
    myLastReadAtSeededRef.current = true;
  }, [conversation, backendUserId]);

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
    if (conversationId && conversation?.unreadCount && conversation.requestStatus === "ACCEPTED") {
      markAsRead(conversationId);
    }
  }, [conversationId, messages.length, conversation?.unreadCount, conversation?.requestStatus, markAsRead]);

  const handleAccept = useCallback(async () => {
    if (!conversationId || requestBusy) return;
    setRequestBusy(true);
    try {
      await acceptRequest(conversationId);
    } catch (e) {
      console.error("Failed to accept request", e);
    } finally {
      setRequestBusy(false);
    }
  }, [conversationId, requestBusy, acceptRequest]);

  const handleDeny = useCallback(async () => {
    if (!conversationId || requestBusy) return;
    setRequestBusy(true);
    try {
      await denyRequest(conversationId);
      router.push("/chat");
    } catch (e) {
      console.error("Failed to deny request", e);
      setRequestBusy(false);
    }
  }, [conversationId, requestBusy, denyRequest, router]);

  // Derive header info (no impure calls — Date.now handled separately below)
  const { headerTitle, avatarUrl, isOtherOnline, otherUsername } = useMemo(() => {
    let headerTitle = "Chat";
    let avatarUrl: string | null = null;
    let isOtherOnline = false;
    let otherUsername: string | null = null;

    if (conversation && backendUserId) {
      if (conversation.isGroup) {
        headerTitle = conversation.groupName || "Group Chat";
      } else {
        const other = conversation.participants.find(p => p.userId !== backendUserId);
        if (other) {
          headerTitle = other.displayName || other.username;
          avatarUrl = other.profileImage;
          isOtherOnline = isOnline(other.userId);
          otherUsername = other.username;
        }
      }
    }

    return { headerTitle, avatarUrl, isOtherOnline, otherUsername };
  }, [conversation, backendUserId, isOnline]);

  // Compute "last seen X ago" outside render to avoid Date.now() purity violation
  const [lastSeenText, setLastSeenText] = useState<string | null>(null);

  useEffect(() => {
    async function update() {
      if (!conversation || !backendUserId || conversation.isGroup) { setLastSeenText(null); return; }
      const other = conversation.participants.find(p => p.userId !== backendUserId);
      if (!other || isOnline(other.userId) || !other.lastSeenAt) { setLastSeenText(null); return; }
      const diff = Date.now() - new Date(other.lastSeenAt).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) setLastSeenText("last seen just now");
      else if (minutes < 60) setLastSeenText(`last seen ${minutes}m ago`);
      else if (minutes < 1440) setLastSeenText(`last seen ${Math.floor(minutes / 60)}h ago`);
      else setLastSeenText(`last seen ${Math.floor(minutes / 1440)}d ago`);
    }
    update();
  }, [conversation, backendUserId, isOnline]);

  const handleSend = useCallback((content: string) => {
    if (!backendUserId) return;
    sendMessage(content, backendUserId, backendUsername ?? "me");
  }, [backendUserId, backendUsername, sendMessage]);

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
      <div className="h-16 border-b border-surface-container-high/50 shadow-sm flex items-center px-4 justify-between flex-shrink-0 bg-surface/95 backdrop-blur z-10">
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
            {avatarUrl && !avatarError ? (
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                <Image src={avatarUrl} alt={headerTitle} width={48} height={48} className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg uppercase">
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
                <span className="text-xs text-primary font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary ring-2 ring-surface inline-block"></span>
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
        isLoading={isLoading && isInitialLoadRef.current}
        isLoadingMore={isLoading && !isInitialLoadRef.current}
        isDecrypting={isDecrypting}
        otherLastReadAt={otherLastReadAt}
        myLastReadAt={myLastReadAt}
        onLoadMore={handleLoadMore}
        onRetry={handleRetry}
      />

      {/* Input / Request banner */}
      {conversation?.requestStatus === "PENDING_INCOMING" ? (
        <div className="flex-shrink-0 border-t border-surface-container-high bg-surface p-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-primary" />
            <p className="text-sm text-center text-on-surface-variant">
              <span className="font-semibold text-on-surface">{headerTitle}</span> wants to send you a message.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDeny}
              disabled={requestBusy}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-surface-container-highest hover:bg-surface-container-high text-on-surface font-semibold transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Decline
            </button>
            <button
              onClick={handleAccept}
              disabled={requestBusy}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-primary hover:bg-primary/90 text-on-primary font-semibold transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Accept
            </button>
          </div>
        </div>
      ) : conversation?.requestStatus === "PENDING_OUTGOING" ? (
        <div className="flex-shrink-0 border-t border-surface-container-high bg-surface px-4 py-5 text-center">
          <p className="text-sm text-on-surface-variant">
            Your request has been sent. You can message <span className="font-semibold text-on-surface">{headerTitle}</span> once they accept.
          </p>
        </div>
      ) : (
        <MessageInput
          conversationId={conversationId || ""}
          onSend={handleSend}
          rateLimitError={rateLimitError}
        />
      )}
    </div>
  );
}
