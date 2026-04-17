"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Plus, MessageCircle } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { useConversations } from "@/hooks/useConversations";
import { useCrypto } from "@/hooks/useCrypto";
import { ConversationList } from "@/components/chat/ConversationList";
import dynamic from "next/dynamic";
import AppShell from "@/components/app/AppShell";
import { isEncrypted } from "@/lib/crypto";

const NewConversationModal = dynamic(
  () =>
    import("@/components/chat/NewConversationModal").then((m) => ({
      default: m.NewConversationModal,
    })),
  { ssr: false }
);

export default function ChatLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUserId = useUserStore((s) => s.backendUserId);
  const { conversations, isLoading, hasMore, isLoadingMore, loadMore } =
    useConversations();
  const { decryptForPartner } = useCrypto();

  // Map of conversationId -> decrypted last message preview
  const [decryptedPreviews, setDecryptedPreviews] = useState<Map<string, string>>(
    new Map()
  );
  // Track which (id + lastMessage) pairs have already been decrypted to avoid redundant crypto work
  const decryptedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function decryptPreviews() {
      const updates = new Map<string, string>();
      await Promise.all(
        conversations
          .filter(
            (convo) =>
              !decryptedIdsRef.current.has(`${convo.id}:${convo.lastMessage ?? ""}`)
          )
          .map(async (convo) => {
            if (!convo.lastMessage || convo.isGroup || !isEncrypted(convo.lastMessage))
              return;
            const other = convo.participants.find((p) => p.userId !== currentUserId);
            if (!other) return;
            const plain = await decryptForPartner(other.username, convo.lastMessage);
            // If the result is still encrypted, the key wasn't ready yet — don't
            // mark as processed so we retry when the key becomes available.
            if (isEncrypted(plain)) return;
            updates.set(convo.id, plain);
            decryptedIdsRef.current.add(`${convo.id}:${convo.lastMessage}`);
          })
      );
      if (updates.size > 0) {
        setDecryptedPreviews((prev) => new Map([...prev, ...updates]));
      }
    }
    decryptPreviews();
  }, [conversations, decryptForPartner, currentUserId]);
  const params = useParams();
  const activeId = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : params.conversationId;

  const [isNewConvoOpen, setIsNewConvoOpen] = useState(false);

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-64px)] lg:h-[calc(100vh-80px)] w-full overflow-hidden bg-surface">
        {/* Conversation list sidebar */}
        <div
          className={`${
            activeId ? "hidden md:flex" : "flex"
          } flex-col w-full md:w-80 lg:w-96 border-r border-surface-container-high bg-surface flex-shrink-0`}
        >
          <div className="p-4 border-b border-surface-container-high flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold text-on-surface">Messages</h1>
            </div>
            <button
              onClick={() => setIsNewConvoOpen(true)}
              className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex-1 overflow-y-auto w-full px-2 py-2 space-y-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-surface-container-high flex-shrink-0" />
                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    <div className="h-3.5 w-2/5 rounded-full bg-surface-container-high" />
                    <div className="h-3 w-3/5 rounded-full bg-surface-container-highest" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              activeId={activeId}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={loadMore}
              decryptedPreviews={decryptedPreviews}
            />
          )}
        </div>

        {/* Main content area */}
        <div className={`${!activeId ? "hidden md:flex" : "flex"} flex-1 flex-col relative`}>
          {children}
        </div>

        {/* Modals */}
        <NewConversationModal
          isOpen={isNewConvoOpen}
          onClose={() => setIsNewConvoOpen(false)}
        />
      </div>
    </AppShell>
  );
}
