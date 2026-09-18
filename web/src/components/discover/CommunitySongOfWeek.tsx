"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Heart, Pin, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  fetchSongOfWeek,
  submitSongOfWeekCandidate,
  toggleSongOfWeekVote,
  type SongOfWeekCandidate,
  type SongOfWeekPoll,
} from "@/lib/api";
import { MusicPickerModal } from "@/components/music/MusicPickerModal";
import { MusicCardArtwork } from "@/components/music/MusicCardArtwork";
import { PreviewButton } from "@/components/music/PreviewButton";
import type { TrackPayload } from "@/types/chat";

interface CommunitySongOfWeekProps {
  communityId: string;
  isMember: boolean;
}

function CandidateRow({
  candidate,
  isMember,
  onVote,
}: {
  candidate: SongOfWeekCandidate;
  isMember: boolean;
  onVote: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <MusicCardArtwork url={candidate.track.artworkUrl} alt={candidate.track.title} size={44}>
        {candidate.track.previewUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <PreviewButton
              trackId={`song-week:${candidate.id}`}
              previewUrl={candidate.track.previewUrl}
              className="h-6 w-6 rounded-full flex items-center justify-center bg-white/90 text-black"
              iconClassName="w-3 h-3"
            />
          </div>
        )}
      </MusicCardArtwork>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface truncate">{candidate.track.title}</p>
        <p className="text-xs text-on-surface-variant truncate">{candidate.track.artist}</p>
      </div>
      <button
        type="button"
        onClick={onVote}
        disabled={!isMember}
        title={isMember ? (candidate.votedByMe ? "Remove vote" : "Vote") : "Join the community to vote"}
        className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-55 ${
          candidate.votedByMe ? "bg-primary text-on-primary" : "bg-surface-container-high text-primary hover:bg-surface-container-highest"
        }`}
      >
        <Heart className="w-3.5 h-3.5" fill={candidate.votedByMe ? "currentColor" : "none"} />
        {candidate.voteCount}
      </button>
    </div>
  );
}

/** Weekly candidate list, reaction-style voting and pinned winner recap (mirrors mobile). */
export function CommunitySongOfWeek({ communityId, isMember }: CommunitySongOfWeekProps) {
  const { getToken } = useAuth();
  const [poll, setPoll] = useState<SongOfWeekPoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      setPoll(await fetchSongOfWeek(communityId, token));
    } catch {
      setPoll(null);
    } finally {
      setLoading(false);
    }
  }, [communityId, getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (track: TrackPayload) => {
    setPickerOpen(false);
    try {
      const token = await getToken();
      setPoll(await submitSongOfWeekCandidate(communityId, track as unknown as Record<string, unknown>, token));
      toast.success("Track nominated");
    } catch {
      toast.error("Couldn't nominate this track");
    }
  };

  const vote = async (candidateId: string) => {
    try {
      const token = await getToken();
      setPoll(await toggleSongOfWeekVote(communityId, candidateId, token));
    } catch {
      toast.error("Couldn't update your vote");
    }
  };

  if (loading) {
    return <div className="h-24 rounded-2xl bg-surface-container-lowest/65 border border-white/80 animate-pulse" />;
  }
  if (!poll) return null;

  const endsAt = new Date(poll.endsAt);
  const endsLabel = Number.isNaN(endsAt.getTime())
    ? ""
    : endsAt.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl shadow-sm p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Song of the Week</p>
          <p className="text-sm font-bold text-on-surface">Vote for this week&apos;s track</p>
          {endsLabel && <p className="text-[11px] text-on-surface-variant">Voting ends {endsLabel}</p>}
        </div>
        {isMember && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1 rounded-full bg-primary text-on-primary px-3 py-1.5 text-xs font-bold hover:opacity-90 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add track
          </button>
        )}
      </div>

      {poll.pinnedWinner && (
        <div className="mb-3 rounded-xl bg-primary/10 p-3">
          <p className="flex items-center gap-1 text-[11px] font-bold uppercase text-primary">
            <Pin className="w-3 h-3" />
            Pinned winner
          </p>
          <p className="mt-1 text-sm font-bold text-on-surface truncate">
            {poll.pinnedWinner.track.title} · {poll.pinnedWinner.track.artist}
          </p>
          {poll.recap && <p className="mt-0.5 text-xs text-on-surface-variant">{poll.recap}</p>}
        </div>
      )}

      {poll.candidates.length === 0 ? (
        <p className="py-3 text-center text-sm text-on-surface-variant">
          {isMember ? "Be the first to nominate a track." : "No tracks nominated yet."}
        </p>
      ) : (
        <div className="divide-y divide-surface-container">
          {poll.candidates.map((c) => (
            <CandidateRow key={c.id} candidate={c} isMember={isMember} onVote={() => void vote(c.id)} />
          ))}
        </div>
      )}

      {!isMember && (
        <p className="mt-2 text-center text-[11px] text-on-surface-variant">Join the community to nominate and vote.</p>
      )}

      {pickerOpen && (
        <MusicPickerModal
          title="Nominate a track"
          previewOnly
          onClose={() => setPickerOpen(false)}
          onPickTrack={(t) => void submit(t)}
        />
      )}
    </div>
  );
}
