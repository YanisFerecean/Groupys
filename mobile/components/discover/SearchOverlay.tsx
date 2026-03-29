import { Ionicons } from '@expo/vector-icons'
import { useAuth, useUser } from '@clerk/expo'
import { router } from 'expo-router'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Image,
  InteractionManager,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Audio, AVPlaybackStatus } from 'expo-av'
import type { BackendUser } from '@/lib/api'
import { searchCommunities } from '@/lib/api'
import { searchUsers } from '@/lib/chat-api'
import { Colors } from '@/constants/colors'
import { publicProfilePath } from '@/lib/profileRoutes'
import type { ArtistRes } from '@/models/ArtistRes'
import type { AlbumRes } from '@/models/AlbumRes'
import type { TrackRes } from '@/models/TrackRes'
import type { SearchResult } from '@/models/SearchResult'
import type { CommunityResDto } from '@/models/CommunityRes'
import type { TopAlbum } from '@/models/ProfileCustomization'
import AlbumRatingModal from '@/components/album/AlbumRatingModal'

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

function AlbumRow({ album, onPress }: { album: AlbumRes; onPress: () => void }) {
  const cover = album.coverSmall || album.coverMedium

  return (
    <TouchableOpacity style={styles.resultRow} activeOpacity={0.7} onPress={onPress}>
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
      <Ionicons name="star-outline" size={16} color="rgba(0,0,0,0.25)" />
    </TouchableOpacity>
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

function CommunityRow({ community, onPress }: { community: CommunityResDto; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.resultRow} activeOpacity={0.7} onPress={onPress}>
      {community.imageUrl ? (
        <Image source={{ uri: community.imageUrl }} style={styles.square} />
      ) : (
        <View style={[styles.square, styles.placeholder]}>
          <Ionicons name="people" size={18} color="#aaa" />
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>{community.name}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
          {community.genre ? ` · ${community.genre}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="rgba(0,0,0,0.25)" />
    </TouchableOpacity>
  )
}

function UserRow({ user, onPress }: { user: BackendUser; onPress: () => void }) {
  const initial = (user.displayName || user.username).charAt(0).toUpperCase()

  return (
    <TouchableOpacity style={styles.resultRow} activeOpacity={0.7} onPress={onPress}>
      {user.profileImage ? (
        <Image source={{ uri: user.profileImage }} style={styles.circle} />
      ) : (
        <View style={[styles.circle, styles.placeholder]}>
          <Text style={styles.userInitial}>{initial}</Text>
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {user.displayName || user.username}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          @{user.username}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="rgba(0,0,0,0.25)" />
    </TouchableOpacity>
  )
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

interface SearchOverlayProps {
  onClose: () => void
}

type Category = 'all' | 'artists' | 'songs' | 'albums' | 'users' | 'communities'

type SearchOverlayResult = SearchResult & {
  users: BackendUser[]
  communities: CommunityResDto[]
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'communities', label: 'Communities' },
  { value: 'users', label: 'Users' },
  { value: 'albums', label: 'Albums' },
  { value: 'artists', label: 'Artists' },
  { value: 'songs', label: 'Songs' },
]

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
  const { getToken, isLoaded: isAuthLoaded } = useAuth()
  const { user } = useUser()
  const insets = useSafeAreaInsets()
  const inputRef = useRef<TextInput>(null)
  const [ratingAlbum, setRatingAlbum] = useState<TopAlbum | null>(null)
  const getTokenRef = useRef(getToken)

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category>('all')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [playingId, setPlayingId] = useState<number | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const soundRef = useRef<Audio.Sound | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const categoryFadeAnim = useRef(new Animated.Value(1)).current
  const latestTransitionId = useRef(0)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  // Fade in on mount, auto-focus input
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start()
    let cancelled = false
    let task: ReturnType<typeof InteractionManager.runAfterInteractions> | null = null
    const t = setTimeout(() => {
      task = InteractionManager.runAfterInteractions(() => {
        if (!cancelled) {
          inputRef.current?.focus()
        }
      })
    }, 100)

    return () => {
      cancelled = true
      clearTimeout(t)
      task?.cancel()
    }
  }, [fadeAnim])

  // Debounce: update debouncedQuery 300ms after the user stops typing
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setDebouncedQuery('')
      return
    }
    const t = setTimeout(() => setDebouncedQuery(trimmed), 300)
    return () => clearTimeout(t)
  }, [query])

  const [results, setResults] = useState<SearchOverlayResult | null>(null)
  const [resultsKey, setResultsKey] = useState('')
  const [displayedResults, setDisplayedResults] = useState<SearchOverlayResult | null>(null)
  const [displayedResultsKey, setDisplayedResultsKey] = useState('')
  const [searching, setSearching] = useState(false)
  // Track whether we're in the debounce window (typed but not yet sent)
  const isDebouncing = query.trim().length > 0 && query.trim() !== debouncedQuery

  useEffect(() => {
    if (debouncedQuery.length === 0 || !isAuthLoaded) {
      setResults(null)
      setResultsKey('')
      setDisplayedResults(null)
      setDisplayedResultsKey('')
      setSearching(false)
      categoryFadeAnim.setValue(1)
      return
    }

    // Abort any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    let cancelled = false
    setSearching(true)
    ;(async () => {
      try {
        const token = await getTokenRef.current()
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }

        let data: SearchOverlayResult

        if (category === 'all') {
          const [searchRes, users, communities] = await Promise.all([
            fetch(
              `${process.env.EXPO_PUBLIC_API_URL}/search?q=${encodeURIComponent(debouncedQuery)}`,
              { headers, signal: controller.signal },
            ),
            searchUsers(debouncedQuery, token, 8),
            searchCommunities(debouncedQuery, token),
          ])

          if (!searchRes.ok) throw new Error(`API error ${searchRes.status}`)
          const searchData = (await searchRes.json()) as SearchResult
          data = { ...searchData, users, communities }
        } else if (category === 'users') {
          data = {
            artists: [],
            albums: [],
            tracks: [],
            users: await searchUsers(debouncedQuery, token, 12),
            communities: [],
          }
        } else if (category === 'communities') {
          data = {
            artists: [],
            albums: [],
            tracks: [],
            users: [],
            communities: await searchCommunities(debouncedQuery, token),
          }
        } else {
          const endpointMap: Record<Exclude<Category, 'all' | 'users' | 'communities'>, string> = {
            artists: 'artists',
            albums: 'albums',
            songs: 'tracks',
          }
          const res = await fetch(
            `${process.env.EXPO_PUBLIC_API_URL}/${endpointMap[category]}/search?q=${encodeURIComponent(debouncedQuery)}`,
            { headers, signal: controller.signal },
          )
          if (!res.ok) throw new Error(`API error ${res.status}`)
          const raw = await res.json()
          data = {
            artists: category === 'artists' ? raw as ArtistRes[] : [],
            albums: category === 'albums' ? raw as AlbumRes[] : [],
            tracks: category === 'songs' ? raw as TrackRes[] : [],
            users: [],
            communities: [],
          }
        }

        if (!cancelled) {
          const nextResults = {
            ...data,
            artists: [...data.artists].sort((a, b) => b.listeners - a.listeners),
          }
          setResults(nextResults)
          setResultsKey(`${category}:${debouncedQuery}`)
        }
      } catch (err) {
        if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'AbortError') return
        console.error('Search error:', err)
      } finally {
        if (!cancelled) setSearching(false)
      }
    })()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [category, categoryFadeAnim, debouncedQuery, isAuthLoaded])

  useEffect(() => {
    if (!results || !resultsKey) return

    if (!displayedResults || !displayedResultsKey) {
      categoryFadeAnim.setValue(1)
      setDisplayedResults(results)
      setDisplayedResultsKey(resultsKey)
      return
    }

    if (resultsKey === displayedResultsKey) {
      setDisplayedResults(results)
      return
    }

    latestTransitionId.current += 1
    const transitionId = latestTransitionId.current

    Animated.timing(categoryFadeAnim, {
      toValue: 0,
      duration: 110,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || transitionId !== latestTransitionId.current) return

      setDisplayedResults(results)
      setDisplayedResultsKey(resultsKey)
      categoryFadeAnim.setValue(0)

      Animated.timing(categoryFadeAnim, {
        toValue: 1,
        duration: 190,
        useNativeDriver: true,
      }).start()
    })
  }, [categoryFadeAnim, displayedResults, displayedResultsKey, results, resultsKey])

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
    if (!track.preview || !track.preview.startsWith('http')) return
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

  const handleUserPress = (user: BackendUser) => {
    handleClose()
    setTimeout(() => {
      router.push(publicProfilePath(user.id, '(discover)') as any)
    }, 200)
  }

  const handleCommunityPress = (community: CommunityResDto) => {
    handleClose()
    setTimeout(() => {
      router.push(`/(home)/(discover)/community/${community.id}` as any)
    }, 200)
  }

  const visibleResults = displayedResults
  const hasResults =
    visibleResults && (
      visibleResults.artists.length > 0 ||
      visibleResults.albums.length > 0 ||
      visibleResults.tracks.length > 0 ||
      visibleResults.users.length > 0 ||
      visibleResults.communities.length > 0
    )

  // Show "no results" only when we've actually completed a search for the current input
  const showNoResults =
    !searching && !isDebouncing && query.trim().length > 0 && !hasResults

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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryTabs}
        >
          {CATEGORIES.map(({ value, label }) => {
            const active = category === value
            return (
              <TouchableOpacity
                key={value}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setCategory(value)
                }}
                activeOpacity={0.8}
                style={[
                  styles.categoryTab,
                  active ? styles.categoryTabActive : styles.categoryTabInactive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    active ? styles.categoryTabTextActive : styles.categoryTabTextInactive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Results */}
        <Animated.View style={{ flex: 1, opacity: categoryFadeAnim }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: 4 }}
          >
            {/* Initial empty state */}
            {!query && !hasResults && (
              <Text style={styles.hint}>Start typing to search</Text>
            )}

            {/* Inline loading indicator — only when no results to show yet */}
            {(searching || isDebouncing) && !hasResults && <SearchingDots />}

            {/* No results — only after a completed search */}
            {showNoResults && (
              <Text style={styles.hint}>{'No results for "' + query.trim() + '"'}</Text>
            )}

            {/* Results list — stays visible while a new search is in-flight */}
            {hasResults && (
              <View style={styles.resultsWrap}>
                {visibleResults!.artists.length > 0 && (
                  <View style={styles.section}>
                    <SectionLabel label="Artists" />
                    {visibleResults!.artists.map((a) => (
                      <ArtistRow key={a.id} artist={a} onPress={() => handleArtistPress(a)} />
                    ))}
                  </View>
                )}

                {visibleResults!.albums.length > 0 && (
                  <View style={styles.section}>
                    <SectionLabel label="Albums" />
                    {visibleResults!.albums.map((a) => (
                      <AlbumRow
                        key={a.id}
                        album={a}
                        onPress={() =>
                          setRatingAlbum({
                            id: a.id,
                            title: a.title,
                            artist: a.artist?.name ?? '',
                            coverUrl: a.coverMedium || a.coverSmall || undefined,
                          })
                        }
                      />
                    ))}
                  </View>
                )}

                {visibleResults!.tracks.length > 0 && (
                  <View style={styles.section}>
                    <SectionLabel label="Songs" />
                    {visibleResults!.tracks.map((t) => (
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

                {visibleResults!.users.length > 0 && (
                  <View style={styles.section}>
                    <SectionLabel label="Users" />
                    {visibleResults!.users.map((user) => (
                      <UserRow key={user.id} user={user} onPress={() => handleUserPress(user)} />
                    ))}
                  </View>
                )}

                {visibleResults!.communities.length > 0 && (
                  <View style={styles.section}>
                    <SectionLabel label="Communities" />
                    {visibleResults!.communities.map((c) => (
                      <CommunityRow key={c.id} community={c} onPress={() => handleCommunityPress(c)} />
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>

      <AlbumRatingModal
        visible={ratingAlbum !== null}
        onClose={() => setRatingAlbum(null)}
        album={ratingAlbum}
        currentUserId={user?.id}
      />
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
  categoryScroll: {
    marginBottom: 10,
    flexGrow: 0,
  },
  categoryTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 2,
    paddingRight: 16,
  },
  categoryTab: {
    borderRadius: 999,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
  },
  categoryTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryTabInactive: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderColor: 'rgba(255,255,255,0.9)',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  categoryTabTextActive: {
    color: Colors.onPrimary,
  },
  categoryTabTextInactive: {
    color: Colors.onSurface,
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
  userInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
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
    marginTop: 8,
    marginBottom: 12,
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
