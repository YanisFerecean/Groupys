import { useEffect, useState } from 'react'
import { Alert, Linking, Modal, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { useAuth } from '@clerk/expo'

import { TrackCard } from '@/components/music/TrackCard'
import { CardActionButton } from '@/components/music/CardActionButton'
import { MusicUpsellSheet } from '@/components/music/MusicUpsellSheet'
import { Colors } from '@/constants/colors'
import { useMusicGate } from '@/hooks/useMusicGate'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'
import { searchTracks } from '@/lib/musicSearch'
import type { NowPlayingTrack } from '@/models/Chat'
import type { TrackPayload } from '@/models/ChatPayloads'

interface NowPlayingTrackSheetProps {
  visible: boolean
  track: NowPlayingTrack | null
  onClose: () => void
}

function appleMusicLink(title: string, artist: string): string {
  return `https://music.apple.com/search?term=${encodeURIComponent(`${title} ${artist}`.trim())}`
}

/**
 * Bottom sheet opened from the now-playing pill (ticket 1.2). Resolves a 30s preview for the
 * live track via catalog search (developer token), then reuses the TrackCard + preview player.
 */
export function NowPlayingTrackSheet({ visible, track, onClose }: NowPlayingTrackSheetProps) {
  const { getToken } = useAuth()
  const preview = usePreviewPlayer()
  const { requireMusic, upsell, closeUpsell, capability } = useMusicGate()
  const [resolved, setResolved] = useState<TrackPayload | null>(null)

  useEffect(() => {
    if (!visible || !track) {
      return
    }

    let cancelled = false
    // Best-effort enrichment: find the catalog entry to get a preview URL + artwork + id.
    async function resolve() {
      const base: TrackPayload = {
        type: 'TRACK',
        id: track!.id ?? '',
        title: track!.title,
        artist: track!.artist ?? '',
        artworkUrl: track!.artworkUrl ?? undefined,
      }
      setResolved(base)
      try {
        const token = await getToken()
        const [hit] = await searchTracks(`${track!.title} ${track!.artist ?? ''}`.trim(), token, 1)
        if (!cancelled && hit) {
          setResolved({
            type: 'TRACK',
            id: String(hit.id),
            title: hit.title,
            artist: hit.artist,
            album: hit.album,
            artworkUrl: hit.coverUrl ?? base.artworkUrl,
            previewUrl: hit.preview,
          })
        }
      } catch {
        // Keep the un-enriched base (open-in-Apple-Music still works).
      }
    }
    void resolve()

    return () => {
      cancelled = true
      preview.stop()
    }
    // preview is a fresh object each render; intentionally only re-run on open/track change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, track, getToken])

  if (!track) return null

  const trackId = resolved?.id || track.title
  const hasPreview = !!resolved?.previewUrl
  const isActive = preview.isActive(trackId)
  const isPlaying = isActive && preview.isPlaying
  const progress = isActive && preview.durationSec > 0 ? preview.positionSec / preview.durationSec : 0

  const handleAddToLibrary = () => {
    if (requireMusic('Add to library') !== 'ok') return
    Alert.alert('Apple Music', 'Added to your library.')
  }

  const handleOpen = () => {
    void Linking.openURL(appleMusicLink(track.title, track.artist ?? '')).catch(() => {})
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <BlurView tint="dark" intensity={40} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View className="rounded-t-3xl px-5 pt-4 pb-8" style={{ backgroundColor: Colors.surface }}>
          <View className="self-center mb-4 rounded-full" style={{ width: 36, height: 4, backgroundColor: Colors.outlineVariant }} />

          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-bold text-on-surface">Now playing</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={22} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <View className="items-center">
            <TrackCard
              title={resolved?.title ?? track.title}
              subtitle={resolved?.artist ?? track.artist ?? undefined}
              artworkUrl={resolved?.artworkUrl ?? track.artworkUrl ?? undefined}
              hasPreview={hasPreview}
              isPlaying={isPlaying}
              progress={progress}
              onTogglePreview={hasPreview ? () => preview.toggle(trackId, resolved!.previewUrl!) : undefined}
              actions={
                <>
                  <CardActionButton
                    icon="add"
                    label="Add to library"
                    onPress={handleAddToLibrary}
                    disabled={!capability.canPlayFull}
                  />
                  <CardActionButton icon="open-outline" label="Open" onPress={handleOpen} />
                </>
              }
            />
          </View>
        </View>
      </View>

      <MusicUpsellSheet visible={upsell.visible} mode={upsell.mode} action={upsell.action} onClose={closeUpsell} />
    </Modal>
  )
}
