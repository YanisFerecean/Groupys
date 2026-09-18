"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Headphones, User } from "lucide-react";
import { useNowPlayingStore } from "@/store/nowPlayingStore";
import { safeHttpUrl } from "@/lib/mediaUrl";
import type { CommunityMember } from "@/lib/api";

interface CommunityListeningRosterProps {
  members: CommunityMember[];
}

/**
 * "Listening now" roster: community members with a live, opted-in now-playing track. Reuses the
 * app-wide NOW_PLAYING presence feed (the server fans it out to community co-members too).
 */
export function CommunityListeningRoster({ members }: CommunityListeningRosterProps) {
  const byUser = useNowPlayingStore((s) => s.byUser);
  const listening = useMemo(
    () =>
      members
        .map((member) => ({ member, np: byUser[member.userId] }))
        .filter((entry) => entry.np?.track && entry.np.isPlaying),
    [members, byUser]
  );

  if (listening.length === 0) return null;

  return (
    <div className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl shadow-sm p-4">
      <h3 className="text-on-surface font-bold text-sm mb-3 flex items-center gap-1.5">
        <Headphones className="w-4 h-4 text-tertiary" />
        Listening now
      </h3>
      <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-1">
        {listening.map(({ member, np }) => {
          const avatar = safeHttpUrl(member.profileImage);
          const track = np!.track!;
          return (
            <Link
              key={member.userId}
              href={`/profile/${member.username}`}
              title={`${member.displayName || member.username} — ♫ ${track.title}${track.artist ? ` — ${track.artist}` : ""}`}
              className="flex flex-col items-center w-[72px] shrink-0 group"
            >
              <span className="w-13 h-13 rounded-full border-2 border-tertiary overflow-hidden flex items-center justify-center bg-surface-container-high">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-on-surface-variant" />
                )}
              </span>
              <span className="mt-1 text-[11px] font-semibold text-on-surface truncate w-full text-center group-hover:text-primary">
                {member.displayName || member.username}
              </span>
              <span className="text-[10px] text-on-surface-variant truncate w-full text-center">♫ {track.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
