"use client";

import { memo, useCallback, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BellOff, Check, ChevronDown, MailOpen, MessageCircle, X } from "lucide-react";
import { Conversation } from "@/types/chat";
import { useUserStore } from "@/store/userStore";
import { messagePreview } from "@/lib/messagePreview";

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

function isMuted(convo: Conversation): boolean {
  return !!convo.mutedUntil && new Date(convo.mutedUntil).getTime() > Date.now();
}

interface ConversationItemProps {
  convo: Conversation;
  currentUserId: string | null;
  isActive: boolean;
  decryptedPreviews?: Map<string, string>;
  onAccept?: (id: string) => void;
  onDeny?: (id: string) => void;
  busy?: boolean;
}

const ConversationItem = memo(function ConversationItem({
  convo,
  currentUserId,
  isActive,
  decryptedPreviews,
  onAccept,
  onDeny,
  busy,
}: ConversationItemProps) {
  const otherParticipant = convo.participants.find(
    (p) => p.userId !== currentUserId
  );

  const displayName = convo.isGroup
    ? convo.groupName || "Group Chat"
    : otherParticipant?.displayName || otherParticipant?.username || "Unknown User";

  const profileImage = convo.isGroup ? null : otherParticipant?.profileImage;

  const timeAgo = convo.lastMessageAt
    ? formatTimeAgo(new Date(convo.lastMessageAt))
    : null;

  const isIncomingRequest = convo.requestStatus === "PENDING_INCOMING";
  const isOutgoingRequest = convo.requestStatus === "PENDING_OUTGOING";
  const muted = isMuted(convo);

  const preview = isIncomingRequest
    ? "Wants to message you"
    : isOutgoingRequest
    ? "Request sent"
    : decryptedPreviews?.get(convo.id) ??
      (convo.lastMessage ? messagePreview({ messageType: "TEXT", content: convo.lastMessage }) : "Start a conversation...");

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
          <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container flex-shrink-0">
            <Image
              src={profileImage}
              alt={displayName}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-lg uppercase">
            {displayName.charAt(0)}
          </div>
        )}
        {convo.unreadCount > 0 && !muted && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary border-2 border-surface">
            {convo.unreadCount > 99 ? "99+" : convo.unreadCount}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex justify-between items-baseline mb-0.5">
          <h3 className={`truncate text-on-surface text-sm flex items-center gap-1 ${convo.unreadCount > 0 && !muted ? "font-bold" : "font-semibold"}`}>
            <span className="truncate">{displayName}</span>
            {muted && <BellOff className="w-3 h-3 text-on-surface-variant shrink-0" aria-label="Muted" />}
          </h3>
          {isOutgoingRequest ? (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 ml-2 bg-surface-container-high text-on-surface-variant">
              Sent
            </span>
          ) : !isIncomingRequest && timeAgo ? (
            <span className="text-xs text-on-surface-variant flex-shrink-0 ml-2">
              {timeAgo}
            </span>
          ) : null}
        </div>
        <p className={`truncate text-sm ${convo.unreadCount > 0 && !muted ? "text-on-surface font-medium" : "text-on-surface-variant"}`}>
          {preview}
        </p>
      </div>

      {/* Inline accept / decline for incoming requests */}
      {isIncomingRequest && onAccept && onDeny && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              onDeny(convo.id);
            }}
            title="Decline"
            className="h-8 w-8 rounded-full flex items-center justify-center bg-surface-container-high text-on-surface-variant hover:text-error disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              onAccept(convo.id);
            }}
            title="Accept"
            className="h-8 w-8 rounded-full flex items-center justify-center bg-primary text-on-primary hover:opacity-90 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      )}
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
  onAcceptRequest?: (id: string) => Promise<void> | void;
  onDenyRequest?: (id: string) => Promise<void> | void;
}

export function ConversationList({
  conversations,
  activeId,
  hasMore,
  isLoadingMore,
  onLoadMore,
  decryptedPreviews,
  onAcceptRequest,
  onDenyRequest,
}: ConversationListProps) {
  const currentUserId = useUserStore((s) => s.backendUserId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [requestsOpen, setRequestsOpen] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const requests = conversations.filter((c) => c.requestStatus !== "ACCEPTED");
  const active = conversations.filter((c) => c.requestStatus === "ACCEPTED");
  const incomingCount = requests.filter((c) => c.requestStatus === "PENDING_INCOMING").length;

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || !hasMore || isLoadingMore || !onLoadMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  const run = async (id: string, fn?: (id: string) => Promise<void> | void) => {
    if (!fn) return;
    setBusyId(id);
    try {
      await fn(id);
    } finally {
      setBusyId((current) => (current === id ? null : current));
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
      {requests.length > 0 && (
        <div className="mb-1">
          <button
            type="button"
            onClick={() => setRequestsOpen((o) => !o)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-surface-container/70 transition-colors"
          >
            <MailOpen className="w-4 h-4 text-primary shrink-0" />
            <span className="flex-1 text-sm font-semibold text-primary">
              Chat requests
              <span className="ml-1.5 text-[11px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                {requests.length}
              </span>
            </span>
            {incomingCount > 0 && !requestsOpen && (
              <span className="text-[11px] text-on-surface-variant">{incomingCount} waiting</span>
            )}
            <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${requestsOpen ? "" : "-rotate-90"}`} />
          </button>
          {requestsOpen &&
            requests.map((convo) => (
              <ConversationItem
                key={convo.id}
                convo={convo}
                currentUserId={currentUserId}
                isActive={activeId === convo.id}
                decryptedPreviews={decryptedPreviews}
                onAccept={onAcceptRequest ? (id) => void run(id, onAcceptRequest) : undefined}
                onDeny={onDenyRequest ? (id) => void run(id, onDenyRequest) : undefined}
                busy={busyId === convo.id}
              />
            ))}
          {active.length > 0 && <div className="my-2 h-px bg-surface-container-high" />}
        </div>
      )}
      {active.map((convo) => (
        <ConversationItem
          key={convo.id}
          convo={convo}
          currentUserId={currentUserId}
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
