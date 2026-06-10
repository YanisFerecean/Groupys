"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { NowPlayingMessage } from "@/types/chat";
import { chatWs } from "@/lib/ws";
import { fetchMusicCurrentlyPlaying } from "@/lib/appleMusic";
import { fetchUserByClerkId } from "@/lib/api";

const POLL_MS = 20_000;
const MIN_BROADCAST_GAP_MS = 5_000;

/**
 * Now-playing presence for a conversation.
 *
 * Broadcasting: if the signed-in user has a connected music account (same gate
 * the profile widget uses), poll their currently-playing track and broadcast it
 * over the chat socket — throttled, and withdrawn when nothing is playing.
 *
 * Receiving: track the other participant's broadcast and return it for the pill.
 */
export function useNowPlaying(otherUserId?: string | null) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [musicConnected, setMusicConnected] = useState(false);
  const [partner, setPartner] = useState<NowPlayingMessage | null>(null);

  // Resolve whether this user has a connected music account.
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      try {
        const token = await getToken();
        const bu = await fetchUserByClerkId(user.id, token);
        if (mounted) setMusicConnected(bu?.musicConnected === true);
      } catch {
        // leave disabled
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user, getToken]);

  // Broadcast our currently-playing track.
  useEffect(() => {
    if (!musicConnected) return;
    let cancelled = false;
    let lastKey = "";
    let lastSentAt = 0;

    const poll = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const track = await fetchMusicCurrentlyPlaying(token);
        if (cancelled) return;
        const key = track ? `${track.title}|${track.artist}` : "";
        const now = Date.now();
        if (key === lastKey || now - lastSentAt < MIN_BROADCAST_GAP_MS) return;
        lastKey = key;
        lastSentAt = now;
        chatWs.send({
          type: "NOW_PLAYING_UPDATE",
          track: track
            ? { title: track.title, artist: track.artist, artworkUrl: track.coverUrl }
            : null,
          isPlaying: !!track,
        });
      } catch {
        // ignore transient failures
      }
    };

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [musicConnected, getToken]);

  // Clear stale presence when switching conversations (render-phase reset).
  const [prevOther, setPrevOther] = useState<string | null>(otherUserId ?? null);
  if ((otherUserId ?? null) !== prevOther) {
    setPrevOther(otherUserId ?? null);
    setPartner(null);
  }

  // Receive the other participant's now-playing.
  useEffect(() => {
    if (!otherUserId) return;
    return chatWs.on("NOW_PLAYING", (p: NowPlayingMessage) => {
      if (p.userId !== otherUserId) return;
      setPartner(p.track ? p : null);
    });
  }, [otherUserId]);

  return { partnerNowPlaying: partner };
}
