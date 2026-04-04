"use client";

import { memo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { Conversation } from "@/types/chat";
import { useUser } from "@clerk/nextjs";

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "always", style: "narrow" });

function formatTimeAgo(date: Date): string {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(Math.round(seconds), "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 2592000) return rtf.format(Math.round(seconds / 86400), "day");
  if (abs < 31536000) return rtf.format(Math.round(seconds / 2592000), "month");
  return rtf.format(Math.round(seconds / 31536000), "year");
}

interface ConversationItemProps {
  convo: Conversation;
  currentUsername: string | undefined;
  isActive: boolean;
  decryptedPreviews?: Map<string, string>;
}

const ConversationItem = memo(function ConversationItem({
  convo,
  currentUsername,
  isActive,
  decryptedPreviews,
}: ConversationItemProps) {
  const otherParticipant = convo.participants.find(
    (p) => p.username !== currentUsername
  );

  const displayName = convo.isGroup
    ? convo.groupName || "Group Chat"
    : otherParticipant?.displayName || otherParticipant?.username || "Unknown User";

  const profileImage = convo.isGroup ? null : otherParticipant?.profileImage;

  const timeAgo = convo.lastMessageAt
    ? formatTimeAgo(new Date(convo.lastMessageAt))
    : null;

  return (
    <Link
      href={`/chat/${convo.id}`}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
        isActive
          ? "bg-primary/10 font-medium"
          : "hover:bg-surface-container/70"
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 relative">
        {profileImage ? (
          <Image
            src={profileImage}
            alt={displayName}
            width={48}
            height={48}
            className="rounded-full object-cover bg-surface-container"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-lg uppercase">
            {displayName.charAt(0)}
          </div>
        )}
        {convo.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary border-2 border-surface">
            {convo.unreadCount > 99 ? "99+" : convo.unreadCount}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex justify-between items-baseline mb-0.5">
          <h3 className={`truncate text-on-surface text-sm ${convo.unreadCount > 0 ? "font-bold" : "font-semibold"}`}>
            {displayName}
          </h3>
          {convo.requestStatus !== "ACCEPTED" ? (
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
              convo.requestStatus === "PENDING_INCOMING"
                ? "bg-primary/15 text-primary"
                : "bg-surface-container-high text-on-surface-variant"
            }`}>
              {convo.requestStatus === "PENDING_INCOMING" ? "Pending" : "Sent"}
            </span>
          ) : timeAgo ? (
            <span className="text-xs text-on-surface-variant flex-shrink-0 ml-2">
              {timeAgo}
            </span>
          ) : null}
        </div>
        <p className={`truncate text-sm ${convo.unreadCount > 0 ? "text-on-surface font-medium" : "text-on-surface-variant"}`}>
          {convo.requestStatus === "PENDING_INCOMING"
            ? "Wants to message you"
            : convo.requestStatus === "PENDING_OUTGOING"
            ? "Request sent"
            : decryptedPreviews?.get(convo.id) ?? convo.lastMessage ?? "Start a conversation..."}
        </p>
      </div>
    </Link>
  );
});

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  decryptedPreviews?: Map<string, string>;
}

export function ConversationList({ conversations, activeId, hasMore, isLoadingMore, onLoadMore, decryptedPreviews }: ConversationListProps) {
  const { user } = useUser();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el || !hasMore || isLoadingMore || !onLoadMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
      onLoadMore();
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center">
          <MessageCircle className="w-7 h-7 text-on-surface-variant" />
        </div>
        <p className="text-sm font-medium text-on-surface mt-3">No conversations yet</p>
        <p className="text-xs text-on-surface-variant mt-1 max-w-[180px]">Start a new chat with the + button above</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto w-full custom-scrollbar px-2 py-2 space-y-0.5">
      {conversations.map((convo) => (
        <ConversationItem
          key={convo.id}
          convo={convo}
          currentUsername={user?.username ?? undefined}
          isActive={activeId === convo.id}
          decryptedPreviews={decryptedPreviews}
        />
      ))}
      {isLoadingMore && (
        <div className="flex justify-center py-3">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
