import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'

import { chatWs } from '@/lib/chat-ws'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'
import { useAppleMusicPlayer } from '@/hooks/useAppleMusicPlayer'
import type { TrackPayload, TrackRef } from '@/models/ChatPayloads'

const DRIFT_THRESHOLD_SEC = 1.5
const HEARTBEAT_MS = 2000

/**
 * A track plays in full (native Apple Music) when it carries an Apple catalog id and we're on iOS —
 * the only place full playback is wired. Otherwise it degrades to the synced 30s preview.
 */
function usesFullPlayback(track: TrackRef | null | undefined): boolean {
  return Platform.OS === 'ios' && !!track?.appleMusicId
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
}

interface RoomStateEvent {
  conversationId: string
  hostUserId: string
  track: TrackRef | null
  positionMs: number
  isPlaying: boolean
}

/**
 * Listen-Together sync engine (ticket 7.1). Honors Apple ToS: no audio crosses the wire — only
 * track ref + position + play/pause. When both listeners have Apple Music and the track carries a
 * catalog id, it plays the FULL song in sync via native Apple Music (iOS); otherwise it falls back to the
 * free 30s preview ("lite room"). Followers correct drift toward the host position either way.
 */
export function useListenTogether(conversationId: string | null) {
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
  const lastSeekRef = useRef(0)

  const roomTrackId = conversationId ? `room:${conversationId}` : 'room'

  // Start (or resume) playback of the room track on whichever engine fits it.
  const startPlayback = useCallback((track: TrackRef) => {
    if (usesFullPlayback(track)) fullRef.current.play(roomTrackId, track.appleMusicId!)
    else if (track.previewUrl) previewRef.current.play(roomTrackId, track.previewUrl)
  }, [roomTrackId])

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

        setRoom({
          isHost: false,
          hostUserId: payload.hostUserId,
          track,
          isPlaying: payload.isPlaying,
        })

        const useFull = usesFullPlayback(track)
        const p = useFull ? fullRef.current : previewRef.current
        const hostPosSec = (payload.positionMs ?? 0) / 1000

        if (!payload.isPlaying) {
          if (p.isActive(roomTrackId) && p.isPlaying) p.pause()
          return
        }
        if (!p.isActive(roomTrackId)) {
          startPlayback(track)
          return
        }
        if (!p.isPlaying) {
          // Resume the already-loaded track without re-queuing.
          if (useFull) fullRef.current.resume()
          else previewRef.current.play(roomTrackId, track.previewUrl!)
          return
        }
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
          if (usesFullPlayback(current.track)) fullRef.current.stop()
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
  }, [conversationId, roomTrackId, startPlayback])

  // Host heartbeat: broadcast position + play state (~2s) while hosting.
  useEffect(() => {
    if (!conversationId || !room?.isHost) return

    const send = () => {
      const t = roomRef.current?.track
      if (!t) return
      const p = usesFullPlayback(t) ? fullRef.current : previewRef.current
      chatWs.send({
        type: 'ROOM_STATE',
        conversationId,
        track: t as unknown as Record<string, unknown>,
        positionMs: Math.round(p.positionSec * 1000),
        isPlaying: p.isPlaying,
      })
    }

    send()
    const timer = setInterval(send, HEARTBEAT_MS)
    return () => clearInterval(timer)
  }, [conversationId, room?.isHost, room?.track])

  const startRoom = useCallback((track: TrackPayload) => {
    if (!conversationId) return
    if (!usesFullPlayback(track) && !track.previewUrl) return
    const { type: _t, ...trackRef } = track
    setRoom({ isHost: true, hostUserId: null, track: trackRef, isPlaying: true })
    chatWs.send({ type: 'ROOM_JOIN', conversationId })
    startPlayback(trackRef)
  }, [conversationId, startPlayback])

  const leaveRoom = useCallback(() => {
    if (conversationId) chatWs.send({ type: 'ROOM_LEAVE', conversationId })
    const t = roomRef.current?.track
    if (t && usesFullPlayback(t)) fullRef.current.stop()
    else previewRef.current.stop()
    setRoom(null)
  }, [conversationId])

  const sendReaction = useCallback((emoji: string) => {
    if (conversationId) chatWs.send({ type: 'REACTION_FLOAT', conversationId, emoji })
    // Optimistically float our own reaction too.
    const id = Math.random().toString(36).slice(2)
    setReactions(prev => [...prev, { id, emoji }])
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 2500)
  }, [conversationId])

  const engine = usesFullPlayback(room?.track) ? full : preview
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
