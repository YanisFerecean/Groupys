"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useProfileCustomization } from "@/hooks/useProfileCustomization";
import { useUser, useAuth } from "@clerk/nextjs";
import { fetchMyAlbumRatings } from "@/lib/api";
import Image from "next/image";
import ProfileHeader from "./ProfileHeader";
import ProfileWidgetGrid from "./ProfileWidgetGrid";
import ProfileEditDrawer from "./ProfileEditDrawer";
import MarkdownContent from "@/components/ui/MarkdownContent";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

type Tab = "overview" | "posts" | "likes" | "communities";

interface PostRes {
  id: string;
  content: string;
  communityName: string;
  authorUsername: string;
  authorDisplayName: string;
  authorProfileImage: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
}

interface CommunityRes {
  id: string;
  name: string;
  genre: string;
  imageUrl: string | null;
  memberCount: number;
  tags: string[];
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function PostList({ posts, loading, onClickPost }: {
  posts: PostRes[];
  loading: boolean;
  onClickPost: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 rounded-full bg-surface-container-high animate-pulse" />
      </div>
    );
  }
  if (!posts.length) {
    return (
      <div className="flex flex-col items-center py-16 gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined text-4xl">article</span>
        <p className="text-sm font-medium">No posts yet</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <div
          key={post.id}
          onClick={() => onClickPost(post.id)}
          className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl px-4 py-3 cursor-pointer hover:border-white transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            {post.authorProfileImage ? (
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                <Image src={post.authorProfileImage} alt={post.authorDisplayName || post.authorUsername} width={28} height={28} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-surface-container-high shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-xs text-on-surface-variant/40">person</span>
              </div>
            )}
            <span className="text-xs text-on-surface-variant">{timeAgo(post.createdAt)}</span>
            <span className="text-xs text-on-surface-variant/50 ml-auto">{post.communityName}</span>
          </div>
          {post.content && (
            <MarkdownContent content={post.content} truncate className="text-sm text-on-surface" />
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">thumb_up</span>
              {post.likeCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">chat_bubble_outline</span>
              {post.commentCount}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CommunityList({ communities, loading, onClickCommunity }: {
  communities: CommunityRes[];
  loading: boolean;
  onClickCommunity: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 rounded-full bg-surface-container-high animate-pulse" />
      </div>
    );
  }
  if (!communities.length) {
    return (
      <div className="flex flex-col items-center py-16 gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined text-4xl">group</span>
        <p className="text-sm font-medium">No communities yet</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {communities.map((c) => (
        <div
          key={c.id}
          onClick={() => onClickCommunity(c.id)}
          className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl px-4 py-3 cursor-pointer hover:border-white transition-colors flex items-center gap-3"
        >
          {c.imageUrl ? (
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
              <Image src={`${API_URL}${c.imageUrl.replace(/^\/api/, "")}`} alt={c.name} width={40} height={40} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-primary/10 shrink-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">group</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-on-surface truncate">{c.name}</p>
            <p className="text-xs text-on-surface-variant">{c.memberCount} members</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function useSpotifyCallback() {
  const searchParams = useSearchParams();
  const spotifyParam = searchParams.get("spotify");
  return spotifyParam === "connected"
    ? "connected"
    : spotifyParam === "error"
      ? "error"
      : null;
}

export default function ProfileView() {
  const {
    profile,
    updateProfile,
    updateUsername,
    updateProfileImage,
    removeProfileImage,
    isLoaded,
    isSaving,
    spotifyConnected,
    setSpotifyConnected,
  } = useProfileCustomization();
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const spotifyCallback = useSpotifyCallback();
  const [albumsRatedCount, setAlbumsRatedCount] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as Tab) ?? "overview";

  // Tab data
  const [posts, setPosts] = useState<PostRes[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [likes, setLikes] = useState<PostRes[]>([]);
  const [likesLoading, setLikesLoading] = useState(false);
  const [communities, setCommunities] = useState<CommunityRes[]>([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(false);

  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  useEffect(() => {
    (async () => {
      try {
        const token = await getTokenRef.current();
        const ratings = await fetchMyAlbumRatings(token);
        setAlbumsRatedCount(ratings.length);
      } catch {
        // silently fail
      }
    })();
  }, []);

  const fetchPosts = useCallback(async () => {
    if (posts.length) return;
    setPostsLoading(true);
    try {
      const token = await getTokenRef.current();
      const res = await fetch(`${API_URL}/posts/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPosts(await res.json());
    } catch { /* silent */ } finally {
      setPostsLoading(false);
    }
  }, [posts.length]);

  const fetchLikes = useCallback(async () => {
    if (likes.length) return;
    setLikesLoading(true);
    try {
      const token = await getTokenRef.current();
      const res = await fetch(`${API_URL}/posts/liked`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setLikes(await res.json());
    } catch { /* silent */ } finally {
      setLikesLoading(false);
    }
  }, [likes.length]);

  const fetchCommunities = useCallback(async () => {
    if (communities.length) return;
    setCommunitiesLoading(true);
    try {
      const token = await getTokenRef.current();
      const res = await fetch(`${API_URL}/communities/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCommunities(await res.json());
    } catch { /* silent */ } finally {
      setCommunitiesLoading(false);
    }
  }, [communities.length]);

  useEffect(() => {
    if (activeTab === "posts") fetchPosts();
    if (activeTab === "likes") fetchLikes();
    if (activeTab === "communities") fetchCommunities();
  }, [activeTab, fetchPosts, fetchLikes, fetchCommunities]);

  // Open the editor drawer when arriving from Spotify OAuth callback
  const [isEditing, setIsEditing] = useState(spotifyCallback === "connected");

  // Mark spotify as connected & clean up URL param
  useEffect(() => {
    if (!spotifyCallback) return;
    if (spotifyCallback === "connected") {
      setSpotifyConnected(true);
    }
    router.replace("/profile", { scroll: false });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user || !isLoaded) return null;

  const clerkName = user.fullName ?? user.username ?? "Music Fan";
  const memberYear = new Date(user.createdAt!).getFullYear();

  return (
    <div
      style={
        profile.accentColor
          ? ({ "--profile-accent": profile.accentColor } as React.CSSProperties)
          : undefined
      }
    >
      <ProfileHeader
        profile={profile}
        avatarUrl={user.imageUrl}
        clerkName={clerkName}
        username={user.username ?? ""}
        albumsRatedCount={albumsRatedCount}
        onEditClick={() => setIsEditing(true)}
      />

      {activeTab === "overview" && (
        <ProfileWidgetGrid
          profile={profile}
          username={user.username ?? ""}
          spotifyConnected={spotifyConnected}
          isEditing={true}
          onReorder={(newOrder) => updateProfile({ ...profile, widgetOrder: newOrder })}
          onSettingsChange={(type, color, size) => {
            const colorKey =
              type === "topAlbums" ? "albumsContainerColor" :
              type === "topSongs" ? "songsContainerColor" :
              type === "topArtists" ? "artistsContainerColor" :
              type === "lastRatedAlbum" ? "lastRatedAlbumContainerColor" :
              type === "currentlyListening" ? "currentlyListeningContainerColor" :
              type === "hotTake" ? "hotTakeContainerColor" : null;
            const updates = { ...profile, widgetSizes: { ...(profile.widgetSizes ?? {}), [type]: size } };
            if (colorKey) (updates as Record<string, unknown>)[colorKey] = color;
            updateProfile(updates);
          }}
        />
      )}
      {activeTab !== "overview" && (
        <div className="px-6 md:px-12 py-8">
          {activeTab === "posts" && (
            <PostList
              posts={posts}
              loading={postsLoading}
              onClickPost={(id) => router.push(`/discover/post/${id}`)}
            />
          )}
          {activeTab === "likes" && (
            <PostList
              posts={likes}
              loading={likesLoading}
              onClickPost={(id) => router.push(`/discover/post/${id}`)}
            />
          )}
          {activeTab === "communities" && (
            <CommunityList
              communities={communities}
              loading={communitiesLoading}
              onClickCommunity={(id) => router.push(`/discover/community/${id}`)}
            />
          )}
        </div>
      )}

      <div className="px-6 md:px-12 pb-6 text-center">
        <p className="text-xs text-on-surface-variant/50 font-medium">Member since {memberYear}</p>
      </div>

      <ProfileEditDrawer
        open={isEditing}
        onOpenChange={setIsEditing}
        profile={profile}
        currentUsername={user.username ?? ""}
        currentAvatarUrl={user.imageUrl}
        onSave={updateProfile}
        onUpdateUsername={updateUsername}
        onUpdateProfileImage={updateProfileImage}
        onRemoveProfileImage={removeProfileImage}
        isSaving={isSaving}
        spotifyConnected={spotifyConnected}
        initialTab={spotifyCallback === "connected" ? "widgets" : "profile"}
      />
    </div>
  );
}
