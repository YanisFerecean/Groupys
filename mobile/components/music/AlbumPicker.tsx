import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Image, Modal, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'

import SearchBar from '@/components/ui/SearchBar'
import { Colors } from '@/constants/colors'
import { searchAlbums } from '@/lib/musicSearch'
import type { AlbumSearchResult } from '@/models/AlbumSearchResult'
import type { AlbumPayload } from '@/models/ChatPayloads'

interface AlbumPickerProps {
  visible: boolean
  onClose: () => void
  onSelect: (album: AlbumPayload) => void
}

function toAlbumPayload(result: AlbumSearchResult): AlbumPayload {
  return {
    type: 'ALBUM',
    id: String(result.id),
    title: result.title,
    artist: result.artist,
    artworkUrl: result.coverUrl,
  }
}

/** Manual album catalog search picker (ticket 2.2). Works without a user subscription. */
export function AlbumPicker({ visible, onClose, onSelect }: AlbumPickerProps) {
  const { getToken } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AlbumSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const getTokenRef = useRef(getToken)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  useEffect(() => {
    if (!visible) {
      setQuery('')
      setResults([])
      setIsSearching(false)
    }
  }, [visible])

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
        const found = await searchAlbums(trimmed, token, 15)
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
  }, [query, visible])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View className="flex-1 bg-surface px-4 pt-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-bold text-on-surface">Pick an album</Text>
          <TouchableOpacity onPress={onClose} className="p-1">
            <Ionicons name="close" size={24} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        <SearchBar placeholder="Search albums" value={query} onChangeText={setQuery} />

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
                onPress={() => onSelect(toAlbumPayload(item))}
                className="flex-row items-center gap-3 py-2.5"
              >
                {item.coverUrl ? (
                  <Image source={{ uri: item.coverUrl }} style={{ width: 48, height: 48, borderRadius: 8 }} />
                ) : (
                  <View
                    className="items-center justify-center"
                    style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: Colors.surfaceContainerHigh }}
                  >
                    <Ionicons name="albums" size={20} color={Colors.onSurfaceVariant} />
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
                <Text className="text-center text-on-surface-variant mt-8">No albums found</Text>
              ) : null
            }
          />
        )}
      </View>
    </Modal>
  )
}
