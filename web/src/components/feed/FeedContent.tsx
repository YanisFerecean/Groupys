"use client";

import { memo, useCallback, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import MarkdownContent from "@/components/ui/MarkdownContent";
import AuthMedia from "@/components/ui/AuthMedia";
import MediaLightbox, { LightboxItem } from "@/components/ui/MediaLightbox";
import HotTakeCard from "./HotTakeCard";
import { useFeed, usePrefetchFeed } from "@/hooks/useFeed";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface PostMedia {
  url: string;
  type: string;
  order: number;
}

interface PostRes {
  id: string;
  title: string | null;
  content: string;
  media: PostMedia[];
  communityId: string;
  communityName: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorProfileImage: string;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  userReaction: "like" | "dislike" | null;
  commentCount: number;
  feedReasonCode: "FRIEND_POSTED" | "FRIEND_LIKED" | "RECOMMENDED_COMMUNITY" | null;
  triggerFriendUsername: string | null;
  triggerFriendProfileImage: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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


// ── FeedPostCard ─────────────────────────────────────────────────────────────

interface FeedPostCardProps {
  post: PostRes;
  onReact: (postId: string, type: "like" | "dislike") => void;
}

const FeedPostCard = memo(function FeedPostCard({
  post,
  onReact,
}: FeedPostCardProps) {
  const router = useRouter();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visualItems: LightboxItem[] = post.media
    ?.filter((m) => m.type.startsWith("image/") || m.type.startsWith("video/"))
    .map((m) => ({
      src: `${API_URL}${m.url.replace(/^\/api/, "")}`,
      type: m.type.startsWith("image/") ? "image" : "video",
    })) ?? [];

  // Map original media index → visual index
  let vi = -1;
  const visualIndexOf = post.media?.map((m) =>
    m.type.startsWith("image/") || m.type.startsWith("video/") ? ++vi : -1
  ) ?? [];

  const handleLike = useCallback(() => {
    onReact(post.id, "like");
  }, [onReact, post.id]);

  const handleDislike = useCallback(() => {
    onReact(post.id, "dislike");
  }, [onReact, post.id]);

  const navigateToCommunity = useCallback(() => {
    router.push(`/discover/community/${post.communityId}`);
  }, [router, post.communityId]);

  const navigateToProfile = useCallback(() => {
    router.push(`/profile/${post.authorUsername}`);
  }, [router, post.authorUsername]);

  const navigateToPost = useCallback(() => {
    router.push(`/discover/post/${post.id}`);
  }, [router, post.id]);

  const openLightbox = useCallback((idx: number) => {
    setLightboxIndex(idx);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  return (
    <div className="relative bg-surface-container-lowest/65 border border-white/80 rounded-2xl overflow-hidden shadow-sm">
      {/* FRIEND_POSTED — author name chip */}
      {post.feedReasonCode === "FRIEND_POSTED" && (
        <div className="px-4 pt-3 pb-0">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary text-on-primary text-xs font-semibold">
            Friend
          </span>
        </div>
      )}

      {/* Community badge row — includes "Recommended" label on the right for RECOMMENDED_COMMUNITY */}
      <div className="flex items-center justify-between pr-4">
        <button
          onClick={navigateToCommunity}
          className="flex items-center gap-2 px-4 pt-3 pb-1 group"
        >
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
          >
            group
          </span>
          <span className="text-xs font-semibold text-primary group-hover:underline">
            {post.communityName}
          </span>
        </button>
        {post.feedReasonCode === "RECOMMENDED_COMMUNITY" && (
          <span className="text-xs text-on-surface-variant/60 pt-3 pb-1">Recommended</span>
        )}
      </div>

      {/* Author header */}
      <div
        className="flex items-center gap-3 px-4 pt-1 pb-2 cursor-pointer"
        onClick={navigateToProfile}
      >
        {post.authorProfileImage ? (
          <div className="w-9 h-9 shrink-0 rounded-full overflow-hidden">
            <Image
              src={post.authorProfileImage}
              alt={post.authorDisplayName || post.authorUsername}
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-9 h-9 shrink-0 rounded-full bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant/40 text-sm">
              person
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-on-surface truncate hover:text-primary transition-colors">
            {post.authorDisplayName || post.authorUsername}
          </p>
          <p className="text-xs text-on-surface-variant">
            {timeAgo(post.createdAt)}
          </p>
        </div>
      </div>

      {/* Title + content (truncated) */}
      {(post.title || post.content) && (
        <div
          className="px-4 pb-3 cursor-pointer space-y-1.5"
          onClick={navigateToPost}
        >
          {post.title && (
            <h3 className="text-[17px] font-bold leading-6 tracking-tight text-on-surface line-clamp-2">
              {post.title}
            </h3>
          )}
          {post.content && (
            <MarkdownContent
              content={post.content}
              truncate
              className={post.title ? "text-on-surface-variant/80" : "text-on-surface"}
            />
          )}
        </div>
      )}

      {/* Media */}
      {post.media?.length > 0 && (() => {
        const count = post.media.length;
        const inGrid = count > 1;
        return (
          <div className={`px-4 pb-3${inGrid ? " grid grid-cols-2 gap-1" : ""}`}>
            {post.media.map((m, i) => {
              const src = `${API_URL}${m.url.replace(/^\/api/, "")}`;
              const isImage = m.type.startsWith("image/");
              const isVideo = m.type.startsWith("video/");
              const isAudio = m.type.startsWith("audio/");
              if (!isImage && !isVideo && !isAudio) return null;
              const spanFull = inGrid && (isAudio || (count === 3 && i === 0));
              const vIdx = visualIndexOf[i];
              const mediaClass = inGrid && !isAudio
                ? "w-full h-64 object-cover rounded-xl"
                : isImage ? "max-w-full max-h-80 rounded-xl" : isVideo ? "max-w-full max-h-[480px] rounded-xl" : undefined;
              return (
                <div key={i} className={`relative${spanFull ? " col-span-2" : ""}`}>
                  {isImage ? (
                    <div onClick={() => openLightbox(vIdx)} className="cursor-zoom-in">
                      <AuthMedia src={src} type="image" className={mediaClass} />
                    </div>
                  ) : isVideo ? (
                    <div className="relative">
                      <AuthMedia src={src} type="video" className={mediaClass} />
                      <button
                        onClick={() => openLightbox(vIdx)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>fullscreen</span>
                      </button>
                    </div>
                  ) : (
                    <AuthMedia src={src} type="audio" />
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {lightboxIndex !== null && (
        <MediaLightbox
          items={visualItems}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNav={setLightboxIndex}
        />
      )}

      {/* FRIEND_LIKED — "liked by @..." row */}
      {post.feedReasonCode === "FRIEND_LIKED" && post.triggerFriendUsername && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-surface-container-high/30">
          {post.triggerFriendProfileImage ? (
            <div className="w-5 h-5 rounded-full overflow-hidden shrink-0">
              <Image
                src={post.triggerFriendProfileImage}
                alt={post.triggerFriendUsername}
                width={20}
                height={20}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-surface-variant/40" style={{ fontSize: 12 }}>person</span>
            </div>
          )}
          <span className="text-xs text-on-surface-variant">
            liked by <span className="font-semibold">@{post.triggerFriendUsername}</span>
          </span>
        </div>
      )}

      {/* Reaction bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-surface-container-high/50">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            post.userReaction === "like"
              ? "bg-primary/15 text-primary"
              : "text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          <span
            className="material-symbols-outlined text-base"
            style={{
              fontVariationSettings:
                post.userReaction === "like" ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            thumb_up
          </span>
          {post.likeCount > 0 && post.likeCount}
        </button>

        <button
          onClick={handleDislike}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            post.userReaction === "dislike"
              ? "bg-error/15 text-error"
              : "text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          <span
            className="material-symbols-outlined text-base"
            style={{
              fontVariationSettings:
                post.userReaction === "dislike" ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            thumb_down
          </span>
          {post.dislikeCount > 0 && post.dislikeCount}
        </button>

        <button
          onClick={navigateToPost}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors ml-auto"
        >
          <span className="material-symbols-outlined text-base">
            chat_bubble_outline
          </span>
          {post.commentCount > 0 ? post.commentCount : ""} Comment
          {post.commentCount !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
});

// ── Main component ───────────────────────────────────────────────────────────

export default function FeedContent() {
  const { posts, isLoading, isLoadingMore, hasMore, loadMore, handleReact, error } = useFeed();

  // Prefetch next page when user scrolls near bottom
  const { prefetchNextPage } = usePrefetchFeed();
  const [currentPage, setCurrentPage] = useState(0);

  const handleLoadMore = useCallback(async () => {
    setCurrentPage((p) => p + 1);
    await loadMore();
  }, [loadMore]);

  // Prefetch next page
  useEffect(() => {
    if (hasMore && !isLoadingMore) {
      prefetchNextPage(currentPage);
    }
  }, [hasMore, isLoadingMore, currentPage, prefetchNextPage]);

  if (error) {
    return (
      <section className="w-full max-w-4xl px-6 lg:px-12 py-8 lg:py-12">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <span className="material-symbols-outlined text-error text-5xl">error</span>
          <p className="text-on-surface font-bold text-lg">Failed to load feed</p>
          <p className="text-on-surface-variant text-sm text-center max-w-xs">
            Please try refreshing the page
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-4xl px-6 lg:px-12 py-8 lg:py-12">
      <header className="mb-10">
        <h2 className="text-display-lg mb-1 text-primary">Your Feed</h2>
        <p className="text-on-surface-variant text-sm">
          Latest posts from your communities
        </p>
      </header>

      <HotTakeCard />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-primary text-2xl">
              dynamic_feed
            </span>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <span className="material-symbols-outlined text-on-surface-variant/30 text-5xl">
            group
          </span>
          <p className="text-on-surface font-bold text-lg">No posts yet</p>
          <p className="text-on-surface-variant text-sm text-center max-w-xs">
            Join some communities to see their posts in your feed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <FeedPostCard key={post.id} post={post} onReact={handleReact} />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-6 py-2 rounded-full text-sm font-semibold text-primary border border-primary/30 hover:bg-primary/10 transition-colors disabled:opacity-50"
              >
                {isLoadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
