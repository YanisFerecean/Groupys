import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GlassView } from 'expo-glass-effect'

interface SearchTabBarProps {
  onSearch?: (query: string) => void
  placeholder?: string
}

export default function SearchTabBar({
  onSearch,
  placeholder = 'Search artists, songs, albums...',
}: SearchTabBarProps) {
  const [query, setQuery] = useState('')
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const handleSubmit = () => {
    if (query.trim() && onSearch) {
      onSearch(query.trim())
    }
  }

  return (
    <View style={[styles.container, { bottom: insets.bottom + 80 }]}>
      <GlassView
        style={styles.glassContainer}
        glassEffectStyle="regular"
      >
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={isDark ? '#fff' : '#000'}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              style={styles.clearButton}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.micButton}>
            <Ionicons
              name="mic"
              size={20}
              color={isDark ? '#fff' : '#000'}
            />
          </TouchableOpacity>
        </View>
      </GlassView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 80,
    right: 80,
    zIndex: 100,
  },
  glassContainer: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: {
    marginLeft: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  clearButton: {
    padding: 4,
  },
  micButton: {
    padding: 4,
    marginLeft: 4,
  },
})
