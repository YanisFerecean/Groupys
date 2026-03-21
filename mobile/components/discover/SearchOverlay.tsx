import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { router } from 'expo-router'
import { BlurView } from 'expo-blur'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Audio, AVPlaybackStatus } from 'expo-av'
import { apiFetch } from '@/lib/api'
import { Colors } from '@/constants/colors'
import type { ArtistRes } from '@/models/ArtistRes'
import type { AlbumRes } from '@/models/AlbumRes'
import type { TrackRes } from '@/models/TrackRes'
import type { SearchResult } from '@/models/SearchResult'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

// ─── Result rows ─────────────────────────────────────────────────────────────

function ArtistRow({ artist, onPress }: { artist: ArtistRes; onPress: () => void }) {
  const image =
    artist.images.find((img) => img.includes('300x300')) ||
    artist.images[artist.images.length - 1]

  return (
    <TouchableOpacity style={styles.resultRow} activeOpacity={0.7} onPress={onPress}>
      {image ? (
        <Image source={{ uri: image }} style={styles.circle} />
      ) : (
        <View style={[styles.circle, styles.placeholder]}>
          <Ionicons name="person" size={18} color="#aaa" />
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>{artist.name}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{formatCount(artist.listeners)} listeners</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="rgba(0,0,0,0.25)" />
    </TouchableOpacity>
  )
}

function AlbumRow({ album }: { album: AlbumRes }) {
  const cover = album.coverSmall || album.coverMedium

  return (
    <View style={styles.resultRow}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.square} />
      ) : (
        <View style={[styles.square, styles.placeholder]}>
          <Ionicons name="disc" size={18} color="#aaa" />
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>{album.title}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{album.artist?.name}</Text>
      </View>
    </View>
  )
}

function TrackRow({
  track,
  isPlaying,
  isLoading,
  onPress,
}: {
  track: TrackRes
  isPlaying: boolean
  isLoading: boolean
  onPress: () => void
}) {
  const cover = track.album?.coverSmall || track.album?.coverMedium
  const spinAnim = useRef(new Animated.Value(0)).current
  const spinRef = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => {
    if (isLoading) {
      spinRef.current = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1800, useNativeDriver: true })
      )
      spinRef.current.start()
    } else {
      spinRef.current?.stop()
      spinAnim.setValue(0)
    }
  }, [isLoading, spinAnim])

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  return (
    <TouchableOpacity style={styles.resultRow} activeOpacity={0.7} onPress={onPress}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.square} />
      ) : (
        <View style={[styles.square, styles.placeholder]}>
          <Ionicons name="musical-note" size={18} color="#aaa" />
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, isPlaying && { color: Colors.primary }]} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>{track.artist?.name}</Text>
      </View>
      <View style={styles.playIndicator}>
        {isLoading ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="sync" size={16} color={Colors.primary} />
          </Animated.View>
        ) : isPlaying ? (
          <Ionicons name="pause" size={16} color={Colors.primary} />
        ) : (
          <Text style={styles.duration}>{formatDuration(track.duration)}</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

interface SearchOverlayProps {
  onClose: () => void
}

function SearchingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ]

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(360 - i * 120),
        ])
      )
    )
    animations.forEach((a) => a.start())
    return () => animations.forEach((a) => a.stop())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <View style={styles.dotsRow}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[styles.dot, { transform: [{ translateY: dot }] }]}
        />
      ))}
    </View>
  )
}

export default function SearchOverlay({ onClose }: SearchOverlayProps) {
  const { getToken } = useAuth()
  const insets = useSafeAreaInsets()
  const inputRef = useRef<TextInput>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [playingId, setPlayingId] = useState<number | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const soundRef = useRef<Audio.Sound | null>(null)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Stable ref so getToken never causes the search effect to re-run
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  // Track the last query that was actually fetched to avoid duplicate calls
  const lastFetchedRef = useRef<string>('')

  // Fade in on mount, auto-focus input
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start()
    const t = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [fadeAnim])

  // Debounced search — only re-runs when query changes, getToken is accessed via ref
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (!trimmed) {
      setResults(null)
      setSearching(false)
      lastFetchedRef.current = ''
      return
    }

    // Clear stale results immediately so the dots render in clean space
    setResults(null)

    debounceRef.current = setTimeout(async () => {
      // Skip if identical to last successful fetch
      if (trimmed === lastFetchedRef.current) return

      setSearching(true)
      try {
        const token = await getTokenRef.current()
        const data = await apiFetch<SearchResult>(`/search?q=${encodeURIComponent(trimmed)}`, token)
        lastFetchedRef.current = trimmed
        setResults({
          ...data,
          artists: [...data.artists].sort((a, b) => b.listeners - a.listeners),
        })
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setSearching(false)
      }
    }, 450)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Stop sound on unmount
  useEffect(() => {
    return () => { soundRef.current?.unloadAsync() }
  }, [])

  const handleClose = () => {
    soundRef.current?.stopAsync().then(() => soundRef.current?.unloadAsync())
    soundRef.current = null
    setPlayingId(null)
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(onClose)
  }

  const handleTrackPress = useCallback(async (track: TrackRes) => {
    if (playingId === track.id) {
      await soundRef.current?.stopAsync()
      await soundRef.current?.unloadAsync()
      soundRef.current = null
      setPlayingId(null)
      return
    }
    if (soundRef.current) {
      await soundRef.current.stopAsync()
      await soundRef.current.unloadAsync()
      soundRef.current = null
      setPlayingId(null)
    }
    if (!track.preview) return
    setLoadingId(track.id)
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true })
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.preview },
        { shouldPlay: true },
        (status: AVPlaybackStatus) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingId(null)
            soundRef.current?.unloadAsync()
            soundRef.current = null
          }
        }
      )
      soundRef.current = sound
      setPlayingId(track.id)
    } catch (err) {
      console.error('Playback error:', err)
    } finally {
      setLoadingId(null)
    }
  }, [playingId])

  const handleArtistPress = (artist: ArtistRes) => {
    handleClose()
    setTimeout(() => {
      router.push({ pathname: '/artist/[id]', params: { id: artist.id } })
    }, 200)
  }

  const hasResults =
    results && (results.artists.length > 0 || results.albums.length > 0 || results.tracks.length > 0)

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim }]}>
      <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFillObject} />

      {/* Overlay content */}
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>

        {/* Search input row */}
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <Ionicons name="search" size={18} color={Colors.outline} style={{ marginRight: 8 }} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Artists, albums, or tracks"
              placeholderTextColor={Colors.outline}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={Colors.outline} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: 8 }}
        >
          {searching && <SearchingDots />}

          {!searching && query.length > 0 && !hasResults && (
            <Text style={styles.hint}>{'No results for "' + query + '"'}</Text>
          )}

          {!searching && !query && (
            <Text style={styles.hint}>Start typing to search</Text>
          )}

          {hasResults && (
            <View style={styles.resultsWrap}>
              {results!.artists.length > 0 && (
                <View style={styles.section}>
                  <SectionLabel label="Artists" />
                  {results!.artists.map((a) => (
                    <ArtistRow key={a.id} artist={a} onPress={() => handleArtistPress(a)} />
                  ))}
                </View>
              )}

              {results!.albums.length > 0 && (
                <View style={styles.section}>
                  <SectionLabel label="Albums" />
                  {results!.albums.map((a) => (
                    <AlbumRow key={a.id} album={a} />
                  ))}
                </View>
              )}

              {results!.tracks.length > 0 && (
                <View style={styles.section}>
                  <SectionLabel label="Tracks" />
                  {results!.tracks.map((t) => (
                    <TrackRow
                      key={t.id}
                      track={t}
                      isPlaying={playingId === t.id}
                      isLoading={loadingId === t.id}
                      onPress={() => handleTrackPress(t)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Animated.View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    // shadow
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.onSurface,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingLeft: 2,
  },
  cancelText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  hint: {
    textAlign: 'center',
    color: Colors.outline,
    fontSize: 14,
    marginTop: 32,
  },
  resultsWrap: {
    gap: 8,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  square: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  placeholder: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  rowSub: {
    fontSize: 12,
    color: Colors.outline,
    marginTop: 1,
  },
  duration: {
    fontSize: 12,
    color: Colors.outline,
  },
  playIndicator: {
    width: 32,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 40,
    height: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    opacity: 0.75,
  },
})
