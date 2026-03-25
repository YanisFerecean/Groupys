"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, MessageCircle } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";
import { ConversationList } from "@/components/chat/ConversationList";
import { NewConversationModal } from "@/components/chat/NewConversationModal";
import AppShell from "@/components/app/AppShell";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { conversations, isLoading, hasMore, isLoadingMore, loadMore } = useConversations();
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
          className={`${activeId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-surface-container-high bg-surface flex-shrink-0`}
        >
          <div className="p-4 border-b border-surface-container-high flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold text-on-surface">Messages</h1>
            </div>
            <button
              onClick={() => setIsNewConvoOpen(true)}
              className="p-2 rounded-full hover:bg-surface-container text-on-surface transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex-1 flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              activeId={activeId}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={loadMore}
            />
          )}
        </div>

        {/* Main content area */}
        <div className={`${!activeId ? 'hidden md:flex' : 'flex'} flex-1 flex-col relative`}>
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
