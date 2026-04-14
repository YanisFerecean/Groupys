"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import SectionHeader from "@/components/discover/SectionHeader";
import { fetchSuggestedCommunities } from "@/lib/discovery-api";
import type { SuggestedCommunity } from "@/types/discovery";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

function resolveImageUrl(url: string | null): string | null {
  if (!url) return null;
  // Stored paths are relative (e.g. /api/files/...) — prepend the API host
  return `${API_URL}${url.replace(/^\/api/, "")}`;
}

const COMMUNITY_COLORS = [
  "#7c3aed",
  "#be185d",
  "#0891b2",
  "#b45309",
  "#059669",
  "#6366f1",
];

function formatMembers(count: number): string {
  if (count >= 1000)
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(count);
}

// ── Friend avatars strip ───────────────────────────────────────────────────

function FriendAvatars({
  friends,
}: {
  friends: SuggestedCommunity["friendsInCommunity"];
}) {
  if (!friends || friends.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-2">
        {friends.slice(0, 3).map((f) =>
          f.profileImage ? (
            <Image
              key={f.userId}
              src={f.profileImage}
              alt={f.displayName ?? f.username}
              width={20}
              height={20}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-black/30"
            />
          ) : (
            <div
              key={f.userId}
              className="w-5 h-5 rounded-full bg-white/20 ring-1 ring-black/30 flex items-center justify-center"
            >
              <span
                className="material-symbols-outlined text-white"
                style={{ fontSize: 11 }}
              >
                person
              </span>
            </div>
          )
        )}
      </div>
      <span className="text-[10px] font-semibold text-white/75 leading-none">
        {friends.length === 1
          ? (friends[0].displayName ?? friends[0].username) + " joined"
          : `${friends.length} friends joined`}
      </span>
    </div>
  );
}

// ── Community card ─────────────────────────────────────────────────────────

function CommunityCard({
  community,
  color,
  onClick,
}: {
  community: SuggestedCommunity;
  color: string;
  onClick: () => void;
}) {
  const backgroundUrl = resolveImageUrl(community.bannerUrl ?? community.imageUrl);
  const hasBanner = !!backgroundUrl;
  const topArtist = (community.communityArtists ?? [])[0]?.name ?? null;

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl text-left transition-transform hover:scale-[0.98] active:scale-95 w-full"
      style={{
        minHeight: 160,
        backgroundColor: color,
        ...(hasBanner
          ? {
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
      }}
    >
      {/* Dark gradient overlay — always present so text is readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Decorative icon — only when no banner */}
      {!hasBanner && (
        <span
          className="absolute -top-2 -right-2 select-none pointer-events-none text-white/10"
          style={{ fontSize: 80, lineHeight: 1 }}
          aria-hidden
        >
          {community.iconType === "EMOJI" && community.iconEmoji
            ? community.iconEmoji
            : "♪"}
        </span>
      )}

      {/* Content */}
      <div className="relative p-4 flex flex-col justify-end h-full" style={{ minHeight: 160 }}>
        {/* Name */}
        <h4 className="text-lg font-extrabold text-white mb-0.5 truncate leading-tight">
          {community.name}
        </h4>

        {/* Top artist */}
        {topArtist && (
          <p className="text-xs font-semibold text-white/60 mb-1 truncate">
            {topArtist}
          </p>
        )}

        {/* Bottom row: members + friends */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <span
              className="material-symbols-outlined text-white/60"
              style={{ fontSize: 13 }}
            >
              group
            </span>
            <span className="text-[11px] font-semibold text-white/60">
              {formatMembers(community.memberCount)}
            </span>
          </div>
          <FriendAvatars friends={community.friendsInCommunity ?? []} />
        </div>
      </div>
    </button>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function CommunityCardSkeleton() {
  return (
    <div
      className="rounded-2xl animate-pulse bg-surface-container-highest"
      style={{ minHeight: 160 }}
    />
  );
}

// ── Section ────────────────────────────────────────────────────────────────

export default function CommunitiesSection() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [communities, setCommunities] = useState<SuggestedCommunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const data = await fetchSuggestedCommunities(token, 4, false);
        if (!cancelled) setCommunities(data);
      } catch (err) {
        console.error("Failed to fetch suggested communities:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  if (!loading && communities.length === 0) return null;

  return (
    <section className="mb-12 lg:mb-16">
      <SectionHeader title="Explore Communities" actionText="See All" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <CommunityCardSkeleton key={i} />
            ))
          : communities.map((community, index) => (
              <CommunityCard
                key={community.communityId}
                community={community}
                color={COMMUNITY_COLORS[index % COMMUNITY_COLORS.length]}
                onClick={() =>
                  router.push(`/discover/community/${community.communityId}`)
                }
              />
            ))}
      </div>
    </section>
  );
}
