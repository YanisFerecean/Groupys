"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TurndownService from "turndown";
import MarkdownContent from "@/components/ui/MarkdownContent";
import AuthMedia from "@/components/ui/AuthMedia";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface CommunityRes {
  id: string;
  name: string;
  description: string;
  genre: string;
  country: string;
  imageUrl: string;
  tags: string[];
  artistId: number;
  memberCount: number;
  createdById: string;
  createdAt: string;
}

interface MemberRes {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  profileImage: string;
  role: string;
  joinedAt: string;
}

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

function formatCount(n: number): string {
  if (n >= 1_000_000_000)
    return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
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

const HERO_COLORS = [
  "from-violet-600 to-purple-900",
  "from-pink-600 to-rose-900",
  "from-cyan-600 to-teal-900",
  "from-amber-600 to-orange-900",
  "from-emerald-600 to-green-900",
  "from-indigo-600 to-blue-900",
];

// ── Sub-components ───────────────────────────────────────────────────────────

function MemberRow({ member }: { member: MemberRes }) {
  return (
    <div className="flex items-center gap-3 py-3 px-2">
      {member.profileImage ? (
        <img
          src={member.profileImage}
          alt={member.displayName || member.username}
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant/40 text-lg">
            person
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface truncate">
          {member.displayName || member.username}
        </p>
        <p className="text-xs text-on-surface-variant truncate">
          @{member.username}
        </p>
      </div>
      {member.role === "owner" && (
        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
          Owner
        </span>
      )}
      <span className="text-xs text-on-surface-variant">
        {timeAgo(member.joinedAt)}
      </span>
    </div>
  );
}


function PostCard({
  post,
  onReact,
  communityOwnerId,
  currentUserId,
  onDelete,
}: {
  post: PostRes;
  onReact: (postId: string, type: "like" | "dislike") => void;
  communityOwnerId?: string;
  currentUserId?: string;
  onDelete?: (postId: string) => void;
}) {
  const router = useRouter();
  const isImage = post.mediaType?.startsWith("image/");
  const isVideo = post.mediaType?.startsWith("video/");
  const isOwner = !!communityOwnerId && communityOwnerId === post.authorId;
  const canDelete =
    !!onDelete &&
    (currentUserId === post.authorId ||
      currentUserId === communityOwnerId);
  const isAudio = post.mediaType?.startsWith("audio/");

  return (
    <div
      className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:border-white transition-colors"
      onClick={() => router.push(`/discover/post/${post.id}`)}
    >
      {/* Author header */}
      <div
        className="flex items-center gap-3 px-4 pt-4 pb-2 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/profile/${post.authorUsername}`);
        }}
      >
        {post.authorProfileImage ? (
          <img
            src={post.authorProfileImage}
            alt={post.authorDisplayName || post.authorUsername}
            className="w-9 h-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 shrink-0 rounded-full bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant/40 text-sm">
              person
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-on-surface truncate hover:text-primary transition-colors">
              {post.authorDisplayName || post.authorUsername}
            </p>
            {isOwner && (
              <span className="text-[0.6rem] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                Owner
              </span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant">
            {timeAgo(post.createdAt)}
          </p>
        </div>
        {canDelete && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(post.id);
            }}
            className="p-1.5 rounded-full text-on-surface-variant/50 hover:text-error hover:bg-error/10 transition-colors shrink-0"
            title="Delete post"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              delete
            </span>
          </button>
        )}
      </div>

      {/* Content (truncated) */}
      {post.content && (
        <div className="px-4 pb-3">
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
      <div
        className="flex items-center gap-1 px-3 py-2 border-t border-surface-container-high/50"
        onClick={(e) => e.stopPropagation()}
      >
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
          {post.likeCount}
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
          {post.dislikeCount}
        </button>

        <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-on-surface-variant ml-auto">
          <span className="material-symbols-outlined text-base">
            chat_bubble_outline
          </span>
          {post.commentCount > 0 ? post.commentCount : 0}
        </span>
      </div>
    </div>
  );
}

type SortOption = "newest" | "oldest" | "most_liked" | "most_disliked" | "most_commented";

const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: "newest", label: "Newest", icon: "schedule" },
  { value: "oldest", label: "Oldest", icon: "history" },
  { value: "most_liked", label: "Most Liked", icon: "thumb_up" },
  { value: "most_disliked", label: "Most Disliked", icon: "thumb_down" },
  { value: "most_commented", label: "Most Commented", icon: "chat_bubble" },
];

function SortDropdown({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (v: SortOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SORT_OPTIONS.find((o) => o.value === value)!;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant bg-surface-container-high rounded-full px-3 py-1.5 hover:bg-surface-container-highest transition-colors"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
          {current.icon}
        </span>
        {current.label}
        <span
          className={`material-symbols-outlined transition-transform ${open ? "rotate-180" : ""}`}
          style={{ fontSize: 14 }}
        >
          expand_more
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[10rem] bg-surface-container-lowest border border-white/80 rounded-xl shadow-lg overflow-hidden py-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                opt.value === value
                  ? "text-primary bg-primary/10"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 16,
                  fontVariationSettings: opt.value === value ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {opt.icon}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CreatePostForm({
  onPost,
  posting,
}: {
  onPost: (content: string, file: File | null) => void;
  posting: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [, setTick] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Share something with the community...",
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "w-full min-h-[4.5rem] bg-transparent outline-none text-sm text-on-surface prose-editor",
      },
    },
    onTransaction() {
      setTick((t) => t + 1);
    },
  });

  const attachFile = useCallback((f: File | null) => {
    setFile(f);
    if (
      f &&
      (f.type.startsWith("image/") ||
        f.type.startsWith("video/") ||
        f.type.startsWith("audio/"))
    ) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    attachFile(e.target.files?.[0] || null);
  };

  const isAllowedMedia = (type: string) =>
    type.startsWith("image/") ||
    type.startsWith("video/") ||
    type.startsWith("audio/");

  // Handle paste & drop media on the editor area
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (isAllowedMedia(item.type)) {
          e.preventDefault();
          const f = item.getAsFile();
          if (f) attachFile(f);
          return;
        }
      }
    },
    [attachFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      const f = e.dataTransfer?.files?.[0];
      if (f && isAllowedMedia(f.type)) {
        e.preventDefault();
        attachFile(f);
      }
    },
    [attachFile],
  );

  const handleSubmit = () => {
    if (!editor) return;
    const html = editor.getHTML();
    const isEmpty = editor.isEmpty;
    if (isEmpty && !file) return;

    // Convert HTML to markdown for storage
    const td = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
    });
    const markdown = isEmpty ? "" : td.turndown(html);

    onPost(markdown.trim(), file);
    editor.commands.clearContent();
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const tbtn = (active: boolean) =>
    `p-1.5 rounded transition-colors ${
      active
        ? "bg-primary/15 text-primary"
        : "text-on-surface-variant hover:bg-surface-container-high"
    }`;

  return (
    <div
      className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl overflow-hidden shadow-sm p-4"
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <EditorContent editor={editor} />

      {/* Formatting toolbar */}
      {editor && (
        <div className="flex items-center gap-0.5 pb-2 mt-1 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (editor.isActive("heading", { level: 1 })) {
                editor.chain().focus().toggleHeading({ level: 1 }).run();
              } else if (editor.state.selection.$from.parent.textContent) {
                editor
                  .chain()
                  .focus()
                  .splitBlock()
                  .setHeading({ level: 1 })
                  .run();
              } else {
                editor.chain().focus().toggleHeading({ level: 1 }).run();
              }
            }}
            className={tbtn(editor.isActive("heading", { level: 1 }))}
            title="Heading"
          >
            <span className="text-xs font-bold">H</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={tbtn(editor.isActive("bold"))}
            title="Bold"
          >
            <span className="text-xs font-bold">B</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={tbtn(editor.isActive("italic"))}
            title="Italic"
          >
            <span className="text-xs italic">I</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={tbtn(editor.isActive("strike"))}
            title="Strikethrough"
          >
            <span className="text-xs line-through">S</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={tbtn(editor.isActive("code"))}
            title="Inline code"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16 }}
            >
              code
            </span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={tbtn(editor.isActive("blockquote"))}
            title="Quote"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16 }}
            >
              format_quote
            </span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={tbtn(editor.isActive("bulletList"))}
            title="List"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16 }}
            >
              format_list_bulleted
            </span>
          </button>
        </div>
      )}

      {preview && file && (
        <div className="relative mt-2 mb-3">
          {file.type.startsWith("video/") ? (
            <video
              src={preview}
              controls
              className="w-full max-h-48 rounded-xl"
            />
          ) : file.type.startsWith("audio/") ? (
            <div className="flex items-center gap-3 bg-surface-container-high rounded-xl px-4 py-3">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}
              >
                music_note
              </span>
              <audio src={preview} controls className="flex-1 h-8" />
            </div>
          ) : (
            <img
              src={preview}
              alt="Preview"
              className="w-full max-h-48 object-cover rounded-xl"
            />
          )}
          <button
            onClick={() => {
              setFile(null);
              setPreview(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className={`${file.type.startsWith("audio/") ? "absolute -top-1 -right-1" : "absolute top-2 right-2"} w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors`}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16 }}
            >
              close
            </span>
          </button>
        </div>
      )}

      {file && !preview && (
        <div className="flex items-center gap-2 mt-2 mb-3 bg-surface-container-high rounded-xl px-3 py-2">
          <span className="material-symbols-outlined text-on-surface-variant text-base">
            attach_file
          </span>
          <span className="text-xs text-on-surface-variant truncate flex-1">
            {file.name}
          </span>
          <button
            onClick={() => {
              setFile(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16 }}
            >
              close
            </span>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-surface-container-high">
        <div className="flex gap-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*,audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-lg">image</span>
          </button>
        </div>
        <button
          onClick={handleSubmit}
          disabled={posting || (!!editor?.isEmpty && !file)}
          className="px-4 py-1.5 rounded-full text-sm font-bold text-on-primary bg-primary hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {posting ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function CommunityDetail({ id }: { id: string }) {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();

  const [community, setCommunity] = useState<CommunityRes | null>(null);
  const [members, setMembers] = useState<MemberRes[]>([]);
  const [posts, setPosts] = useState<PostRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [posting, setPosting] = useState(false);
  const [membersExpanded, setMembersExpanded] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "most_liked" | "most_disliked" | "most_commented">("newest");

  const sortedPosts = useMemo(() => {
    const sorted = [...posts];
    switch (sortOrder) {
      case "newest":
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case "oldest":
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case "most_liked":
        return sorted.sort((a, b) => b.likeCount - a.likeCount);
      case "most_disliked":
        return sorted.sort((a, b) => b.dislikeCount - a.dislikeCount);
      case "most_commented":
        return sorted.sort((a, b) => b.commentCount - a.commentCount);
    }
  }, [posts, sortOrder]);

  const topContributors = useMemo(() => {
    const counts = new Map<string, { authorId: string; username: string; displayName: string; profileImage: string; count: number }>();
    for (const p of posts) {
      const existing = counts.get(p.authorId);
      if (existing) {
        existing.count++;
      } else {
        counts.set(p.authorId, {
          authorId: p.authorId,
          username: p.authorUsername,
          displayName: p.authorDisplayName,
          profileImage: p.authorProfileImage,
          count: 1,
        });
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  }, [posts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [communityData, membersData, membershipData, postsData] =
          await Promise.all([
            fetch(`${API_URL}/communities/${id}`, { headers }).then((r) =>
              r.ok ? r.json() : null,
            ),
            fetch(`${API_URL}/communities/${id}/members`, { headers }).then(
              (r) => (r.ok ? r.json() : []),
            ),
            fetch(`${API_URL}/communities/${id}/membership`, {
              headers,
            }).then((r) => (r.ok ? r.json() : { member: false })),
            fetch(`${API_URL}/posts/community/${id}`, { headers }).then((r) =>
              r.ok ? r.json() : [],
            ),
          ]);
        if (!cancelled) {
          setCommunity(communityData);
          setMembers(membersData);
          setJoined(membershipData.member);
          setPosts(postsData);
        }
      } catch (err) {
        console.error("Failed to fetch community:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, getToken]);

  const handleToggleJoin = useCallback(async () => {
    setJoining(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_URL}/communities/${id}/${joined ? "leave" : "join"}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Failed");
      const updated: CommunityRes = await res.json();
      setCommunity(updated);
      setJoined(!joined);

      const membersRes = await fetch(`${API_URL}/communities/${id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (membersRes.ok) setMembers(await membersRes.json());
    } catch (err) {
      console.error("Join/leave error:", err);
    } finally {
      setJoining(false);
    }
  }, [id, getToken, joined]);

  const handlePost = useCallback(
    async (content: string, file: File | null) => {
      setPosting(true);
      try {
        const token = await getToken();
        const formData = new FormData();
        formData.append("content", content);
        if (file) formData.append("file", file);

        const res = await fetch(`${API_URL}/posts/community/${id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) throw new Error("Failed to create post");
        const newPost: PostRes = await res.json();
        setPosts((prev) => [newPost, ...prev]);
      } catch (err) {
        console.error("Post error:", err);
      } finally {
        setPosting(false);
      }
    },
    [id, getToken],
  );

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
        if (!res.ok) throw new Error("Failed to react");
        const updated: PostRes = await res.json();
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? updated : p)),
        );
      } catch (err) {
        console.error("React error:", err);
      }
    },
    [getToken],
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/posts/${postId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to delete post");
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } catch (err) {
        console.error("Delete error:", err);
      }
    },
    [getToken],
  );

  const heroGradient = community
    ? HERO_COLORS[
        community.id
          .split("")
          .reduce((a, c) => a + c.charCodeAt(0), 0) % HERO_COLORS.length
      ]
    : HERO_COLORS[0];

  const visibleMembers = membersExpanded ? members : members.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-primary text-3xl">
            group
          </span>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <span className="material-symbols-outlined text-primary text-4xl">
          error_outline
        </span>
        <p className="text-on-surface font-bold text-lg">
          Community not found
        </p>
        <button
          onClick={() => router.back()}
          className="text-primary font-semibold text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  const owner = members.find((m) => m.role === "owner");
  const isCurrentUserOwner =
    !!owner && !!clerkUser && community?.createdById === clerkUser.id;
  const currentMember = clerkUser
    ? members.find((m) => m.username === clerkUser.username)
    : undefined;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero */}
      <div
        className={`relative h-64 sm:h-80 lg:h-96 -mx-px overflow-hidden rounded-b-3xl lg:rounded-3xl lg:mt-6 lg:mx-6 bg-gradient-to-br ${heroGradient}`}
      >
        <span
          className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/5 select-none pointer-events-none"
          style={{ fontSize: 240, fontVariationSettings: "'FILL' 1" }}
        >
          group
        </span>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 lg:px-8 pb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">
              arrow_back
            </span>
          </button>
          <h1 className="text-white text-3xl lg:text-4xl font-extrabold tracking-tight">
            {community.name}
          </h1>
          {community.country && (
            <p className="text-white/70 text-sm font-medium mt-1">
              {community.country}
            </p>
          )}
        </div>
      </div>

      <div className="px-6 lg:px-8">
        {/* Stats + Join */}
        <div className="flex items-center justify-between pt-6">
          <div className="flex gap-8">
            <div>
              <p className="text-primary font-extrabold text-xl">
                {formatCount(community.memberCount)}
              </p>
              <p className="text-on-surface-variant text-xs mt-0.5">members</p>
            </div>
            <div className="w-px bg-surface-container-highest" />
            <div>
              <p className="text-primary font-extrabold text-xl">
                {posts.length}
              </p>
              <p className="text-on-surface-variant text-xs mt-0.5">posts</p>
            </div>
          </div>
          <button
            onClick={handleToggleJoin}
            disabled={joining}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-colors ${
              joined
                ? "bg-surface-container-high text-on-surface hover:bg-surface-container"
                : "bg-primary text-on-primary hover:opacity-90"
            } disabled:opacity-50`}
          >
            {joining ? "..." : joined ? "Joined" : "Join Community"}
          </button>
        </div>

        {/* Tags */}
        {community.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-5">
            {community.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* About */}
        {community.description && (
          <section className="pt-8">
            <h3 className="text-on-surface font-bold text-base mb-2">About</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              {community.description}
            </p>
          </section>
        )}

        {/* Artist link */}
        {community.artistId && community.genre && (
          <section className="pt-6">
            <button
              onClick={() =>
                router.push(`/discover/artist/${community.artistId}`)
              }
              className="flex items-center gap-3 bg-surface-container-low rounded-2xl px-4 py-3 w-full text-left hover:bg-surface-container transition-colors"
            >
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontSize: 20 }}
              >
                person
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface truncate">
                  {community.genre}
                </p>
                <p className="text-xs text-on-surface-variant">View artist</p>
              </div>
              <span className="material-symbols-outlined text-on-surface/25 text-base">
                chevron_right
              </span>
            </button>
          </section>
        )}

        {/* Created by */}
        {owner && (
          <section className="pt-6">
            <p className="text-xs text-on-surface-variant">
              Created by{" "}
              <span className="font-semibold text-on-surface">
                {owner.displayName || owner.username}
              </span>
            </p>
          </section>
        )}

        {/* Two-column layout: Posts + Sidebar */}
        <div className="flex gap-8 pt-8">
          {/* Left: Posts + Members */}
          <div className="flex-1 min-w-0">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-on-surface font-bold text-base">Posts</h3>
                {posts.length > 1 && (
                  <SortDropdown value={sortOrder} onChange={setSortOrder} />
                )}
              </div>

              {joined && (
                <div className="mb-4">
                  <CreatePostForm onPost={handlePost} posting={posting} />
                </div>
              )}

              {posts.length === 0 ? (
                <p className="text-on-surface-variant text-sm">
                  No posts yet{joined ? " — be the first to share!" : "."}
                </p>
              ) : (
                <div className="space-y-3">
                  {sortedPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onReact={handleReact}
                      communityOwnerId={owner?.userId}
                      currentUserId={currentMember?.userId}
                      onDelete={handleDeletePost}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Members */}
            <section className="pt-8 pb-12">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-on-surface font-bold text-base">Members</h3>
                {members.length > 5 && (
                  <button
                    onClick={() => setMembersExpanded((e) => !e)}
                    className="text-primary text-sm font-semibold hover:opacity-80 transition-opacity"
                  >
                    {membersExpanded ? "Show less" : `Show all ${members.length}`}
                  </button>
                )}
              </div>
              {members.length === 0 ? (
                <p className="text-on-surface-variant text-sm">No members yet.</p>
              ) : (
                <div>
                  {visibleMembers.map((m) => (
                    <MemberRow key={m.id} member={m} />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right sidebar: Top Contributors */}
          {topContributors.length > 0 && (
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-24">
                <div className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl overflow-hidden shadow-sm p-4">
                  <h3 className="text-on-surface font-bold text-sm mb-3 flex items-center gap-2">
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
                    >
                      trophy
                    </span>
                    Top Contributors
                  </h3>
                  <div className="space-y-1">
                    {topContributors.map((user, i) => (
                      <button
                        key={user.authorId}
                        onClick={() => router.push(`/profile/${user.username}`)}
                        className="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-surface-container-high transition-colors text-left"
                      >
                        <span className="text-xs font-bold text-on-surface-variant w-5 text-center shrink-0">
                          {i + 1}
                        </span>
                        {user.profileImage ? (
                          <img
                            src={user.profileImage}
                            alt={user.displayName || user.username}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-on-surface-variant/40 text-sm">
                              person
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-on-surface truncate">
                            {user.displayName || user.username}
                          </p>
                          <p className="text-[0.65rem] text-on-surface-variant">
                            {user.count} post{user.count !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
