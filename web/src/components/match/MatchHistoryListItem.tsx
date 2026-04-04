"use client";

import { useRouter } from "next/navigation";
import { User, ChevronRight } from "lucide-react";
import type { UserMatch } from "@/types/match";
import Image from "next/image";

interface Props {
  match: UserMatch;
}

function statusLabel(status: UserMatch["status"]) {
  switch (status) {
    case "ACTIVE": return "Active";
    case "UNMATCHED": return "Ended";
    case "USER_A_HIDDEN":
    case "USER_B_HIDDEN": return "Hidden";
    default: return status;
  }
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
}

export function MatchHistoryListItem({ match }: Props) {
  const router = useRouter();
  const canOpenChat = match.status === "ACTIVE" && !!match.conversationId;

  return (
    <button
      onClick={() => {
        if (canOpenChat) router.push(`/chat/${match.conversationId}`);
      }}
      disabled={!canOpenChat}
      className="w-full flex items-center gap-4 rounded-3xl bg-surface-container px-4 py-4 hover:bg-surface-container-high transition-colors disabled:cursor-default"
    >
      {match.otherProfileImage ? (
        <Image
          src={match.otherProfileImage}
          alt={match.otherDisplayName ?? match.otherUsername}
          className="w-14 h-14 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
          <User className="w-6 h-6 text-on-surface-variant" />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-1 text-left">
        <div className="flex items-center justify-between gap-3">
          <span className="flex-1 text-base font-bold text-on-surface truncate">
            {match.otherDisplayName ?? match.otherUsername}
          </span>
          <div
            className={`rounded-full px-3 py-1 flex-shrink-0 ${
              match.status === "ACTIVE"
                ? "bg-primary/15"
                : "bg-surface-container-high"
            }`}
          >
            <span
              className={`text-[11px] font-bold uppercase tracking-wide ${
                match.status === "ACTIVE" ? "text-primary" : "text-on-surface-variant"
              }`}
            >
              {statusLabel(match.status)}
            </span>
          </div>
        </div>
        <span className="text-sm text-on-surface-variant">
          Matched {timeAgo(match.matchedAt)}
        </span>
      </div>

      {match.unreadCount > 0 ? (
        <div
          className="flex items-center justify-center rounded-full bg-primary flex-shrink-0"
          style={{ minWidth: 22, height: 22, paddingLeft: 6, paddingRight: 6 }}
        >
          <span className="text-[11px] font-bold text-on-primary">
            {match.unreadCount > 99 ? "99+" : match.unreadCount}
          </span>
        </div>
      ) : canOpenChat ? (
        <ChevronRight className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
      ) : null}
    </button>
  );
}
