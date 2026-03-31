"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import MarkdownContent from "@/components/ui/MarkdownContent";
import AuthMedia from "@/components/ui/AuthMedia";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
const PAGE_SIZE = 20;

// ── Types ────────────────────────────────────────────────────────────────────

interface PostMedia {
  url: string;
  type: string;
  order: number;
}

interface PostRes {
  id: string;
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

const FeedPostCard = memo(function FeedPostCard({
  post,
  onReact,
}: {
  post: PostRes;
  onReact: (postId: string, type: "like" | "dislike") => void;
}) {
  const router = useRouter();

  return (
    <div className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl overflow-hidden shadow-sm">
      {/* Community badge */}
      <button
        onClick={() => router.push(`/discover/community/${post.communityId}`)}
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

      {/* Author header */}
      <div
        className="flex items-center gap-3 px-4 pt-1 pb-2 cursor-pointer"
        onClick={() => router.push(`/profile/${post.authorUsername}`)}
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

      {/* Content (truncated) */}
      {post.content && (
        <div
          className="px-4 pb-3 cursor-pointer"
          onClick={() => router.push(`/discover/post/${post.id}`)}
        >
          <MarkdownContent
            content={post.content}
            truncate
            className="text-on-surface"
          />
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
            const type: "image" | "video" | "audio" = isImage ? "image" : isVideo ? "video" : "audio";
            const mediaClass = inGrid && !isAudio
              ? "w-full h-40 object-cover rounded-xl"
              : isImage ? "max-w-full max-h-80 rounded-xl" : isVideo ? "max-w-full max-h-[480px] rounded-xl" : undefined;
            return (
              <div key={i} className={spanFull ? "col-span-2" : undefined}>
                <AuthMedia src={src} type={type} className={mediaClass} />
              </div>
            );
          })}
        </div>
        );
      })()}
      )

      {/* Reaction bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-surface-container-high/50">
        <button
          onClick={() => onReact(post.id, "like")}
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
          onClick={() => onReact(post.id, "dislike")}
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
          onClick={() => router.push(`/discover/post/${post.id}`)}
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
  const { getToken } = useAuth();
  const [posts, setPosts] = useState<PostRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getTokenRef.current();
        const res = await fetch(
          `${API_URL}/posts/feed?page=0&size=${PAGE_SIZE}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok && !cancelled) {
          const data: PostRes[] = await res.json();
          setPosts(data);
          setHasMore(data.length === PAGE_SIZE);
          setPage(1);
        }
      } catch (err) {
        console.error("Failed to fetch feed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const token = await getTokenRef.current();
      const res = await fetch(
        `${API_URL}/posts/feed?page=${page}&size=${PAGE_SIZE}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data: PostRes[] = await res.json();
        setPosts((prev) => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
        setPage((p) => p + 1);
      }
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore]);

  const handleReact = useCallback(
    async (postId: string, type: "like" | "dislike") => {
      try {
        const token = await getTokenRef.current();
        const res = await fetch(`${API_URL}/posts/${postId}/react`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ type }),
        });
        if (res.ok) {
          const updated: PostRes = await res.json();
          setPosts((prev) =>
            prev.map((p) => (p.id === postId ? updated : p)),
          );
        }
      } catch (err) {
        console.error("React error:", err);
      }
    },
    [],
  );

  return (
    <section className="flex-1 max-w-4xl px-6 lg:px-12 py-8 lg:py-12">
      <header className="mb-10">
        <h2 className="text-display-lg mb-1">Your Feed</h2>
        <p className="text-on-surface-variant text-sm">
          Latest posts from your communities
        </p>
      </header>

      {loading ? (
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
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2 rounded-full text-sm font-semibold text-primary border border-primary/30 hover:bg-primary/10 transition-colors disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
