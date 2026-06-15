import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'

import { chatWs } from '@/lib/chat-ws'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'
import { useAppleMusicPlayer } from '@/hooks/useAppleMusicPlayer'
import type { TrackPayload, TrackRef } from '@/models/ChatPayloads'

const DRIFT_THRESHOLD_SEC = 1.5
const HEARTBEAT_MS = 2000

/**
 * Whether THIS device can play a track in full: iOS, the track carries an Apple catalog id, and the
 * local user has an active Apple Music subscription. Otherwise it falls back to the synced 30s
 * preview — decided per-user, so a subscriber and a non-subscriber in the same room differ.
 */
function deviceCanPlayFull(track: TrackRef | null | undefined, canPlayFull: boolean): boolean {
  return Platform.OS === 'ios' && !!track?.appleMusicId && canPlayFull
}

export interface FloatingReaction {
  id: string
  emoji: string
}

export interface ListenTogetherRoom {
  isHost: boolean
  hostUserId: string | null
  track: TrackRef
  isPlaying: boolean
  /** Host is driving a full-song timeline (host has Apple Music); else a synced 30s-preview room. */
  full: boolean
}

interface RoomStateEvent {
  conversationId: string
  hostUserId: string
  track: TrackRef | null
  positionMs: number
  isPlaying: boolean
  full?: boolean
}

/**
 * Listen-Together sync engine (ticket 7.1). Honors Apple ToS: no audio crosses the wire — only
 * track ref + position + play/pause + a `full` flag. The host drives the timeline: if the host has
 * Apple Music it's a FULL-song room (each listener plays the full song if subscribed, else the 30s
 * preview); otherwise it's a synced-preview "lite room" for everyone. Followers correct drift toward
 * the host only while in the same mode the host is driving.
 */
export function useListenTogether(conversationId: string | null, canPlayFull: boolean) {
  const preview = usePreviewPlayer()
  const full = useAppleMusicPlayer()
  const [room, setRoom] = useState<ListenTogetherRoom | null>(null)
  const [reactions, setReactions] = useState<FloatingReaction[]>([])

  const previewRef = useRef(preview)
  previewRef.current = preview
  const fullRef = useRef(full)
  fullRef.current = full
  const roomRef = useRef(room)
  roomRef.current = room
  const canPlayFullRef = useRef(canPlayFull)
  canPlayFullRef.current = canPlayFull
  const lastSeekRef = useRef(0)

  const roomTrackId = conversationId ? `room:${conversationId}` : 'room'

  // Whether this device should use the full engine for a track (subject to the room being full mode).
  const localFull = useCallback(
    (track: TrackRef | null | undefined) => deviceCanPlayFull(track, canPlayFullRef.current),
    [],
  )

  // Start playback on the engine that fits this device, given whether the room is a full-song room.
  const startPlayback = useCallback((track: TrackRef, roomIsFull: boolean) => {
    if (roomIsFull && localFull(track)) fullRef.current.play(roomTrackId, track.appleMusicId!)
    else if (track.previewUrl) previewRef.current.play(roomTrackId, track.previewUrl)
  }, [localFull, roomTrackId])

  // Inbound room + reaction events.
  useEffect(() => {
    if (!conversationId) return

    const unsubs = [
      chatWs.on<RoomStateEvent>('ROOM_STATE', (payload) => {
        const track = payload.track
        if (payload.conversationId !== conversationId) return
        if (!track || (!track.previewUrl && !track.appleMusicId)) return
        // Host ignores echoes (the server doesn't echo to the sender anyway).
        if (roomRef.current?.isHost) return

        const roomIsFull = !!payload.full
        setRoom({
          isHost: false,
          hostUserId: payload.hostUserId,
          track,
          isPlaying: payload.isPlaying,
          full: roomIsFull,
        })

        const useFull = roomIsFull && localFull(track)
        const p = useFull ? fullRef.current : previewRef.current
        const hostPosSec = (payload.positionMs ?? 0) / 1000

        if (!payload.isPlaying) {
          if (p.isActive(roomTrackId) && p.isPlaying) p.pause()
          return
        }
        if (!p.isActive(roomTrackId)) {
          startPlayback(track, roomIsFull)
          return
        }
        if (!p.isPlaying) {
          // Resume the already-loaded track without re-queuing.
          if (useFull) fullRef.current.resume()
          else previewRef.current.play(roomTrackId, track.previewUrl!)
          return
        }
        // Only sync position when this device is in the same mode the host is driving — a 30s preview
        // clip can't track a full-song clock, so a preview follower in a full room just plays freely.
        if (useFull !== roomIsFull) return
        const drift = Math.abs(p.positionSec - hostPosSec)
        const now = Date.now()
        if (drift > DRIFT_THRESHOLD_SEC && now - lastSeekRef.current > 1000) {
          lastSeekRef.current = now
          p.seek(hostPosSec)
        }
      }),
      chatWs.on<{ conversationId: string; userId: string }>('ROOM_LEAVE', (payload) => {
        if (payload.conversationId !== conversationId) return
        const current = roomRef.current
        if (current && !current.isHost && payload.userId === current.hostUserId) {
          if (current.full && localFull(current.track)) fullRef.current.stop()
          else previewRef.current.stop()
          setRoom(null)
        }
      }),
      chatWs.on<{ conversationId: string; emoji: string }>('REACTION_FLOAT', (payload) => {
        if (payload.conversationId !== conversationId) return
        const id = Math.random().toString(36).slice(2)
        setReactions(prev => [...prev, { id, emoji: payload.emoji }])
        setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 2500)
      }),
    ]

    return () => unsubs.forEach(u => u())
  }, [conversationId, roomTrackId, startPlayback, localFull])

  // Host heartbeat: broadcast position + play state + mode (~2s) while hosting.
  useEffect(() => {
    if (!conversationId || !room?.isHost) return

    const send = () => {
      const t = roomRef.current?.track
      if (!t) return
      const roomIsFull = roomRef.current?.full ?? false
      const p = roomIsFull && localFull(t) ? fullRef.current : previewRef.current
      chatWs.send({
        type: 'ROOM_STATE',
        conversationId,
        track: t as unknown as Record<string, unknown>,
        positionMs: Math.round(p.positionSec * 1000),
        isPlaying: p.isPlaying,
        full: roomIsFull,
      })
    }

    send()
    const timer = setInterval(send, HEARTBEAT_MS)
    return () => clearInterval(timer)
  }, [conversationId, room?.isHost, room?.track, room?.full, localFull])

  const startRoom = useCallback((track: TrackPayload) => {
    if (!conversationId) return
    const { type: _t, ...trackRef } = track
    // A full-song room needs the host (picker) to have Apple Music; otherwise it's a preview room.
    const hostFull = localFull(trackRef)
    if (!hostFull && !trackRef.previewUrl) return
    setRoom({ isHost: true, hostUserId: null, track: trackRef, isPlaying: true, full: hostFull })
    chatWs.send({ type: 'ROOM_JOIN', conversationId })
    startPlayback(trackRef, hostFull)
  }, [conversationId, localFull, startPlayback])

  const leaveRoom = useCallback(() => {
    if (conversationId) chatWs.send({ type: 'ROOM_LEAVE', conversationId })
    const current = roomRef.current
    if (current && current.full && localFull(current.track)) fullRef.current.stop()
    else previewRef.current.stop()
    setRoom(null)
  }, [conversationId, localFull])

  const sendReaction = useCallback((emoji: string) => {
    if (conversationId) chatWs.send({ type: 'REACTION_FLOAT', conversationId, emoji })
    // Optimistically float our own reaction too.
    const id = Math.random().toString(36).slice(2)
    setReactions(prev => [...prev, { id, emoji }])
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 2500)
  }, [conversationId])

  const engine = room && room.full && localFull(room.track) ? full : preview
  const isActive = room ? engine.isActive(roomTrackId) : false
  const progress = isActive && engine.durationSec > 0 ? engine.positionSec / engine.durationSec : 0

  return {
    room,
    reactions,
    startRoom,
    leaveRoom,
    sendReaction,
    isPlaying: isActive && engine.isPlaying,
    progress,
  }
}
