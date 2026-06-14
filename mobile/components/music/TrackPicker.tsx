import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Image, Modal, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'

import SearchBar from '@/components/ui/SearchBar'
import { Colors } from '@/constants/colors'
import { searchTracks } from '@/lib/musicSearch'
import type { TrackSearchResult } from '@/models/TrackSearchResult'
import type { TrackPayload } from '@/models/ChatPayloads'

const GLASS = isLiquidGlassAvailable()

interface TrackPickerProps {
  visible: boolean
  onClose: () => void
  onSelect: (track: TrackPayload) => void
  /** Seed the search box when opened (e.g. from a "Send a song by X" CTA). */
  initialQuery?: string
  /** Require a public preview URL (e.g. track reactions must preview on tap). */
  previewOnly?: boolean
}

function toTrackPayload(result: TrackSearchResult): TrackPayload {
  return {
    type: 'TRACK',
    id: result.catalogId ?? String(result.id),
    title: result.title,
    artist: result.artist,
    album: result.album,
    artworkUrl: result.coverUrl,
    previewUrl: result.preview,
    appleMusicId: result.catalogId,
  }
}

/**
 * Manual catalog search picker (ticket 0.2). Uses the developer-token-backed catalog search,
 * so it works for content creation even when the user has not connected Apple Music.
 */
export function TrackPicker({ visible, onClose, onSelect, initialQuery, previewOnly = false }: TrackPickerProps) {
  const { getToken } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TrackSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const getTokenRef = useRef(getToken)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  useEffect(() => {
    if (visible) {
      setQuery(initialQuery ?? '')
    } else {
      setQuery('')
      setResults([])
      setIsSearching(false)
    }
  }, [visible, initialQuery])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!visible) return

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults(current => current.length === 0 ? current : [])
      setIsSearching(current => current ? false : current)
      return
    }

    let cancelled = false
    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const token = await getTokenRef.current()
        const found = await searchTracks(trimmed, token, 15)
        if (!cancelled) setResults(previewOnly ? found.filter(track => !!track.preview) : found)
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setIsSearching(false)
      }
    }, 350)

    return () => {
      cancelled = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [previewOnly, query, visible])

  const body = (
    <>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-bold text-on-surface">Pick a track</Text>
        <TouchableOpacity onPress={onClose} className="p-1">
          <Ionicons name="close" size={24} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <SearchBar placeholder="Search songs" value={query} onChangeText={setQuery} />

      {isSearching ? (
        <View className="py-8 items-center">
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => String(item.id)}
          keyboardShouldPersistTaps="handled"
          className="mt-3"
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                onSelect(toTrackPayload(item))
              }}
              className="flex-row items-center gap-3 py-2.5"
            >
              {item.coverUrl ? (
                <Image source={{ uri: item.coverUrl }} style={{ width: 48, height: 48, borderRadius: 8 }} />
              ) : (
                <View
                  className="items-center justify-center"
                  style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: Colors.surfaceContainerHigh }}
                >
                  <Ionicons name="musical-note" size={20} color={Colors.onSurfaceVariant} />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-on-surface" numberOfLines={1}>{item.title}</Text>
                <Text className="text-[13px] text-on-surface-variant" numberOfLines={1}>{item.artist}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            query.trim().length >= 2 ? (
              <Text className="text-center text-on-surface-variant mt-8">
                {previewOnly ? 'No previewable tracks found' : 'No tracks found'}
              </Text>
            ) : null
          }
        />
      )}
    </>
  )

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <BlurView tint="dark" intensity={40} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {GLASS ? (
          <GlassView
            isInteractive
            glassEffectStyle="regular"
            style={{ height: '85%', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
          >
            <View className="self-center mb-4 rounded-full" style={{ width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.4)' }} />
            {body}
          </GlassView>
        ) : (
          <View className="rounded-t-3xl px-5 pt-4 pb-8" style={{ height: '85%', backgroundColor: Colors.surface }}>
            <View className="self-center mb-4 rounded-full" style={{ width: 36, height: 4, backgroundColor: Colors.outlineVariant }} />
            {body}
          </View>
        )}
      </View>
    </Modal>
  )
}
