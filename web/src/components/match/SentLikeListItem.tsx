"use client";

import { User } from "lucide-react";
import type { SentLike } from "@/types/match";
import Image from "next/image";

interface Props {
  like: SentLike;
  busy: boolean;
  onWithdraw: () => void;
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

export function SentLikeListItem({ like, busy, onWithdraw }: Props) {
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-surface-container px-4 py-4">
      {like.targetProfileImage ? (
        <Image
          src={like.targetProfileImage}
          alt={like.targetDisplayName ?? like.targetUsername}
          width={56}
          height={56}
          className="rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
          <User className="w-6 h-6 text-on-surface-variant" />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="text-base font-bold text-on-surface truncate block">
          {like.targetDisplayName ?? like.targetUsername}
        </span>
        <span className="text-sm text-on-surface-variant">
          Liked {timeAgo(like.likedAt)}
        </span>
      </div>

      <button
        onClick={onWithdraw}
        disabled={busy}
        className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors flex-shrink-0 ${
          busy
            ? "bg-surface-container-high text-on-surface-variant cursor-not-allowed"
            : "bg-primary/15 text-primary hover:bg-primary/25"
        }`}
      >
        {busy ? "Removing" : "Remove"}
      </button>
    </div>
  );
}
