"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { fetchDiscoveredPosts } from "@/lib/discovery-api";
import type { DiscoveredPost } from "@/types/discovery";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

function resolveImageUrl(url: string): string {
  return `${API_URL}${url.replace(/^\/api/, "")}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 365) return `${Math.floor(days / 365)}y ago`;
  if (days > 30) return `${Math.floor(days / 30)}mo ago`;
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ago`;
  return "just now";
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

function ReasonPill({ item }: { item: DiscoveredPost }) {
  if (item.reasonCode === "FRIEND_POSTED" && item.triggerFriend) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">
        <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1" }}>person</span>
        Posted by @{item.triggerFriend.username}
      </span>
    );
  }
  if (item.reasonCode === "FRIEND_LIKED" && item.triggerFriend) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400">
        <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1" }}>favorite</span>
        Liked by @{item.triggerFriend.username}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">
      <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1" }}>trending_up</span>
      Trending in {item.post.communityName}
    </span>
  );
}

function DiscoveredPostCard({ item }: { item: DiscoveredPost }) {
  const router = useRouter();
  const { post } = item;
  const excerpt = truncate(post.content ?? "", post.title ? 80 : 120);
  const firstImage = post.media?.find((m) => m.type.startsWith("image/"));

  return (
    <div
      className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl overflow-hidden shadow-sm flex flex-col cursor-pointer hover:border-white/40 transition-colors"
      onClick={() => router.push(`/discover/post/${post.id}`)}
    >
      {/* Reason + Community */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1 flex-wrap">
        <ReasonPill item={item} />
        <button
          className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/discover/community/${post.communityId}`);
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>group</span>
          {post.communityName}
        </button>
      </div>

      {/* Author */}
      <div
        className="flex items-center gap-2 px-3 py-1.5"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/profile/${post.authorUsername}`);
        }}
      >
        {post.authorProfileImage ? (
          <div className="w-6 h-6 shrink-0 rounded-full overflow-hidden">
            <Image
              src={resolveImageUrl(post.authorProfileImage)}
              alt={post.authorDisplayName || post.authorUsername}
              width={24}
              height={24}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-6 h-6 shrink-0 rounded-full bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant/40" style={{ fontSize: 13 }}>person</span>
          </div>
        )}
        <p className="text-xs font-semibold text-on-surface truncate hover:text-primary transition-colors">
          {post.authorDisplayName || post.authorUsername}
        </p>
        <p className="text-xs text-on-surface-variant ml-auto shrink-0">{timeAgo(post.createdAt)}</p>
      </div>

      {/* Title + content */}
      {(post.title || excerpt) && (
        <div className="px-3 pb-2 flex-1 space-y-1">
          {post.title && (
            <h3 className="text-sm font-bold leading-snug text-on-surface line-clamp-2">
              {post.title}
            </h3>
          )}
          {excerpt && (
            <p className={`text-sm line-clamp-3 ${post.title ? "text-on-surface-variant/80" : "text-on-surface"}`}>
              {excerpt}
            </p>
          )}
        </div>
      )}

      {/* First image */}
      {firstImage && (
        <div className="px-3 pb-2">
          <div className="relative w-full h-36 rounded-xl overflow-hidden">
            <Image
              src={resolveImageUrl(firstImage.url)}
              alt="Post media"
              fill
              className="object-cover"
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 px-3 py-2 border-t border-surface-container-high/50 text-xs text-on-surface-variant">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>thumb_up</span>
          {post.likeCount}
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chat_bubble_outline</span>
          {post.commentCount}
        </span>
      </div>
    </div>
  );
}

export default function DiscoveredPostsSection() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<DiscoveredPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const data = await fetchDiscoveredPosts(token, 6);
        if (!cancelled) setItems(data);
      } catch {
        // silent — section simply won't render
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  if (loading) {
    return (
      <section className="mb-16">
        <h3 className="text-display-sm mb-6">From Other Communities</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-surface-container-high/40 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="mb-16">
      <h3 className="text-display-sm mb-6">From Other Communities</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <DiscoveredPostCard key={item.post.id} item={item} />
        ))}
      </div>
    </section>
  );
}
