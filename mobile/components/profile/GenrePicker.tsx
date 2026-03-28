import { useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import { useAuth } from '@clerk/expo'
import { apiFetch } from '@/lib/api'

interface GenrePickerProps {
  onSelect: (genre: string) => void
}

export function GenrePicker({ onSelect }: GenrePickerProps) {
  const { getToken } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = async (text: string) => {
    setQuery(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    if (text.length < 1) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const token = await getToken()
        if (!token) return
        const data = await apiFetch<{ id: number; name: string }[]>(`/genres?q=${encodeURIComponent(text)}`, token)
        setResults(data.slice(0, 5))
      } catch (err) {
        console.error('Genre search error:', err)
      } finally {
        setLoading(false)
      }
    }, 350)
  }

  const select = (name: string) => {
    onSelect(name)
    setQuery('')
    setResults([])
  }

  return (
    <View>
      <View className="flex-row items-center bg-surface-container rounded-xl px-4 py-3.5 gap-3">
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons name="search" size={20} color={Colors.onSurfaceVariant} />
        )}
        <TextInput
          value={query}
          onChangeText={search}
          placeholder="Search or type a custom tag..."
          placeholderTextColor={Colors.onSurfaceVariant}
          className="flex-1 text-base text-on-surface"
          returnKeyType="done"
          onSubmitEditing={() => { if (query.trim()) select(query.trim()) }}
          blurOnSubmit={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]) }}>
            <Ionicons name="close-circle" size={20} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
        {query.trim().length > 0 && (
          <TouchableOpacity
            onPress={() => select(query.trim())}
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: Colors.primary }}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {query.trim().length > 0 && (
        <View className="mt-1 rounded-xl bg-surface-container-lowest border border-outline-variant overflow-hidden">
          {results.map((g, i) => (
            <TouchableOpacity
              key={g.id}
              onPress={() => select(g.name)}
              className="px-4 py-3"
              style={{ borderTopWidth: i > 0 ? 1 : 0, borderTopColor: Colors.outlineVariant }}
            >
              <Text className="text-base text-on-surface">{g.name}</Text>
            </TouchableOpacity>
          ))}
          {!results.some((g) => g.name.toLowerCase() === query.trim().toLowerCase()) && (
            <TouchableOpacity
              onPress={() => select(query.trim())}
              className="flex-row items-center gap-2 px-4 py-3"
              style={{ borderTopWidth: results.length > 0 ? 1 : 0, borderTopColor: Colors.outlineVariant }}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text className="text-base text-primary">
                Add &quot;{query.trim()}&quot;
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}
