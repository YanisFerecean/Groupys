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

interface CountryPickerProps {
  value: string
  onChange: (country: string) => void
}

export function CountryPicker({ value, onChange }: CountryPickerProps) {
  const { getToken } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ code: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = async (text: string) => {
    setQuery(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    if (text.length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const token = await getToken()
        if (!token) return
        const data = await apiFetch<{ code: string; name: string }[]>(`/countries?q=${encodeURIComponent(text)}`, token)
        setResults(data.slice(0, 5)) // top 5
      } catch (err) {
        console.error('Country search error:', err)
      } finally {
        setLoading(false)
      }
    }, 350)
  }

  const select = (name: string) => {
    onChange(name)
    setIsSearching(false)
    setQuery('')
    setResults([])
  }

  if (!isSearching) {
    return (
      <View>
        <TextInput
          value={value}
          onFocus={() => setIsSearching(true)}
          placeholder="e.g. United States"
          placeholderTextColor={Colors.onSurfaceVariant}
          className="bg-surface-container rounded-xl px-4 py-3.5 text-base text-on-surface"
        />
      </View>
    )
  }

  return (
    <View>
      <View className="flex-row items-center bg-surface-container rounded-xl px-4 py-3.5 gap-3 border border-primary">
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons name="search" size={20} color={Colors.primary} />
        )}
        <TextInput
          autoFocus
          value={query}
          onChangeText={search}
          placeholder="Search country..."
          placeholderTextColor={Colors.onSurfaceVariant}
          className="flex-1 text-base text-on-surface"
        />
        <TouchableOpacity onPress={() => setIsSearching(false)}>
          <Ionicons name="close-circle" size={20} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
      
      {results.length > 0 && (
        <View className="mt-1 rounded-xl bg-surface-container-lowest border border-outline-variant overflow-hidden">
          {results.map((c, i) => (
            <TouchableOpacity
              key={c.code}
              onPress={() => select(c.name)}
              className="px-4 py-3"
              style={{ borderTopWidth: i > 0 ? 1 : 0, borderTopColor: Colors.outlineVariant }}
            >
              <Text className="text-base text-on-surface">{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}
