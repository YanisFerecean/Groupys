import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/expo'

import { fetchMusicCurrentlyPlaying } from '@/lib/api'
import { chatWs } from '@/lib/chat-ws'
import type { NowPlayingState, NowPlayingTrack } from '@/models/Chat'

const POLL_MS = 25_000

/**
 * Broadcasts the current user's now-playing track to conversation partners (ticket 1.1).
 *
 * Polls the backend currently-playing endpoint (~25s) and pushes a `NOW_PLAYING_UPDATE` only
 * when the track/state changes. The server enforces the privacy + connection gate, so this is a
 * best-effort publisher. Never relays audio — only metadata.
 */
export function useNowPlayingBroadcaster(
  enabled: boolean,
  onChange?: (state: NowPlayingState) => void,
) {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const onChangeRef = useRef(onChange)
  const lastKeyRef = useRef<string | null>(null)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!enabled) {
      lastKeyRef.current = null
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function tick() {
      try {
        const token = await getTokenRef.current()
        const current = await fetchMusicCurrentlyPlaying(token)
        if (cancelled) return

        const track: NowPlayingTrack | null = current
          ? { id: null, title: current.title, artist: current.artist, artworkUrl: current.coverUrl ?? null }
          : null
        const isPlaying = !!current
        const key = track ? `${track.title}|${track.artist}|${isPlaying}` : 'null'

        if (key !== lastKeyRef.current) {
          lastKeyRef.current = key
          chatWs.send({ type: 'NOW_PLAYING_UPDATE', track, isPlaying })
          onChangeRef.current?.({ track, isPlaying })
        }
      } catch {
        // Offline / not connected / token expired — skip this tick.
      } finally {
        if (!cancelled) {
          timer = setTimeout(() => void tick(), POLL_MS)
        }
      }
    }

    void tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [enabled])
}
