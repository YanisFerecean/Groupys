import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import * as MediaLibrary from 'expo-media-library'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { MediaOverlayEditor } from '@/components/camera/MediaOverlayEditor'
import { Colors } from '@/constants/colors'
import type { CapturedMedia, MediaMusicAttachment } from '@/types/camera'

interface CameraPreviewProps {
  media: CapturedMedia
  enableMusic: boolean
  saveToLibrary: boolean
  ensureMediaPermission: () => Promise<boolean>
  onRetake: () => void
  onConfirm: (media: CapturedMedia) => void
}

/** Post-capture preview: shows the photo/video, hosts the music editor, and offers the actions. */
export function CameraPreview({
  media,
  enableMusic,
  saveToLibrary,
  ensureMediaPermission,
  onRetake,
  onConfirm,
}: CameraPreviewProps) {
  const insets = useSafeAreaInsets()
  const [music, setMusic] = useState<MediaMusicAttachment | null>(media.music ?? null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isVideo = media.type === 'video'
  const player = useVideoPlayer(isVideo ? media.uri : null, p => {
    p.loop = true
    p.play()
  })

  // Mute the clip when a soundtrack is attached so the snippet is the audio.
  useEffect(() => {
    if (isVideo && player) player.muted = !!music?.muteVideo
  }, [isVideo, music?.muteVideo, player])

  const handleSave = async () => {
    if (saving || saved) return
    setSaving(true)
    try {
      const granted = await ensureMediaPermission()
      if (!granted) {
        Alert.alert('Permission needed', 'Enable photo library access in Settings to save media.')
        return
      }
      await MediaLibrary.saveToLibraryAsync(media.uri)
      setSaved(true)
    } catch {
      Alert.alert('Could not save', 'Saving to your library failed. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View
        style={{ flex: 1 }}
        onLayout={e => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        {isVideo ? (
          <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls={false} />
        ) : (
          <Image source={{ uri: media.uri }} style={{ flex: 1 }} contentFit="contain" />
        )}

        <View style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, bottom: 0 }} pointerEvents="box-none">
          <MediaOverlayEditor
            enableMusic={enableMusic}
            mediaType={media.type}
            music={music}
            onChange={setMusic}
            containerWidth={size.width}
            containerHeight={size.height}
          />
        </View>
      </View>

      {/* Action bar */}
      <View
        style={{ position: 'absolute', bottom: insets.bottom + 24, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Pressable onPress={onRetake} style={pillButton}>
          <Ionicons name="arrow-undo" size={20} color="#fff" />
          <Text style={pillLabel}>Retake</Text>
        </Pressable>

        {saveToLibrary ? (
          <Pressable onPress={handleSave} style={pillButton} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name={saved ? 'checkmark-circle' : 'download'} size={20} color="#fff" />
            )}
            <Text style={pillLabel}>{saved ? 'Saved' : 'Save'}</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => onConfirm({ ...media, music: music ?? undefined })}
          style={[pillButton, { backgroundColor: Colors.primary }]}
        >
          <Text style={pillLabel}>Use</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  )
}

const pillButton = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
  backgroundColor: 'rgba(0,0,0,0.55)',
  borderRadius: 24,
  paddingHorizontal: 18,
  paddingVertical: 12,
}

const pillLabel = { color: '#fff', fontWeight: '700' as const, fontSize: 15 }
