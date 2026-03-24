"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import MarkdownContent from "@/components/ui/MarkdownContent";
import AuthMedia from "@/components/ui/AuthMedia";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface PostRes {
  id: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
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

function FeedPostCard({
  post,
  onReact,
}: {
  post: PostRes;
  onReact: (postId: string, type: "like" | "dislike") => void;
}) {
  const router = useRouter();
  const isImage = post.mediaType?.startsWith("image/");
  const isVideo = post.mediaType?.startsWith("video/");
  const isAudio = post.mediaType?.startsWith("audio/");

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
          <Image
            src={post.authorProfileImage}
            alt={post.authorDisplayName || post.authorUsername}
            width={36}
            height={36}
            className="shrink-0 rounded-full object-cover"
          />
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
      {post.mediaUrl && isImage && (
        <div className="px-4 pb-3">
          <AuthMedia
            src={`${API_URL}${post.mediaUrl.replace(/^\/api/, "")}`}
            type="image"
            className="w-full rounded-xl"
          />
        </div>
      )}
      {post.mediaUrl && isVideo && (
        <div className="px-4 pb-3">
          <AuthMedia
            src={`${API_URL}${post.mediaUrl.replace(/^\/api/, "")}`}
            type="video"
            className="w-full rounded-xl"
          />
        </div>
      )}
      {post.mediaUrl && isAudio && (
        <div className="px-4 pb-3">
          <AuthMedia
            src={`${API_URL}${post.mediaUrl.replace(/^\/api/, "")}`}
            type="audio"
          />
        </div>
      )}

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
}

// ── Main component ───────────────────────────────────────────────────────────

export default function FeedContent() {
  const { getToken } = useAuth();
  const [posts, setPosts] = useState<PostRes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/posts/feed`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) {
          setPosts(await res.json());
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
  }, [getToken]);

  const handleReact = useCallback(
    async (postId: string, type: "like" | "dislike") => {
      try {
        const token = await getToken();
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
    [getToken],
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
        </div>
      )}
    </section>
  );
}
