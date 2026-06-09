import { useUser } from '@clerk/expo'
import { useCallback, useEffect, useRef, useState } from 'react'

import { chatWs } from '@/lib/chat-ws'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'
import type { TrackPayload, TrackRef } from '@/models/ChatPayloads'

const DRIFT_THRESHOLD_SEC = 1.5
const HEARTBEAT_MS = 2000

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

export interface ListeningParty {
  id: string
  conversationId: string
  hostUserId: string
  hostClerkId: string
  startAt: string
  track: TrackPayload
  status: 'SCHEDULED' | 'STARTED'
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
 * track ref + position + play/pause. This app plays the free 30s preview in sync ("lite room"),
 * which is permitted for everyone; followers correct drift toward the host position.
 */
export function useListenTogether(conversationId: string | null) {
  const { user } = useUser()
  const preview = usePreviewPlayer()
  const [room, setRoom] = useState<ListenTogetherRoom | null>(null)
  const [reactions, setReactions] = useState<FloatingReaction[]>([])
  const [party, setParty] = useState<ListeningParty | null>(null)
  const [joinedPartyId, setJoinedPartyId] = useState<string | null>(null)

  const previewRef = useRef(preview)
  previewRef.current = preview
  const roomRef = useRef(room)
  roomRef.current = room
  const lastSeekRef = useRef(0)
  const joinedPartyIdRef = useRef(joinedPartyId)
  joinedPartyIdRef.current = joinedPartyId
  const startRoomRef = useRef<(track: TrackPayload) => void>(() => {})

  const roomTrackId = conversationId ? `room:${conversationId}` : 'room'

  // Inbound room + reaction events.
  useEffect(() => {
    if (!conversationId) return

    const unsubs = [
      chatWs.on<RoomStateEvent>('ROOM_STATE', (payload) => {
        if (payload.conversationId !== conversationId || !payload.track?.previewUrl) return
        // Host ignores echoes (the server doesn't echo to the sender anyway).
        if (roomRef.current?.isHost) return

        setRoom({
          isHost: false,
          hostUserId: payload.hostUserId,
          track: payload.track,
          isPlaying: payload.isPlaying,
        })

        const p = previewRef.current
        const hostPosSec = (payload.positionMs ?? 0) / 1000
        const url = payload.track.previewUrl!

        if (!payload.isPlaying) {
          if (p.isActive(roomTrackId) && p.isPlaying) p.pause()
          return
        }
        if (!p.isActive(roomTrackId) || !p.isPlaying) {
          p.play(roomTrackId, url)
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
          previewRef.current.stop()
          setRoom(null)
        }
      }),
      chatWs.on<{ conversationId: string; emoji: string }>('REACTION_FLOAT', (payload) => {
        if (payload.conversationId !== conversationId) return
        const id = Math.random().toString(36).slice(2)
        setReactions(prev => [...prev, { id, emoji: payload.emoji }])
        setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 2500)
      }),
      chatWs.on<ListeningParty>('PARTY_UPDATE', (payload) => {
        if (payload.conversationId !== conversationId) return
        setParty(payload)
        if (payload.hostClerkId === user?.id) {
          setJoinedPartyId(payload.id)
        }
      }),
      chatWs.on<ListeningParty>('PARTY_START', (payload) => {
        if (payload.conversationId !== conversationId) return
        setParty({ ...payload, status: 'STARTED' })
        const isHost = payload.hostClerkId === user?.id
        if (!isHost && joinedPartyIdRef.current !== payload.id) return
        if (isHost) {
          startRoomRef.current(payload.track)
        } else {
          chatWs.send({ type: 'ROOM_JOIN', conversationId })
        }
      }),
    ]

    chatWs.send({ type: 'PARTY_REQUEST', conversationId })
    return () => unsubs.forEach(u => u())
  }, [conversationId, roomTrackId, user?.id])

  // Host heartbeat: broadcast position + play state (~2s) while hosting.
  useEffect(() => {
    if (!conversationId || !room?.isHost) return

    const send = () => {
      const t = roomRef.current?.track
      if (!t) return
      chatWs.send({
        type: 'ROOM_STATE',
        conversationId,
        track: t as unknown as Record<string, unknown>,
        positionMs: Math.round(previewRef.current.positionSec * 1000),
        isPlaying: previewRef.current.isPlaying,
      })
    }

    send()
    const timer = setInterval(send, HEARTBEAT_MS)
    return () => clearInterval(timer)
  }, [conversationId, room?.isHost, room?.track])

  const startRoom = useCallback((track: TrackPayload) => {
    if (!conversationId || !track.previewUrl) return
    const { type: _t, ...trackRef } = track
    setRoom({ isHost: true, hostUserId: null, track: trackRef, isPlaying: true })
    chatWs.send({ type: 'ROOM_JOIN', conversationId })
    preview.play(roomTrackId, track.previewUrl)
  }, [conversationId, preview, roomTrackId])
  startRoomRef.current = startRoom

  const scheduleParty = useCallback((track: TrackPayload, startAt: Date) => {
    if (!conversationId || !track.previewUrl) return
    chatWs.send({
      type: 'PARTY_SCHEDULE',
      conversationId,
      startAt: startAt.toISOString(),
      track,
    })
  }, [conversationId])

  const joinParty = useCallback(() => {
    if (!party) return
    setJoinedPartyId(party.id)
    joinedPartyIdRef.current = party.id
    chatWs.send({ type: 'PARTY_JOIN', partyId: party.id })
  }, [party])

  const leaveRoom = useCallback(() => {
    if (conversationId) chatWs.send({ type: 'ROOM_LEAVE', conversationId })
    preview.stop()
    setRoom(null)
  }, [conversationId, preview])

  const sendReaction = useCallback((emoji: string) => {
    if (conversationId) chatWs.send({ type: 'REACTION_FLOAT', conversationId, emoji })
    // Optimistically float our own reaction too.
    const id = Math.random().toString(36).slice(2)
    setReactions(prev => [...prev, { id, emoji }])
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 2500)
  }, [conversationId])

  const isActive = room ? preview.isActive(roomTrackId) : false
  const progress = isActive && preview.durationSec > 0 ? preview.positionSec / preview.durationSec : 0

  return {
    room,
    reactions,
    party,
    joinedParty: party != null && joinedPartyId === party.id,
    startRoom,
    scheduleParty,
    joinParty,
    leaveRoom,
    sendReaction,
    isPlaying: isActive && preview.isPlaying,
    progress,
  }
}
