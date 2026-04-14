"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import SectionHeader from "@/components/discover/SectionHeader";
import { fetchSuggestedCommunities } from "@/lib/discovery-api";
import type { SuggestedCommunity } from "@/types/discovery";

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

function reasonLabel(community: SuggestedCommunity): string | null {
  if (community.matchedArtists.length > 0) {
    return community.matchedArtists.length === 1
      ? community.matchedArtists[0].name
      : `${community.matchedArtists.length} shared artists`;
  }
  if (community.matchedGenres.length > 0) {
    return community.matchedGenres[0].name;
  }
  if (community.countryMatch) return "Same country";
  if (community.sharedCommunityCount > 0)
    return `${community.sharedCommunityCount} shared ${community.sharedCommunityCount === 1 ? "community" : "communities"}`;
  return null;
}

function CommunityCardIcon({ community }: { community: SuggestedCommunity }) {
  if (community.iconType === "EMOJI" && community.iconEmoji) {
    return (
      <span
        className="absolute -top-2 -right-2 select-none pointer-events-none text-white/10"
        style={{ fontSize: 80, lineHeight: 1 }}
        aria-hidden
      >
        {community.iconEmoji}
      </span>
    );
  }
  if (community.iconType === "IMAGE" && community.iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={community.iconUrl}
        alt=""
        className="absolute -top-2 -right-2 w-20 h-20 object-cover opacity-10 pointer-events-none select-none"
        aria-hidden
      />
    );
  }
  return (
    <span
      className="material-symbols-outlined absolute -top-2 -right-2 text-white/10 select-none pointer-events-none"
      style={{ fontSize: 80, fontVariationSettings: "'FILL' 1" }}
      aria-hidden
    >
      music_note
    </span>
  );
}

function CommunityCard({
  community,
  color,
  onClick,
}: {
  community: SuggestedCommunity;
  color: string;
  onClick: () => void;
}) {
  const hint = reasonLabel(community);

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl text-left transition-transform hover:scale-[0.98] active:scale-95"
      style={{ backgroundColor: color, minHeight: 120 }}
    >
      <CommunityCardIcon community={community} />

      <div className="relative p-5 flex flex-col justify-end h-full">
        <h4 className="text-xl font-extrabold text-white mb-1 truncate">
          {community.name}
        </h4>
        {community.description && (
          <p className="text-xs text-white/70 font-medium mb-2 line-clamp-1">
            {community.description}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span
              className="material-symbols-outlined text-white/70"
              style={{ fontSize: 14 }}
            >
              group
            </span>
            <span className="text-xs font-semibold text-white/70">
              {formatMembers(community.memberCount)} members
            </span>
          </div>
          {hint && (
            <span className="text-[10px] font-bold text-white/80 bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full truncate max-w-[120px]">
              {hint}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function CommunityCardSkeleton() {
  return (
    <div
      className="rounded-2xl animate-pulse bg-surface-container-highest"
      style={{ minHeight: 120 }}
    />
  );
}

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
