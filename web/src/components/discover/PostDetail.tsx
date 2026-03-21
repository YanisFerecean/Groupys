"use client";

import { useCallback, useEffect, useState } from "react";
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

interface CommentRes {
  id: string;
  content: string;
  postId: string;
  parentCommentId: string | null;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorProfileImage: string;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  userReaction: "like" | "dislike" | null;
  replies: CommentRes[];
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


// ── CreateCommentForm ────────────────────────────────────────────────────────

function CreateCommentForm({
  onSubmit,
  placeholder,
  submitting,
  autoFocus,
}: {
  onSubmit: (content: string) => void;
  placeholder?: string;
  submitting: boolean;
  autoFocus?: boolean;
}) {
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit(content.trim());
    setContent("");
  };

  return (
    <div className="flex gap-3 items-end">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder ?? "Write a comment..."}
        rows={2}
        autoFocus={autoFocus}
        className="flex-1 bg-surface-container-low rounded-xl border border-surface-container-highest px-3 py-2 text-sm text-on-surface placeholder:text-outline resize-none outline-none focus:border-primary/50 transition-colors"
      />
      <button
        onClick={handleSubmit}
        disabled={submitting || !content.trim()}
        className="px-4 py-2 rounded-full text-sm font-bold text-on-primary bg-primary hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
      >
        {submitting ? "..." : "Post"}
      </button>
    </div>
  );
}

// ── CommentThread ────────────────────────────────────────────────────────────

function CommentThread({
  comment,
  depth,
  onReact,
  onReply,
  replyingTo,
  setReplyingTo,
  submittingReply,
}: {
  comment: CommentRes;
  depth: number;
  onReact: (commentId: string, type: "like" | "dislike") => void;
  onReply: (parentCommentId: string, content: string) => void;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  submittingReply: boolean;
}) {
  const router = useRouter();
  const isReplying = replyingTo === comment.id;
  const maxVisibleDepth = 4;

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-surface-container-high pl-4" : ""}>
      <div className="py-3">
        {/* Author */}
        <div
          className="flex items-center gap-2.5 mb-1.5 cursor-pointer"
          onClick={() => router.push(`/profile/${comment.authorUsername}`)}
        >
          {comment.authorProfileImage ? (
            <img
              src={comment.authorProfileImage}
              alt={comment.authorDisplayName || comment.authorUsername}
              className="w-7 h-7 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 shrink-0 rounded-full bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant/40 text-xs">
                person
              </span>
            </div>
          )}
          <span className="text-sm font-semibold text-on-surface hover:text-primary transition-colors">
            {comment.authorDisplayName || comment.authorUsername}
          </span>
          <span className="text-xs text-on-surface-variant">
            {timeAgo(comment.createdAt)}
          </span>
        </div>

        {/* Content */}
        <p className="text-sm text-on-surface leading-relaxed mb-2">
          {comment.content}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onReact(comment.id, "like")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
              comment.userReaction === "like"
                ? "bg-primary/15 text-primary"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 14,
                fontVariationSettings:
                  comment.userReaction === "like" ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              thumb_up
            </span>
            {comment.likeCount > 0 && comment.likeCount}
          </button>

          <button
            onClick={() => onReact(comment.id, "dislike")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
              comment.userReaction === "dislike"
                ? "bg-error/15 text-error"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 14,
                fontVariationSettings:
                  comment.userReaction === "dislike" ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              thumb_down
            </span>
            {comment.dislikeCount > 0 && comment.dislikeCount}
          </button>

          {depth < maxVisibleDepth && (
            <button
              onClick={() => setReplyingTo(isReplying ? null : comment.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                reply
              </span>
              Reply
            </button>
          )}

          <button className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors ml-auto">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              flag
            </span>
            Report
          </button>
        </div>

        {/* Reply form */}
        {isReplying && (
          <div className="mt-3">
            <CreateCommentForm
              onSubmit={(content) => {
                onReply(comment.id, content);
                setReplyingTo(null);
              }}
              placeholder={`Reply to ${comment.authorDisplayName || comment.authorUsername}...`}
              submitting={submittingReply}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Nested replies */}
      {comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onReact={onReact}
              onReply={onReply}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              submittingReply={submittingReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function PostDetail({ id }: { id: string }) {
  const router = useRouter();
  const { getToken } = useAuth();

  const [post, setPost] = useState<PostRes | null>(null);
  const [comments, setComments] = useState<CommentRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [postData, commentsData] = await Promise.all([
        fetch(`${API_URL}/posts/${id}`, { headers }).then((r) =>
          r.ok ? r.json() : null,
        ),
        fetch(`${API_URL}/comments/post/${id}`, { headers }).then((r) =>
          r.ok ? r.json() : [],
        ),
      ]);
      setPost(postData);
      setComments(commentsData);
    } catch (err) {
      console.error("Failed to fetch post:", err);
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePostReact = useCallback(
    async (type: "like" | "dislike") => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/posts/${id}/react`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ type }),
        });
        if (res.ok) setPost(await res.json());
      } catch (err) {
        console.error("React error:", err);
      }
    },
    [id, getToken],
  );

  const handleCommentReact = useCallback(
    async (commentId: string, type: "like" | "dislike") => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/comments/${commentId}/react`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ type }),
        });
        if (res.ok) {
          // Re-fetch all comments to get updated tree
          const commentsRes = await fetch(`${API_URL}/comments/post/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (commentsRes.ok) setComments(await commentsRes.json());
        }
      } catch (err) {
        console.error("Comment react error:", err);
      }
    },
    [id, getToken],
  );

  const handleComment = useCallback(
    async (content: string, parentCommentId?: string) => {
      setSubmittingComment(true);
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/comments/post/${id}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content, parentCommentId: parentCommentId ?? null }),
        });
        if (res.ok) {
          // Re-fetch comments for full tree
          const commentsRes = await fetch(`${API_URL}/comments/post/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (commentsRes.ok) setComments(await commentsRes.json());
          // Update comment count on post
          setPost((prev) =>
            prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev,
          );
        }
      } catch (err) {
        console.error("Comment error:", err);
      } finally {
        setSubmittingComment(false);
      }
    },
    [id, getToken],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-primary text-3xl">
            article
          </span>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <span className="material-symbols-outlined text-primary text-4xl">
          error_outline
        </span>
        <p className="text-on-surface font-bold text-lg">Post not found</p>
        <button
          onClick={() => router.back()}
          className="text-primary font-semibold text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  const isImage = post.mediaType?.startsWith("image/");
  const isVideo = post.mediaType?.startsWith("video/");
  const isAudio = post.mediaType?.startsWith("audio/");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-12">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="mb-5 w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
      >
        <span className="material-symbols-outlined text-xl">arrow_back</span>
      </button>

      {/* Post card */}
      <div className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl overflow-hidden shadow-sm">
        {/* Author header */}
        <div
          className="flex items-center gap-3 px-5 pt-5 pb-3 cursor-pointer"
          onClick={() => router.push(`/profile/${post.authorUsername}`)}
        >
          {post.authorProfileImage ? (
            <img
              src={post.authorProfileImage}
              alt={post.authorDisplayName || post.authorUsername}
              className="w-11 h-11 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="w-11 h-11 shrink-0 rounded-full bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant/40 text-base">
                person
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-on-surface truncate hover:text-primary transition-colors">
              {post.authorDisplayName || post.authorUsername}
            </p>
            <p className="text-xs text-on-surface-variant">
              @{post.authorUsername} &middot; {timeAgo(post.createdAt)}
            </p>
          </div>
        </div>

        {/* Full content */}
        {post.content && (
          <MarkdownContent
            content={post.content}
            className="text-on-surface px-5 pb-4"
          />
        )}

        {/* Media */}
        {post.mediaUrl && isImage && (
          <div className="px-5 pb-4">
            <AuthMedia
              src={`${API_URL}${post.mediaUrl.replace(/^\/api/, "")}`}
              type="image"
              className="w-full max-h-[600px] object-cover rounded-xl"
            />
          </div>
        )}
        {post.mediaUrl && isVideo && (
          <div className="px-5 pb-4">
            <AuthMedia
              src={`${API_URL}${post.mediaUrl.replace(/^\/api/, "")}`}
              type="video"
              className="w-full max-h-[600px] rounded-xl"
            />
          </div>
        )}
        {post.mediaUrl && isAudio && (
          <div className="px-5 pb-4">
            <AuthMedia
              src={`${API_URL}${post.mediaUrl.replace(/^\/api/, "")}`}
              type="audio"
            />
          </div>
        )}

        {/* Reaction bar */}
        <div className="flex items-center gap-1 px-4 py-2.5 border-t border-surface-container-high/50">
          <button
            onClick={() => handlePostReact("like")}
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
            onClick={() => handlePostReact("dislike")}
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

          <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-on-surface-variant ml-auto">
            <span className="material-symbols-outlined text-base">
              chat_bubble_outline
            </span>
            {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
          </span>
        </div>
      </div>

      {/* Comment form */}
      <div className="mt-6">
        <h3 className="text-on-surface font-bold text-base mb-3">Comments</h3>
        <div className="mb-6">
          <CreateCommentForm
            onSubmit={(content) => handleComment(content)}
            submitting={submittingComment}
          />
        </div>
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="text-on-surface-variant text-sm">
          No comments yet — be the first to share your thoughts!
        </p>
      ) : (
        <div className="space-y-1">
          {comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              depth={0}
              onReact={handleCommentReact}
              onReply={(parentId, content) => handleComment(content, parentId)}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              submittingReply={submittingComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
