import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Image, Modal, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'

import SearchBar from '@/components/ui/SearchBar'
import { Colors } from '@/constants/colors'
import { searchTracks } from '@/lib/musicSearch'
import type { TrackSearchResult } from '@/models/TrackSearchResult'
import type { TrackPayload } from '@/models/ChatPayloads'

interface TrackPickerProps {
  visible: boolean
  onClose: () => void
  onSelect: (track: TrackPayload) => void
}

function toTrackPayload(result: TrackSearchResult): TrackPayload {
  return {
    type: 'TRACK',
    id: String(result.id),
    title: result.title,
    artist: result.artist,
    album: result.album,
    artworkUrl: result.coverUrl,
    previewUrl: result.preview,
  }
}

/**
 * Manual catalog search picker (ticket 0.2). Uses the developer-token-backed catalog search,
 * so it works for content creation even when the user has not connected Apple Music.
 */
export function TrackPicker({ visible, onClose, onSelect }: TrackPickerProps) {
  const { getToken } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TrackSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!visible) {
      setQuery('')
      setResults([])
    }
  }, [visible])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setIsSearching(false)
      return
    }

    let cancelled = false
    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const token = await getToken()
        const found = await searchTracks(trimmed, token, 15)
        if (!cancelled) setResults(found)
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
  }, [query, getToken])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View className="flex-1 bg-surface px-4 pt-4">
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
                onPress={() => onSelect(toTrackPayload(item))}
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
                <Text className="text-center text-on-surface-variant mt-8">No tracks found</Text>
              ) : null
            }
          />
        )}
      </View>
    </Modal>
  )
}
