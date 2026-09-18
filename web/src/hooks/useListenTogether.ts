"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TrackPayload, TrackRef } from "@/types/chat";
import { chatWs } from "@/lib/ws";
import { audioPlayer } from "@/lib/audioPlayer";

export interface RoomState {
  active: boolean;
  isHost: boolean;
  joined: boolean;
  hostUserId?: string;
  track: TrackRef | null;
  positionMs: number;
  isPlaying: boolean;
  /**
   * The host is driving a full-song timeline (they have Apple Music on the native app). The web
   * only has the 30s preview, so in a full room a follower plays the preview freely instead of
   * chasing a clock it can't follow — same fallback the mobile app applies for non-subscribers.
   */
  full: boolean;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
}

const EMPTY: RoomState = {
  active: false,
  isHost: false,
  joined: false,
  track: null,
  positionMs: 0,
  isPlaying: false,
  full: false,
};

const DRIFT_TOLERANCE_S = 1.5;
const PREVIEW_MAX_S = 29;
const HEARTBEAT_MS = 2000;
const REACTION_TTL_MS = 2500;
const MAX_FLOATING = 12;

interface RoomStatePayload {
  conversationId: string;
  hostUserId?: string;
  track?: TrackRef | null;
  positionMs?: number;
  isPlaying?: boolean;
  full?: boolean;
}

/**
 * Listen Together: a synced 30s-preview session over the chat socket. Honors Apple's terms —
 * no audio crosses the wire, only a track ref, position, play/pause and the `full` flag.
 *
 * The host plays a track and heartbeats ROOM_STATE (~2s); followers explicitly Join (browser
 * autoplay needs a gesture) and then correct drift toward the host. Everyone can float emoji
 * reactions into the bar.
 */
export function useListenTogether(conversationId: string | null, myUserId: string | null) {
  const [room, setRoom] = useState<RoomState>(EMPTY);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);

  // Playback resources live in refs so socket handlers never close over stale state.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const roomRef = useRef<RoomState>(EMPTY);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSeekRef = useRef(0);
  const reactionTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const setRoomState = useCallback((next: RoomState | ((prev: RoomState) => RoomState)) => {
    setRoom((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      roomRef.current = value;
      return value;
    });
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = null;
  }, []);

  const teardownAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }, []);

  const teardown = useCallback(() => {
    stopHeartbeat();
    teardownAudio();
    setRoomState(EMPTY);
  }, [stopHeartbeat, teardownAudio, setRoomState]);

  const pushReaction = useCallback((emoji: string) => {
    const id = Math.random().toString(36).slice(2);
    setReactions((prev) => [...prev, { id, emoji }].slice(-MAX_FLOATING));
    const timer = setTimeout(() => {
      reactionTimersRef.current.delete(timer);
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, REACTION_TTL_MS);
    reactionTimersRef.current.add(timer);
  }, []);

  const broadcast = useCallback(() => {
    const current = roomRef.current;
    const audio = audioRef.current;
    if (!conversationId || !current.isHost || !current.track || !audio) return;
    chatWs.send({
      type: "ROOM_STATE",
      conversationId,
      track: current.track,
      positionMs: Math.round(audio.currentTime * 1000),
      isPlaying: !audio.paused && !audio.ended,
      full: false,
    });
  }, [conversationId]);

  const startRoom = useCallback(
    (track: TrackPayload) => {
      if (!conversationId || !track.previewUrl) return;
      const { type: _type, ...ref } = track;
      void _type;
      stopHeartbeat();
      teardownAudio();
      audioPlayer.stop(); // never play over a running preview / voice note

      const audio = new Audio(track.previewUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setRoomState((r) => ({ ...r, isPlaying: false }));
        broadcast();
      };
      audio.play().catch(() => {});

      setRoomState({
        active: true,
        isHost: true,
        joined: true,
        hostUserId: myUserId ?? undefined,
        track: ref,
        positionMs: 0,
        isPlaying: true,
        full: false,
      });

      chatWs.send({ type: "ROOM_JOIN", conversationId });
      broadcast();
      heartbeatRef.current = setInterval(broadcast, HEARTBEAT_MS);
    },
    [conversationId, myUserId, stopHeartbeat, teardownAudio, setRoomState, broadcast]
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !roomRef.current.isHost) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
    const playing = !audio.paused;
    setRoomState((r) => ({ ...r, isPlaying: playing }));
    broadcast();
  }, [setRoomState, broadcast]);

  const joinRoom = useCallback(() => {
    const current = roomRef.current;
    if (current.isHost || !current.track?.previewUrl) return;
    teardownAudio();
    audioPlayer.stop();
    const audio = new Audio(current.track.previewUrl);
    audioRef.current = audio;
    // In a full-song room the host clock is beyond a 30s preview — play freely from the start.
    if (!current.full) audio.currentTime = Math.min(current.positionMs / 1000, PREVIEW_MAX_S);
    if (current.isPlaying) audio.play().catch(() => {});
    setRoomState((r) => ({ ...r, joined: true }));
  }, [teardownAudio, setRoomState]);

  const leaveRoom = useCallback(() => {
    if (conversationId) chatWs.send({ type: "ROOM_LEAVE", conversationId });
    teardown();
  }, [conversationId, teardown]);

  const sendReaction = useCallback(
    (emoji: string) => {
      if (!conversationId) return;
      chatWs.send({ type: "REACTION_FLOAT", conversationId, emoji });
      pushReaction(emoji); // float our own optimistically (the server doesn't echo)
    },
    [conversationId, pushReaction]
  );

  // Subscribe to inbound room events.
  useEffect(() => {
    if (!conversationId) return;
    const offState = chatWs.on("ROOM_STATE", (raw: RoomStatePayload) => {
      if (raw.conversationId !== conversationId) return;
      if (raw.hostUserId && myUserId && raw.hostUserId === myUserId) return; // ignore our echo
      if (roomRef.current.isHost) return; // we're hosting; ignore others
      const track = raw.track ?? roomRef.current.track;
      if (!track) return;
      const positionMs = raw.positionMs ?? 0;
      const isPlaying = raw.isPlaying ?? false;
      const full = !!raw.full;

      const audio = audioRef.current;
      if (audio && roomRef.current.joined) {
        if (!full) {
          const target = Math.min(positionMs / 1000, PREVIEW_MAX_S);
          const now = Date.now();
          if (Math.abs(audio.currentTime - target) > DRIFT_TOLERANCE_S && now - lastSeekRef.current > 1000) {
            lastSeekRef.current = now;
            audio.currentTime = target;
          }
        }
        if (isPlaying && audio.paused) audio.play().catch(() => {});
        if (!isPlaying && !audio.paused) audio.pause();
      }

      setRoomState((prev) => ({
        active: true,
        isHost: false,
        joined: prev.joined,
        hostUserId: raw.hostUserId,
        track,
        positionMs,
        isPlaying,
        full,
      }));
    });
    const offLeave = chatWs.on("ROOM_LEAVE", (raw: { conversationId: string; userId?: string }) => {
      if (raw.conversationId !== conversationId) return;
      const current = roomRef.current;
      if (current.isHost) return;
      // Only the host leaving ends the session for followers.
      if (!raw.userId || !current.hostUserId || raw.userId === current.hostUserId) teardown();
    });
    const offFloat = chatWs.on("REACTION_FLOAT", (raw: { conversationId: string; emoji?: string }) => {
      if (raw.conversationId !== conversationId || !raw.emoji) return;
      if (!roomRef.current.active) return;
      pushReaction(raw.emoji);
    });
    return () => {
      offState();
      offLeave();
      offFloat();
    };
  }, [conversationId, myUserId, setRoomState, teardown, pushReaction]);

  // Stop room playback + timers when leaving the conversation/page.
  useEffect(() => {
    const timers = reactionTimersRef.current;
    return () => {
      teardown();
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, [teardown, conversationId]);

  return { room, reactions, startRoom, togglePlay, joinRoom, leaveRoom, sendReaction };
}
