"use client";

import { useCallback, useEffect, useState } from "react";
import { TrackPayload } from "@/types/chat";
import { chatWs } from "@/lib/ws";

export interface RoomState {
  active: boolean;
  isHost: boolean;
  joined: boolean;
  hostUserId?: string;
  track: TrackPayload | null;
  positionMs: number;
  isPlaying: boolean;
}

const EMPTY: RoomState = {
  active: false,
  isHost: false,
  joined: false,
  track: null,
  positionMs: 0,
  isPlaying: false,
};

const DRIFT_TOLERANCE_S = 1.5;
const PREVIEW_MAX_S = 29;

// Module-level playback resources + latest host state (single room at a time).
let roomAudio: HTMLAudioElement | null = null;
let broadcastTimer: ReturnType<typeof setInterval> | null = null;
let roomIsHost = false;
let roomJoined = false;
let roomTrack: TrackPayload | null = null;
let roomLastPosMs = 0;
let roomLastPlaying = false;

function teardownRoomAudio() {
  if (roomAudio) {
    roomAudio.pause();
    roomAudio = null;
  }
  if (broadcastTimer) {
    clearInterval(broadcastTimer);
    broadcastTimer = null;
  }
  roomIsHost = false;
  roomJoined = false;
  roomTrack = null;
  roomLastPosMs = 0;
  roomLastPlaying = false;
}

interface RoomStatePayload {
  conversationId: string;
  hostUserId?: string;
  track?: TrackPayload;
  positionMs?: number;
  isPlaying?: boolean;
}

/**
 * Listen Together: a synced 30s-preview session. The host plays a track and
 * broadcasts ROOM_STATE (track + position + play state); followers explicitly
 * Join (browser autoplay needs a gesture) and then track the host's position.
 */
export function useListenTogether(conversationId: string | null, myUserId: string | null) {
  const [room, setRoom] = useState<RoomState>(EMPTY);

  const startRoom = useCallback(
    (track: TrackPayload) => {
      if (!conversationId || !track.previewUrl) return;
      teardownRoomAudio();
      const audio = new Audio(track.previewUrl);
      roomAudio = audio;
      roomIsHost = true;
      roomJoined = true;
      roomTrack = track;
      roomLastPlaying = true;
      audio.play().catch(() => {});
      setRoom({
        active: true,
        isHost: true,
        joined: true,
        hostUserId: myUserId ?? undefined,
        track,
        positionMs: 0,
        isPlaying: true,
      });

      const broadcast = () => {
        if (!roomAudio) return;
        chatWs.send({
          type: "ROOM_STATE",
          conversationId,
          track,
          positionMs: Math.round(roomAudio.currentTime * 1000),
          isPlaying: !roomAudio.paused,
        });
      };
      chatWs.send({ type: "ROOM_JOIN", conversationId, track, positionMs: 0, isPlaying: true });
      broadcast();
      broadcastTimer = setInterval(broadcast, 4000);
      audio.onended = () => {
        roomLastPlaying = false;
        setRoom((r) => ({ ...r, isPlaying: false }));
      };
    },
    [conversationId, myUserId]
  );

  const togglePlay = useCallback(() => {
    if (!roomAudio || !conversationId || !roomIsHost) return;
    if (roomAudio.paused) roomAudio.play().catch(() => {});
    else roomAudio.pause();
    const playing = !roomAudio.paused;
    roomLastPlaying = playing;
    setRoom((r) => ({ ...r, isPlaying: playing }));
    chatWs.send({
      type: "ROOM_STATE",
      conversationId,
      track: roomTrack,
      positionMs: Math.round(roomAudio.currentTime * 1000),
      isPlaying: playing,
    });
  }, [conversationId]);

  const joinRoom = useCallback(() => {
    if (roomIsHost || !roomTrack?.previewUrl) return;
    teardownFollowerKeepMeta();
    const track = roomTrack;
    const audio = new Audio(track.previewUrl);
    roomAudio = audio;
    roomJoined = true;
    audio.currentTime = Math.min(roomLastPosMs / 1000, PREVIEW_MAX_S);
    if (roomLastPlaying) audio.play().catch(() => {});
    setRoom((r) => ({ ...r, joined: true }));
  }, []);

  const leaveRoom = useCallback(() => {
    if (conversationId && roomIsHost) chatWs.send({ type: "ROOM_LEAVE", conversationId });
    teardownRoomAudio();
    setRoom(EMPTY);
  }, [conversationId]);

  // Subscribe to inbound room events.
  useEffect(() => {
    if (!conversationId) return;
    const offState = chatWs.on("ROOM_STATE", (raw: RoomStatePayload) => {
      if (raw.conversationId !== conversationId) return;
      if (raw.hostUserId && myUserId && raw.hostUserId === myUserId) return; // ignore our echo
      if (roomIsHost) return; // we're hosting; ignore others
      const positionMs = raw.positionMs ?? 0;
      const isPlaying = raw.isPlaying ?? false;
      if (raw.track) roomTrack = raw.track;
      roomLastPosMs = positionMs;
      roomLastPlaying = isPlaying;
      if (roomAudio && roomJoined) {
        const target = Math.min(positionMs / 1000, PREVIEW_MAX_S);
        if (Math.abs(roomAudio.currentTime - target) > DRIFT_TOLERANCE_S) roomAudio.currentTime = target;
        if (isPlaying && roomAudio.paused) roomAudio.play().catch(() => {});
        if (!isPlaying && !roomAudio.paused) roomAudio.pause();
      }
      setRoom((prev) => ({
        active: true,
        isHost: false,
        joined: prev.joined,
        hostUserId: raw.hostUserId,
        track: raw.track ?? prev.track,
        positionMs,
        isPlaying,
      }));
    });
    const offLeave = chatWs.on("ROOM_LEAVE", (raw: { conversationId: string }) => {
      if (raw.conversationId !== conversationId || roomIsHost) return;
      teardownRoomAudio();
      setRoom(EMPTY);
    });
    return () => {
      offState();
      offLeave();
    };
  }, [conversationId, myUserId]);

  // Stop room playback when leaving the conversation/page.
  useEffect(() => () => teardownRoomAudio(), []);

  return { room, startRoom, togglePlay, joinRoom, leaveRoom };
}

/** Tears down only the follower audio element, keeping the latest host metadata. */
function teardownFollowerKeepMeta() {
  if (roomAudio) {
    roomAudio.pause();
    roomAudio = null;
  }
}
