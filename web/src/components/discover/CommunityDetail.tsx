"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

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
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorProfileImage: string;
  createdAt: string;
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

function AuthMedia({
  src,
  type,
  className,
}: {
  src: string;
  type: "image" | "video";
  className?: string;
}) {
  const { getToken } = useAuth();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(src, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        revoke = url;
        setBlobUrl(url);
      } catch {
        // ignore
      }
    })();
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [src, getToken]);

  if (!blobUrl) {
    return (
      <div className={`bg-surface-container-high flex items-center justify-center ${className}`}>
        <span className="material-symbols-outlined text-on-surface-variant/30 text-2xl animate-pulse">
          image
        </span>
      </div>
    );
  }

  if (type === "video") {
    return <video src={blobUrl} controls className={className} />;
  }

  return <img src={blobUrl} alt="Post media" className={className} />;
}

function PostCard({ post }: { post: PostRes }) {
  const isImage = post.mediaType?.startsWith("image/");
  const isVideo = post.mediaType?.startsWith("video/");

  return (
    <div className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl overflow-hidden shadow-sm">
      {/* Author header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        {post.authorProfileImage ? (
          <img
            src={post.authorProfileImage}
            alt={post.authorDisplayName || post.authorUsername}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant/40 text-sm">
              person
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-on-surface truncate">
            {post.authorDisplayName || post.authorUsername}
          </p>
          <p className="text-xs text-on-surface-variant">
            {timeAgo(post.createdAt)}
          </p>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p className="text-sm text-on-surface leading-relaxed px-4 pb-3">
          {post.content}
        </p>
      )}

      {/* Media */}
      {post.mediaUrl && isImage && (
        <AuthMedia
          src={`${API_URL}${post.mediaUrl.replace(/^\/api/, "")}`}
          type="image"
          className="w-full max-h-[500px] object-cover"
        />
      )}
      {post.mediaUrl && isVideo && (
        <AuthMedia
          src={`${API_URL}${post.mediaUrl.replace(/^\/api/, "")}`}
          type="video"
          className="w-full max-h-[500px]"
        />
      )}

      <div className="h-3" />
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
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f && f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = () => {
    if (!content.trim() && !file) return;
    onPost(content.trim(), file);
    setContent("");
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl overflow-hidden shadow-sm p-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share something with the community..."
        rows={3}
        className="w-full bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-outline resize-none"
      />

      {preview && (
        <div className="relative mt-2 mb-3">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-48 object-cover rounded-xl"
          />
          <button
            onClick={() => {
              setFile(null);
              setPreview(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
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
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
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
            accept="image/*,video/*"
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
          disabled={posting || (!content.trim() && !file)}
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

  const [community, setCommunity] = useState<CommunityRes | null>(null);
  const [members, setMembers] = useState<MemberRes[]>([]);
  const [posts, setPosts] = useState<PostRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [posting, setPosting] = useState(false);
  const [membersExpanded, setMembersExpanded] = useState(false);

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

  return (
    <div className="max-w-4xl mx-auto">
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

        {/* Posts */}
        <section className="pt-8">
          <h3 className="text-on-surface font-bold text-base mb-4">Posts</h3>

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
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
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
    </div>
  );
}
