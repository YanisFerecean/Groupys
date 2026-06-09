import { useCallback, useEffect, useRef, useState } from 'react'
import { Image, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { useAuth, useUser } from '@clerk/expo'
import { useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'


import { TrackCard } from '@/components/music/TrackCard'
import { CardActionButton } from '@/components/music/CardActionButton'
import { TrackPicker } from '@/components/music/TrackPicker'
import { Colors } from '@/constants/colors'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'
import { deleteDailySong, fetchDailySongFeed, postDailySong } from '@/lib/api'
import { ApiError } from '@/lib/apiRequest'
import { logError, logWarn } from '@/lib/logging'
import type { DailySong } from '@/models/DailySong'
import type { TrackPayload } from '@/models/ChatPayloads'

function initials(name: string | null, username: string): string {
  return (name || username || '?').charAt(0).toUpperCase()
}

const FEED_REFRESH_COOLDOWN_MS = 15_000
const RATE_LIMIT_BACKOFF_MS = 60_000

/** WhatsApp-status-style daily-song tray at the top of the chat inbox (ticket 5.2). */
export function DailySongTray() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const insets = useSafeAreaInsets()
  const preview = usePreviewPlayer()
  const [feed, setFeed] = useState<DailySong[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [viewing, setViewing] = useState<DailySong | null>(null)
  const getTokenRef = useRef(getToken)
  const loadInFlightRef = useRef<Promise<void> | null>(null)
  const nextLoadAtRef = useRef(0)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const load = useCallback((force = false): Promise<void> => {
    const now = Date.now()
    if (loadInFlightRef.current) return loadInFlightRef.current
    if (!force && now < nextLoadAtRef.current) return Promise.resolve()

    nextLoadAtRef.current = now + FEED_REFRESH_COOLDOWN_MS
    const request = (async () => {
      try {
        const token = await getTokenRef.current()
        setFeed(await fetchDailySongFeed(token))
      } catch (error) {
        if (error instanceof ApiError && error.status === 429) {
          nextLoadAtRef.current = Date.now() + RATE_LIMIT_BACKOFF_MS
          logWarn('[daily-song] feed refresh rate-limited', error)
        } else {
          logError('[daily-song] failed to load feed', error)
        }
      }
    })()
    loadInFlightRef.current = request
    void request.finally(() => {
      if (loadInFlightRef.current === request) {
        loadInFlightRef.current = null
      }
    })
    return request
  }, [])

  useFocusEffect(useCallback(() => {
    void load()
  }, [load]))

  const mine = feed.find(item => item.userId === user?.id) ?? null
  const others = feed.filter(item => item.userId !== user?.id)

  const handlePost = useCallback(async (track: TrackPayload) => {
    setPickerOpen(false)
    try {
      const token = await getTokenRef.current()
      const { type: _t, ...trackRef } = track
      await postDailySong(token, trackRef as unknown as Record<string, unknown>)
      await load(true)
    } catch (error) {
      logError('[daily-song] failed to post', error)
    }
  }, [load])

  const handleClear = useCallback(async () => {
    try {
      const token = await getTokenRef.current()
      await deleteDailySong(token)
      preview.stop()
      setViewing(null)
      await load(true)
    } catch (error) {
      logError('[daily-song] failed to clear', error)
    }
  }, [load, preview])

  const viewingIsMine = viewing?.userId === user?.id
  const trackId = viewing ? `daily:${viewing.userId}` : ''
  const isActive = viewing ? preview.isActive(trackId) : false
  const progress = isActive && preview.durationSec > 0 ? preview.positionSec / preview.durationSec : 0
  const closeViewer = () => {
    preview.stop()
    setViewing(null)
  }
  const viewer = viewing ? (
    <View style={styles.viewerRoot}>
      <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFillObject} />
      <View pointerEvents="none" style={styles.viewerScrim} />
      <TouchableOpacity
        accessibilityLabel="Close daily song"
        activeOpacity={1}
        onPress={closeViewer}
        style={StyleSheet.absoluteFillObject}
      />
      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.viewerSheet,
          {
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            paddingBottom: Math.max(insets.bottom, 16) + 16,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.7)',
          },
        ]}
      >
        <View className="self-center mb-4 rounded-full" style={{ width: 36, height: 4, backgroundColor: Colors.outlineVariant }} />
        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="flex-1 text-[13px] font-semibold text-on-surface-variant">
              {viewingIsMine ? 'Your daily song' : `${viewing.displayName || viewing.username}’s daily song`}
            </Text>
            <TouchableOpacity accessibilityLabel="Close daily song" onPress={closeViewer} className="p-1">
              <Ionicons name="close" size={22} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
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
        </View>
      </BlurView>
    </View>
  ) : null

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

      <Modal
        visible={viewing !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={closeViewer}
      >
        {viewer}
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  viewerRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  viewerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  viewerSheet: {
    width: '100%',
    minHeight: 220,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 12,
    zIndex: 1,
    overflow: 'hidden',
  },
})
