"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import MarkdownContent from "@/components/ui/MarkdownContent";
import AuthMedia from "@/components/ui/AuthMedia";
import MediaLightbox, { LightboxItem } from "@/components/ui/MediaLightbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
  onDelete,
  replyingTo,
  setReplyingTo,
  submittingReply,
  currentUsername,
  canModerate,
}: {
  comment: CommentRes;
  depth: number;
  onReact: (commentId: string, type: "like" | "dislike") => void;
  onReply: (parentCommentId: string, content: string) => void;
  onDelete: (commentId: string, hasReplies: boolean) => void;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  submittingReply: boolean;
  currentUsername?: string;
  canModerate?: boolean;
}) {
  const router = useRouter();
  const isReplying = replyingTo === comment.id;
  const maxVisibleDepth = 4;

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-surface-container-high pl-4" : ""}>
      <div className="py-3">
        {/* Author */}
        <div
          className={`flex items-center gap-2.5 mb-1.5 ${comment.authorUsername ? "cursor-pointer" : "cursor-default"}`}
          onClick={comment.authorUsername ? () => router.push(`/profile/${comment.authorUsername}`) : undefined}
        >
          {comment.authorProfileImage ? (
            <div className="w-7 h-7 shrink-0 rounded-full overflow-hidden">
              <Image
                src={comment.authorProfileImage}
                alt={comment.authorDisplayName || comment.authorUsername || "Deleted User"}
                width={28}
                height={28}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-7 h-7 shrink-0 rounded-full bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant/40 text-xs">
                person
              </span>
            </div>
          )}
          <span className="text-sm font-semibold text-on-surface hover:text-primary transition-colors">
            {comment.authorDisplayName || comment.authorUsername || "Deleted User"}
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

          {(currentUsername === comment.authorUsername || canModerate) && (
            <button
              onClick={() => onDelete(comment.id, comment.replies.length > 0)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-error/70 hover:text-error hover:bg-error/10 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                delete
              </span>
            </button>
          )}
        </div>

        {/* Reply form */}
        {isReplying && (
          <div className="mt-3">
            <CreateCommentForm
              onSubmit={(content) => {
                onReply(comment.id, content);
                setReplyingTo(null);
              }}
              placeholder={`Reply to ${comment.authorDisplayName || comment.authorUsername || "Deleted User"}...`}
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
              onDelete={onDelete}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              submittingReply={submittingReply}
              currentUsername={currentUsername}
              canModerate={canModerate}
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
  const { user: clerkUser } = useUser();

  const [post, setPost] = useState<PostRes | null>(null);
  const [comments, setComments] = useState<CommentRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [canModerate, setCanModerate] = useState(false);
  const [deleteCommentConfirm, setDeleteCommentConfirm] = useState<{ id: string; hasReplies: boolean } | null>(null);

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
      if (postData?.communityId) {
        const membershipRes = await fetch(`${API_URL}/communities/${postData.communityId}/membership`, { headers });
        if (membershipRes.ok) {
          const membership = await membershipRes.json();
          setCanModerate(membership.owner === true || membership.role === "admin");
        }
      }
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
        else toast.error("Failed to react");
      } catch (err) {
        console.error("React error:", err);
        toast.error("Failed to react");
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
          toast.success("Comment posted");
        } else {
          toast.error("Failed to post comment");
        }
      } catch (err) {
        console.error("Comment error:", err);
        toast.error("Failed to post comment");
      } finally {
        setSubmittingComment(false);
      }
    },
    [id, getToken],
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/comments/${commentId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to delete comment");
        const [commentsData, postData] = await Promise.all([
          fetch(`${API_URL}/comments/post/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
          fetch(`${API_URL}/posts/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : null),
        ]);
        setComments(commentsData);
        if (postData) setPost(postData);
        toast.success("Comment deleted");
      } catch {
        toast.error("Failed to delete comment");
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
        {/* Community */}
        <div className="px-5 pt-4 pb-1">
          <button
            onClick={() => router.push(`/discover/community/${post.communityId}`)}
            className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              group
            </span>
            {post.communityName}
          </button>
        </div>

        {/* Author header */}
        <div
          className={`flex items-center gap-3 px-5 pt-2 pb-3 ${post.authorUsername ? "cursor-pointer" : "cursor-default"}`}
          onClick={post.authorUsername ? () => router.push(`/profile/${post.authorUsername}`) : undefined}
        >
          {post.authorProfileImage ? (
            <div className="w-11 h-11 shrink-0 rounded-full overflow-hidden">
              <Image
                src={post.authorProfileImage}
                alt={post.authorDisplayName || post.authorUsername || "Deleted User"}
                width={44}
                height={44}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-11 h-11 shrink-0 rounded-full bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant/40 text-base">
                person
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-on-surface truncate hover:text-primary transition-colors">
              {post.authorDisplayName || post.authorUsername || "Deleted User"}
            </p>
            <p className="text-xs text-on-surface-variant">
              {post.authorUsername ? `@${post.authorUsername} · ` : ""}{timeAgo(post.createdAt)}
            </p>
          </div>
        </div>

        {/* Title */}
        {post.title?.trim() && (
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-on-surface px-5 pb-3">
            {post.title.trim()}
          </h1>
        )}

        {/* Full content */}
        {post.content && (
          <MarkdownContent
            content={post.content}
            className="text-on-surface px-5 pb-4"
          />
        )}

        {/* Media */}
        {post.media?.length > 0 && (() => {
          const count = post.media.length;
          const inGrid = count > 1;
          const visualItems: LightboxItem[] = post.media
            .filter((m) => m.type.startsWith("image/") || m.type.startsWith("video/"))
            .map((m) => ({
              src: `${API_URL}${m.url.replace(/^\/api/, "")}`,
              type: m.type.startsWith("image/") ? "image" : "video",
            }));
          let vi = -1;
          const visualIndexOf = post.media.map((m) =>
            m.type.startsWith("image/") || m.type.startsWith("video/") ? ++vi : -1
          );
          return (
            <>
              <div className={`px-5 pb-4${inGrid ? " grid grid-cols-2 gap-1" : ""}`}>
                {post.media.map((m, i) => {
                  const src = `${API_URL}${m.url.replace(/^\/api/, "")}`;
                  const isImage = m.type.startsWith("image/");
                  const isVideo = m.type.startsWith("video/");
                  const isAudio = m.type.startsWith("audio/");
                  if (!isImage && !isVideo && !isAudio) return null;
                  const spanFull = inGrid && (isAudio || (count === 3 && i === 0));
                  const vIdx = visualIndexOf[i];
                  const mediaClass = inGrid && !isAudio
                    ? "w-full h-72 object-cover rounded-xl"
                    : isImage ? "max-w-full max-h-[500px] rounded-xl"
                    : isVideo ? "max-w-full max-h-[600px] rounded-xl"
                    : undefined;
                  return (
                    <div key={i} className={`relative${spanFull ? " col-span-2" : ""}`}>
                      {isImage ? (
                        <div onClick={() => setLightboxIndex(vIdx)} className="cursor-zoom-in">
                          <AuthMedia src={src} type="image" className={mediaClass} />
                        </div>
                      ) : isVideo ? (
                        <div className="relative">
                          <AuthMedia src={src} type="video" className={mediaClass} />
                          <button
                            onClick={() => setLightboxIndex(vIdx)}
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
              {lightboxIndex !== null && (
                <MediaLightbox
                  items={visualItems}
                  index={lightboxIndex}
                  onClose={() => setLightboxIndex(null)}
                  onNav={setLightboxIndex}
                />
              )}
            </>
          );
        })()}

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
              onDelete={(commentId, hasReplies) => setDeleteCommentConfirm({ id: commentId, hasReplies })}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              submittingReply={submittingComment}
              currentUsername={clerkUser?.username ?? undefined}
              canModerate={canModerate}
            />
          ))}
        </div>
      )}

      <Dialog open={!!deleteCommentConfirm} onOpenChange={(open) => { if (!open) setDeleteCommentConfirm(null); }}>
        <DialogContent className="max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete comment?</DialogTitle>
            <DialogDescription>
              {deleteCommentConfirm?.hasReplies
                ? "This will also delete all replies to this comment. This action cannot be undone."
                : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteCommentConfirm(null)}
              className="px-4 py-2 rounded-full text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (deleteCommentConfirm) {
                  handleDeleteComment(deleteCommentConfirm.id);
                  setDeleteCommentConfirm(null);
                }
              }}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-error text-white hover:opacity-90 transition-opacity"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
