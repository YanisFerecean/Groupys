import { useCallback, useState } from 'react'
import { Image, Linking, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { useAuth, useUser } from '@clerk/expo'
import { useFocusEffect } from 'expo-router'

import { TrackCard } from '@/components/music/TrackCard'
import { CardActionButton } from '@/components/music/CardActionButton'
import { TrackPicker } from '@/components/music/TrackPicker'
import { Colors } from '@/constants/colors'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'
import { deleteDailySong, fetchDailySongFeed, postDailySong } from '@/lib/api'
import { logError } from '@/lib/logging'
import type { DailySong } from '@/models/DailySong'
import type { TrackPayload } from '@/models/ChatPayloads'

function initials(name: string | null, username: string): string {
  return (name || username || '?').charAt(0).toUpperCase()
}

/** WhatsApp-status-style daily-song tray at the top of the chat inbox (ticket 5.2). */
export function DailySongTray() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const preview = usePreviewPlayer()
  const [feed, setFeed] = useState<DailySong[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [viewing, setViewing] = useState<DailySong | null>(null)

  const load = useCallback(async () => {
    try {
      const token = await getToken()
      setFeed(await fetchDailySongFeed(token))
    } catch (error) {
      logError('[daily-song] failed to load feed', error)
    }
  }, [getToken])

  useFocusEffect(useCallback(() => {
    void load()
  }, [load]))

  const mine = feed.find(item => item.userId === user?.id) ?? null
  const others = feed.filter(item => item.userId !== user?.id)

  const handlePost = useCallback(async (track: TrackPayload) => {
    setPickerOpen(false)
    try {
      const token = await getToken()
      const { type: _t, ...trackRef } = track
      await postDailySong(token, trackRef as unknown as Record<string, unknown>)
      await load()
    } catch (error) {
      logError('[daily-song] failed to post', error)
    }
  }, [getToken, load])

  const handleClear = useCallback(async () => {
    try {
      const token = await getToken()
      await deleteDailySong(token)
      preview.stop()
      setViewing(null)
      await load()
    } catch (error) {
      logError('[daily-song] failed to clear', error)
    }
  }, [getToken, load, preview])

  const viewingIsMine = viewing?.userId === user?.id
  const trackId = viewing ? `daily:${viewing.userId}` : ''
  const isActive = viewing ? preview.isActive(trackId) : false
  const progress = isActive && preview.durationSec > 0 ? preview.positionSec / preview.durationSec : 0

  return (
    <View className="pb-2">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}>
        {/* Your song / compose */}
        <TouchableOpacity className="items-center" style={{ width: 64 }} onPress={() => (mine ? setViewing(mine) : setPickerOpen(true))}>
          <View className="items-center justify-center rounded-full" style={{ width: 56, height: 56, borderWidth: 2, borderColor: Colors.primary, borderStyle: mine ? 'solid' : 'dashed' }}>
            {mine?.track.artworkUrl ? (
              <Image source={{ uri: mine.track.artworkUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} />
            ) : (
              <Ionicons name={mine ? 'musical-note' : 'add'} size={24} color={Colors.primary} />
            )}
          </View>
          <Text className="mt-1 text-[11px] font-medium text-on-surface" numberOfLines={1}>
            {mine ? 'Your song' : 'Add song'}
          </Text>
        </TouchableOpacity>

        {others.map(item => (
          <TouchableOpacity key={item.userId} className="items-center" style={{ width: 64 }} onPress={() => setViewing(item)}>
            <View className="items-center justify-center rounded-full overflow-hidden" style={{ width: 56, height: 56, borderWidth: 2, borderColor: Colors.secondary }}>
              {item.track.artworkUrl ? (
                <Image source={{ uri: item.track.artworkUrl }} style={{ width: 52, height: 52, borderRadius: 26 }} />
              ) : item.profileImage ? (
                <Image source={{ uri: item.profileImage }} style={{ width: 52, height: 52, borderRadius: 26 }} />
              ) : (
                <View className="items-center justify-center bg-surface-container-high" style={{ width: 52, height: 52, borderRadius: 26 }}>
                  <Text className="text-base font-bold text-primary">{initials(item.displayName, item.username)}</Text>
                </View>
              )}
            </View>
            <Text className="mt-1 text-[11px] font-medium text-on-surface" numberOfLines={1}>
              {item.displayName || item.username}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TrackPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handlePost} />

      <Modal visible={viewing !== null} transparent animationType="slide" onRequestClose={() => { preview.stop(); setViewing(null) }}>
        <View className="flex-1 justify-end">
          <BlurView tint="dark" intensity={40} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <TouchableOpacity activeOpacity={1} onPress={() => { preview.stop(); setViewing(null) }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <View className="rounded-t-3xl px-5 pt-4 pb-8" style={{ backgroundColor: Colors.surface }}>
            <View className="self-center mb-4 rounded-full" style={{ width: 36, height: 4, backgroundColor: Colors.outlineVariant }} />
            {viewing ? (
              <>
                <Text className="text-[13px] font-semibold text-on-surface-variant mb-3">
                  {viewingIsMine ? 'Your daily song' : `${viewing.displayName || viewing.username}’s daily song`}
                </Text>
                <View className="items-center">
                  <TrackCard
                    title={viewing.track.title}
                    subtitle={viewing.track.artist}
                    artworkUrl={viewing.track.artworkUrl}
                    hasPreview={!!viewing.track.previewUrl}
                    isPlaying={isActive && preview.isPlaying}
                    progress={progress}
                    onTogglePreview={viewing.track.previewUrl ? () => preview.toggle(trackId, viewing.track.previewUrl!) : undefined}
                    actions={
                      <>
                        <CardActionButton
                          icon="open-outline"
                          label="Open"
                          onPress={() => {
                            const t = viewing.track
                            const url = t.appleMusicUrl && (t.appleMusicUrl.startsWith('http') || t.appleMusicUrl.startsWith('music://'))
                              ? t.appleMusicUrl
                              : `https://music.apple.com/search?term=${encodeURIComponent(`${t.title} ${t.artist ?? ''}`.trim())}`
                            void Linking.openURL(url).catch(() => {})
                          }}
                        />
                        {viewingIsMine ? (
                          <CardActionButton icon="trash" label="Clear" onPress={handleClear} />
                        ) : null}
                      </>
                    }
                  />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  )
}
