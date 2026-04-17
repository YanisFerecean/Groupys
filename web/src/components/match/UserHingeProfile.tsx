"use client";

import { useMemo, useRef, useImperativeHandle, forwardRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Users, Globe } from "lucide-react";
import type { SuggestedUser } from "@/types/match";
import { parseWidgets, widgetsToProfile } from "@/lib/api";
import TopArtistsWidget from "@/components/profile/widgets/TopArtistsWidget";
import TopSongsWidget from "@/components/profile/widgets/TopSongsWidget";
import TopAlbumsWidget from "@/components/profile/widgets/TopAlbumWidget";

export interface HingeProfileHandle {
  scrollToTop: () => void;
}

interface Props {
  user: SuggestedUser;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface-container-low px-5 py-4 flex flex-col gap-2">
      {children}
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
      {text}
    </p>
  );
}

const UserHingeProfile = forwardRef<HingeProfileHandle, Props>(({ user }, ref) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    scrollToTop: () => {
      scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    },
  }));

  const profile = useMemo(
    () => widgetsToProfile(parseWidgets(user.widgets ?? null)),
    [user.widgets]
  );

  const displayName = user.displayName ?? user.username;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="flex flex-col gap-3 px-5 pb-40 max-w-lg mx-auto">
        {/* Profile photo */}
        <div className="relative w-full aspect-[3/3.5] rounded-[28px] overflow-hidden bg-surface-container-highest self-center mt-2">
          {user.profileImage ? (
            <Image
              src={user.profileImage}
              alt={displayName}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </div>
          )}
        </div>

        {/* Name + username */}
        <div className="flex flex-col gap-0.5 px-1">
          <p className="text-4xl font-extrabold tracking-tight text-on-surface truncate">
            {displayName}
          </p>
          <p className="text-base font-semibold text-on-surface-variant">
            @{user.username}
          </p>
        </div>

        {/* Bio */}
        {!!user.bio && (
          <SectionCard>
            <SectionLabel text="About" />
            <p className="text-[17px] font-medium leading-relaxed text-on-surface">
              {user.bio}
            </p>
          </SectionCard>
        )}

        {/* Artists you both vibe with */}
        {user.matchedArtists?.length > 0 && (
          <SectionCard>
            <SectionLabel text="Artists you both vibe with" />
            <div className="flex flex-wrap gap-2 mt-1">
              {user.matchedArtists.map((artist) => (
                <div key={artist.id} className="rounded-full bg-primary px-4 py-2">
                  <span className="text-sm font-bold text-on-primary">{artist.name}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Music widgets — 2-column grid */}
        {(profile.topAlbums?.length || profile.topArtists?.length || profile.topSongs?.length) ? (
          <div className="grid grid-cols-2 gap-3">
            {profile.topAlbums && profile.topAlbums.length > 0 && (
              <TopAlbumsWidget albums={profile.topAlbums} size="small" className="h-auto" />
            )}
            {profile.topArtists && profile.topArtists.length > 0 && (
              <TopArtistsWidget artists={profile.topArtists} size="small" className="h-auto" />
            )}
            {profile.topSongs && profile.topSongs.length > 0 && (
              <TopSongsWidget songs={profile.topSongs} size="small" className="h-auto" />
            )}
          </div>
        ) : null}

        {/* Shared genres */}
        {user.matchedGenres?.length > 0 && (
          <SectionCard>
            <SectionLabel text="Shared genres" />
            <div className="flex flex-wrap gap-2 mt-1">
              {user.matchedGenres.map((genre) => (
                <div
                  key={genre.id}
                  className="rounded-full border border-outline-variant px-4 py-2"
                >
                  <span className="text-sm font-bold text-on-surface">{genre.name}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* You two have in common */}
        {(user.mutualFollowCount > 0 || user.sharedCommunityCount > 0 || user.sameCountry) && (
          <SectionCard>
            <SectionLabel text="You two have in common" />
            <div className="flex flex-col gap-3 mt-1">
              {user.mutualFollowCount > 0 && (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                    <Users size={18} className="text-primary" />
                  </div>
                  <span className="text-base font-semibold text-on-surface">
                    {user.mutualFollowCount} mutual {user.mutualFollowCount === 1 ? "follow" : "follows"}
                  </span>
                </div>
              )}
              {user.sharedCommunityCount > 0 && (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                    <Globe size={18} className="text-primary" />
                  </div>
                  <span className="text-base font-semibold text-on-surface">
                    {user.sharedCommunityCount} shared {user.sharedCommunityCount === 1 ? "community" : "communities"}
                  </span>
                </div>
              )}
              {user.sameCountry && (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                    <span className="text-lg">🌍</span>
                  </div>
                  <span className="text-base font-semibold text-on-surface">Same country</span>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* View Profile link */}
        <Link
          href={`/profile/${user.username}`}
          className="self-start mt-1 rounded-full bg-surface-container px-5 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container-high transition-colors"
        >
          View Profile
        </Link>
      </div>
    </div>
  );
});

UserHingeProfile.displayName = "UserHingeProfile";
export default UserHingeProfile;
