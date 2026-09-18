"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { NowPlayingMessage, NowPlayingState, PresenceStatus } from "@/types/chat";
import { chatWs } from "@/lib/ws";
import { fetchMusicCurrentlyPlaying } from "@/lib/appleMusic";
import { useNowPlayingStore } from "@/store/nowPlayingStore";

const POLL_MS = 25_000;

/**
 * App-wide now-playing presence (mount once, e.g. in the app shell).
 *
 * Receiving: keeps the store's per-user map live from NOW_PLAYING / PRESENCE events and asks
 * the server for partners' last-known state on connect (NOW_PLAYING_REQUEST — queued until
 * authenticated).
 *
 * Broadcasting: when the signed-in user has a connected music account, polls their
 * currently-playing track (~25s) and pushes a NOW_PLAYING_UPDATE only when it changes. The
 * server enforces the privacy opt-in, so this is a best-effort publisher — never audio, only
 * metadata.
 *
 * Ambient match: when our live track matches a partner's, surfaces a one-shot toast per
 * listening streak (mirrors the mobile banner).
 */
export function useNowPlayingPresence(musicConnected: boolean) {
  const { getToken, isSignedIn } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // Inbound presence.
  useEffect(() => {
    if (!isSignedIn) {
      useNowPlayingStore.getState().reset();
      return;
    }
    const { setForUser } = useNowPlayingStore.getState();
    const offNowPlaying = chatWs.on("NOW_PLAYING", (p: NowPlayingMessage) => {
      setForUser(p.userId, p.track ? { track: p.track, isPlaying: p.isPlaying } : null);
    });
    // A user going offline implies their now-playing is no longer current.
    const offPresence = chatWs.on("PRESENCE", (p: { userId: string; status: PresenceStatus }) => {
      if (p.status === "offline") setForUser(p.userId, null);
    });
    chatWs.send({ type: "NOW_PLAYING_REQUEST" });
    return () => {
      offNowPlaying();
      offPresence();
    };
  }, [isSignedIn]);

  // Outbound broadcast.
  useEffect(() => {
    if (!isSignedIn || !musicConnected) {
      useNowPlayingStore.getState().setMine(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastKey: string | null = null;

    const tick = async () => {
      try {
        const token = await getTokenRef.current();
        if (!token || cancelled) return;
        const current = await fetchMusicCurrentlyPlaying(token);
        if (cancelled) return;
        const state: NowPlayingState = current
          ? { track: { id: null, title: current.title, artist: current.artist, artworkUrl: current.coverUrl ?? null }, isPlaying: true }
          : { track: null, isPlaying: false };
        const key = state.track ? `${state.track.title}|${state.track.artist}|${state.isPlaying}` : "null";
        if (key !== lastKey) {
          lastKey = key;
          chatWs.send({ type: "NOW_PLAYING_UPDATE", track: state.track, isPlaying: state.isPlaying });
          useNowPlayingStore.getState().setMine(state);
        }
      } catch {
        // Offline / token expired — skip this tick.
      } finally {
        if (!cancelled) timer = setTimeout(() => void tick(), POLL_MS);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isSignedIn, musicConnected]);

  // Ambient match toast: once per shared listening streak.
  const announcedRef = useRef<Set<string>>(new Set());
  const mine = useNowPlayingStore((s) => s.mine);
  const byUser = useNowPlayingStore((s) => s.byUser);
  useEffect(() => {
    const norm = (v?: string | null) => (v ?? "").trim().toLowerCase();
    const myTrack = mine?.isPlaying ? mine.track : null;
    const myKey = myTrack ? `${norm(myTrack.title)}|${norm(myTrack.artist)}` : null;
    const current = new Set<string>();
    if (myKey) {
      for (const [userId, state] of Object.entries(byUser)) {
        if (!state.isPlaying || !state.track) continue;
        if (`${norm(state.track.title)}|${norm(state.track.artist)}` !== myKey) continue;
        const matchKey = `${userId}::${myKey}`;
        current.add(matchKey);
        if (!announcedRef.current.has(matchKey)) {
          toast("You're both vibing 🎶", { description: `You're both listening to ${myTrack!.title} right now` });
        }
      }
    }
    announcedRef.current = current;
  }, [mine, byUser]);
}

/** Last-known now-playing state for a single user (null when unknown / stopped). */
export function useUserNowPlaying(userId: string | null | undefined): NowPlayingState | null {
  return useNowPlayingStore((s) => (userId ? s.byUser[userId] ?? null : null));
}
