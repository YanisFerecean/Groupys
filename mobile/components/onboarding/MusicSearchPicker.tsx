import { useRef, useState } from 'react'
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { Colors } from '@/constants/colors'
import { searchAlbums, searchArtists, searchTracks } from '@/lib/musicSearch'

export interface PickItem {
  id: number
  title: string
  subtitle?: string
  image?: string
  rounded?: boolean
}

export type PickerType = 'artist' | 'track' | 'album'

const CONFIG: Record<
  PickerType,
  { placeholder: string; rounded: boolean; search: (q: string, token: string | null) => Promise<PickItem[]> }
> = {
  artist: {
    placeholder: 'Search artists…',
    rounded: true,
    search: async (q, token) =>
      (await searchArtists(q, token, 6)).map((a) => ({
        id: a.id,
        title: a.name,
        image: a.imageUrl,
        rounded: true,
      })),
  },
  track: {
    placeholder: 'Search songs…',
    rounded: false,
    search: async (q, token) =>
      (await searchTracks(q, token, 6)).map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: t.artist,
        image: t.coverUrl,
      })),
  },
  album: {
    placeholder: 'Search albums…',
    rounded: false,
    search: async (q, token) =>
      (await searchAlbums(q, token, 6)).map((a) => ({
        id: a.id,
        title: a.title,
        subtitle: a.artist,
        image: a.coverUrl,
      })),
  },
}

interface MusicSearchPickerProps {
  type: PickerType
  selected: PickItem[]
  onChange: (items: PickItem[]) => void
  max?: number
}

function Thumb({ item, size }: { item: PickItem; size: number }) {
  const radius = item.rounded ? size / 2 : 10
  if (item.image) {
    return (
      <Image source={{ uri: item.image }} style={{ width: size, height: size, borderRadius: radius }} contentFit="cover" />
    )
  }
  return (
    <View
      className="items-center justify-center bg-surface-container-high"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <Ionicons name="musical-notes" size={size * 0.45} color={Colors.onSurfaceVariant} />
    </View>
  )
}

export default function MusicSearchPicker({ type, selected, onChange, max = 3 }: MusicSearchPickerProps) {
  const { getToken } = useAuth()
  const cfg = CONFIG[type]
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PickItem[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const full = selected.length >= max

  const runSearch = (text: string) => {
    setQuery(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (text.trim().length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const token = await getToken()
        const found = await cfg.search(text.trim(), token)
        const seen = new Set<number>()
        setResults(found.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  const add = (item: PickItem) => {
    if (full || selected.some((s) => s.id === item.id)) return
    onChange([...selected, { ...item, rounded: cfg.rounded || item.rounded }])
    setQuery('')
    setResults([])
  }

  const remove = (id: number) => onChange(selected.filter((s) => s.id !== id))

  return (
    <View>
      {selected.length > 0 ? (
        <View className="mb-3 gap-2.5">
          {selected.map((item) => (
            <View key={item.id} className="flex-row items-center gap-3 rounded-2xl bg-surface-container p-3">
              <Thumb item={item} size={44} />
              <View className="flex-1">
                <Text className="text-base font-bold text-on-surface" numberOfLines={1}>
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text className="text-sm text-on-surface-variant" numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => remove(item.id)} className="p-1">
                <Ionicons name="close-circle" size={24} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      {!full ? (
        <View className="flex-row items-center gap-3 rounded-xl bg-surface-container px-4 py-3.5">
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="search" size={20} color={Colors.onSurfaceVariant} />
          )}
          <TextInput
            value={query}
            onChangeText={runSearch}
            placeholder={cfg.placeholder}
            placeholderTextColor={Colors.onSurfaceVariant}
            className="flex-1 text-base text-on-surface"
          />
        </View>
      ) : null}

      {results.length > 0 && !full ? (
        <View className="mt-1 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          {results.map((item, i) => {
            const chosen = selected.some((s) => s.id === item.id)
            return (
              <TouchableOpacity
                key={`${item.id}-${i}`}
                onPress={() => add(item)}
                disabled={chosen}
                className="flex-row items-center gap-3 px-3 py-2.5"
                style={{ borderTopWidth: i > 0 ? 1 : 0, borderTopColor: Colors.outlineVariant, opacity: chosen ? 0.4 : 1 }}
              >
                <Thumb item={item} size={40} />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-on-surface" numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text className="text-sm text-on-surface-variant" numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
                {chosen ? <Ionicons name="checkmark-circle" size={22} color={Colors.primary} /> : null}
              </TouchableOpacity>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}
