import { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
} from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import ColorWheel from 'react-native-wheel-color-picker'
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist'
import { useAuth, useUser } from '@clerk/expo'
import { router, Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import type { ProfileCustomization } from '@/models/ProfileCustomization'
import { searchTracks, searchArtists, searchAlbums } from '@/lib/musicSearch'
import { APPLE_MUSIC_CONNECT_ENABLED } from '@/lib/appleMusicAuth'
import { useProfileCustomization } from '@/hooks/useProfileCustomization'
import { CountryPicker } from './CountryPicker'
import { GenrePicker } from './GenrePicker'
import { MusicConnectButton } from './MusicConnectButton'
import type { TrackSearchResult } from '@/models/TrackSearchResult'
import type { ArtistSearchResult } from '@/models/ArtistSearchResult'
import type { AlbumSearchResult } from '@/models/AlbumSearchResult'

// ── Presets ─────────────────────────────────────────────────────────────────

const BANNER_PRESETS = [
  // User's choices
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1000&auto=format&fit=crop', // Basketball
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1000&auto=format&fit=crop', // Concert
  'https://images.unsplash.com/photo-1667833966178-f98135a582f8?q=80&w=1000&auto=format&fit=crop', // Abstract
  // My choices (patterns/suits app)
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop', // Dark Abstract Wave
  'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=1000&auto=format&fit=crop', // Neon Music Studio
  'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop', // Minimalist Vinyl/Audio
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000&auto=format&fit=crop', // Synthwave / Cyberpunk
  'https://images.unsplash.com/photo-1603048588665-791ca8aea617?q=80&w=1000&auto=format&fit=crop', // Vinyl Minimalist
]

const ACCENT_PRESETS = [
  Colors.primary,
  '#e5183b',
  '#00685c',
  '#1a56db',
  '#7e3af2',
  '#f59e0b',
  '#ec4899',
  '#1a1c1d',
]

const NAME_COLOR_PRESETS = [
  '#1a1c1d',
  '#ffffff',
  Colors.primary,
  '#e5183b',
  '#7e3af2',
  '#1a56db',
  '#f59e0b',
]

// ── Music search component ───────────────────────────────────────────────────

type SearchType = 'track' | 'artist' | 'album'
type SearchResult = TrackSearchResult | ArtistSearchResult | AlbumSearchResult
type WidgetType = 'topAlbums' | 'currentlyListening' | 'topSongs' | 'topArtists'
type WidgetListItem = {
  type: WidgetType
  title: string
  description: string
  icon: keyof typeof Ionicons.glyphMap
}

const DEFAULT_WIDGET_ORDER: WidgetType[] = ['topAlbums', 'currentlyListening', 'topSongs', 'topArtists']
const WIDGET_ITEMS: WidgetListItem[] = [
  {
    type: 'topAlbums',
    title: 'Top Albums',
    description: 'Show your favorite album picks.',
    icon: 'albums-outline',
  },
  {
    type: 'currentlyListening',
    title: 'Currently Listening',
    description: 'Highlight what is playing right now.',
    icon: 'headset-outline',
  },
  {
    type: 'topSongs',
    title: 'Top Songs',
    description: 'Pin the tracks that define your taste.',
    icon: 'musical-notes-outline',
  },
  {
    type: 'topArtists',
    title: 'Top Artists',
    description: 'Feature the artists you keep coming back to.',
    icon: 'people-outline',
  },
]

function normalizeWidgetOrder(order?: string[]): WidgetType[] {
  const incoming = (order ?? []).filter((type): type is WidgetType =>
    DEFAULT_WIDGET_ORDER.includes(type as WidgetType)
  )
  return [...incoming, ...DEFAULT_WIDGET_ORDER.filter(type => !incoming.includes(type))]
}


interface MusicSearchProps {
  type: SearchType
  placeholder: string
  onSelect: (result: SearchResult) => void
}

function MusicSearch({ type, placeholder, onSelect }: MusicSearchProps) {
  const { getToken } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (text: string) => {
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
        if (type === 'track') setResults(await searchTracks(text, token, 5))
        else if (type === 'artist') setResults(await searchArtists(text, token, 5))
        else setResults(await searchAlbums(text, token, 5))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)
  }

  const handleSelect = (result: SearchResult) => {
    onSelect(result)
    setQuery('')
    setResults([])
  }

  return (
    <View>
      <View className="flex-row items-center bg-surface-container rounded-xl px-4 py-3 gap-3">
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons name="search" size={20} color={Colors.onSurfaceVariant} />
        )}
        <TextInput
          value={query}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.onSurfaceVariant}
          className="flex-1 text-base text-on-surface"
          style={{ color: Colors.onSurface }}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]) }}>
            <Ionicons name="close-circle" size={20} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>

      {results.length > 0 && (
        <View className="mt-1 rounded-xl bg-surface-container-lowest border border-outline-variant overflow-hidden">
          {results.map((result, i) => (
            <TouchableOpacity
              key={String((result as { id: number }).id)}
              onPress={() => handleSelect(result)}
              className="flex-row items-center gap-3 px-4 py-3"
              style={{ borderTopWidth: i > 0 ? 1 : 0, borderTopColor: Colors.outlineVariant }}
            >
              {type === 'track' && (
                <>
                  <View className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container shrink-0">
                    {(result as TrackSearchResult).coverUrl ? (
                      <Image source={{ uri: (result as TrackSearchResult).coverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : null}
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-base font-semibold text-on-surface" numberOfLines={1}>{(result as TrackSearchResult).title}</Text>
                    <Text className="text-sm text-on-surface-variant" numberOfLines={1}>{(result as TrackSearchResult).artist} · {(result as TrackSearchResult).album}</Text>
                  </View>
                </>
              )}
              {type === 'artist' && (
                <>
                  <View className="w-12 h-12 rounded-full overflow-hidden bg-surface-container shrink-0">
                    {(result as ArtistSearchResult).imageUrl ? (
                      <Image source={{ uri: (result as ArtistSearchResult).imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : null}
                  </View>
                  <Text className="text-base font-semibold text-on-surface flex-1" numberOfLines={1}>{(result as ArtistSearchResult).name}</Text>
                </>
              )}
              {type === 'album' && (
                <>
                  <View className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container shrink-0">
                    {(result as AlbumSearchResult).coverUrl ? (
                      <Image source={{ uri: (result as AlbumSearchResult).coverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : null}
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-base font-semibold text-on-surface" numberOfLines={1}>{(result as AlbumSearchResult).title}</Text>
                    <Text className="text-sm text-on-surface-variant" numberOfLines={1}>{(result as AlbumSearchResult).artist}</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

// ── Color picker ─────────────────────────────────────────────────────────────

interface ColorPickerProps {
  label: string
  value: string
  presets: string[]
  onChange: (v: string) => void
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isValidHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)
  const initialColor = isValidHex ? value : '#ffffff'

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsExpanded(!isExpanded)
  }

  return (
    <View className="gap-2">
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.7}
        className="flex-row items-center justify-between bg-surface-container rounded-2xl px-4 py-3.5"
        style={{ borderWidth: isExpanded ? 2 : 1, borderColor: isExpanded ? Colors.primary : Colors.outlineVariant }}
      >
        <View className="flex-row items-center gap-3">
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              backgroundColor: isValidHex ? value : Colors.surfaceContainerHigh,
              borderWidth: 1,
              borderColor: Colors.outlineVariant,
            }}
          />
          <Text className="text-base font-bold text-on-surface">{label}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          {isValidHex && !isExpanded && (
            <Text className="text-sm font-mono text-on-surface-variant uppercase">{value}</Text>
          )}
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={isExpanded ? Colors.primary : Colors.onSurfaceVariant}
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View className="bg-surface-container rounded-2xl p-4 gap-4 mt-1 border border-outline-variant">
          <View style={{ height: 260 }}>
            <ColorWheel
              color={initialColor}
              onColorChangeComplete={onChange}
              thumbSize={24}
              sliderSize={12}
              noSnap={true}
              row={false}
            />
          </View>
          
          <View className="flex-row items-center justify-between mt-2 gap-3">
            <View className="flex-row items-center gap-3 flex-1">
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: isValidHex ? value : Colors.surfaceContainer,
                  borderWidth: 1.5,
                  borderColor: Colors.outlineVariant,
                }}
              />
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="#hex color"
                placeholderTextColor={Colors.onSurfaceVariant}
                className="bg-surface-container-high rounded-xl px-3 py-2 text-base text-on-surface flex-1"
                style={{ color: Colors.onSurface }}
                autoCapitalize="none"
                maxLength={7}
              />
            </View>
            <TouchableOpacity
              onPress={() => onChange('')}
              className="items-center justify-center bg-surface-container-high rounded-xl px-4 py-3"
              style={{ borderWidth: 1.5, borderColor: Colors.outlineVariant }}
            >
              <Text className="text-sm font-semibold text-on-surface-variant">Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

// ── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-base font-extrabold text-on-surface mb-1">
      {children}
    </Text>
  )
}

interface SectionHeaderWithMusicSyncProps {
  title: string
  synced: boolean
  canSync: boolean
  onToggle: (value: boolean) => void
}

function SectionHeaderWithMusicSync({
  title,
  synced,
  canSync,
  onToggle,
}: SectionHeaderWithMusicSyncProps) {
  return (
    <View className="flex-row items-center justify-between">
      <SectionLabel>{title}</SectionLabel>
      <View className="flex-row items-center gap-2">
        <MaterialCommunityIcons
          name="apple"
          size={16}
          color={canSync ? '#FA243C' : Colors.onSurfaceVariant}
        />
        <Text className="text-xs font-semibold" style={{ color: canSync ? Colors.onSurface : Colors.onSurfaceVariant }}>
          Sync
        </Text>
        <Switch
          value={synced}
          onValueChange={onToggle}
          disabled={!canSync}
          trackColor={{ false: Colors.outlineVariant, true: '#FA243C66' }}
          thumbColor={synced ? '#FA243C' : '#f4f3f4'}
        />
      </View>
    </View>
  )
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'appearance' | 'music' | 'widgets'
type ProfileStep = 'basics' | 'details'

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'profile', label: 'Profile', icon: 'person-outline' },
  { key: 'appearance', label: 'Appearance', icon: 'color-palette-outline' },
  { key: 'music', label: 'Music', icon: 'musical-notes-outline' },
  { key: 'widgets', label: 'Widgets', icon: 'apps-outline' },
]

const PROFILE_STEPS: { key: ProfileStep; label: string; subtitle: string }[] = [
  { key: 'basics', label: 'Basics', subtitle: 'Photo, name, and bio' },
  { key: 'details', label: 'Details', subtitle: 'Location, tags, and integration' },
]

function toProviderNeutralProfile(profile: ProfileCustomization): ProfileCustomization {
  const musicConnected = profile.musicConnected ?? profile.spotifyConnected ?? false
  const syncTopSongsWithMusic = profile.syncTopSongsWithMusic ?? profile.syncTopSongsWithSpotify ?? false
  const syncTopArtistsWithMusic = profile.syncTopArtistsWithMusic ?? profile.syncTopArtistsWithSpotify ?? false
  const syncTopAlbumsWithMusic = profile.syncTopAlbumsWithMusic ?? profile.syncTopAlbumsWithSpotify ?? false

  return {
    ...profile,
    musicConnected,
    spotifyConnected: musicConnected,
    syncTopSongsWithMusic,
    syncTopArtistsWithMusic,
    syncTopAlbumsWithMusic,
    syncTopSongsWithSpotify: syncTopSongsWithMusic,
    syncTopArtistsWithSpotify: syncTopArtistsWithMusic,
    syncTopAlbumsWithSpotify: syncTopAlbumsWithMusic,
  }
}

// ── Main component ───────────────────────────────────────────────────────────

export default function EditProfileModal() {
  const insets = useSafeAreaInsets()
  const { getToken } = useAuth()
  const { user } = useUser()
  const { profile, updateProfile, isLoaded, isSaving } = useProfileCustomization()
  const canUseNativeMusicSync = Platform.OS === 'ios' && APPLE_MUSIC_CONNECT_ENABLED
  const useGlass = isLiquidGlassAvailable()
  const onClose = useCallback(() => {
    router.back()
  }, [])
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarUrl = user?.imageUrl ?? null
  const [tab, setTab] = useState<Tab>('profile')
  const [profileStep, setProfileStep] = useState<ProfileStep>('basics')
  const [form, setForm] = useState<ProfileCustomization>({
    ...toProviderNeutralProfile(profile),
    widgetOrder: normalizeWidgetOrder(profile.widgetOrder),
    hiddenWidgets: toProviderNeutralProfile(profile).hiddenWidgets ?? [],
  })
  const [error, setError] = useState<string | null>(null)
  const hasInitializedRef = useRef(false)

  // Reset form when modal opens
  const handleOpen = useCallback(() => {
    const normalizedProfile = toProviderNeutralProfile(profile)
    setForm({
      ...normalizedProfile,
      widgetOrder: normalizeWidgetOrder(normalizedProfile.widgetOrder),
      hiddenWidgets: normalizedProfile.hiddenWidgets ?? [],
    })
    setTab('profile')
    setProfileStep('basics')
    setError(null)

    // Auto-repair missing IDs for better navigation
    ;(async () => {
      try {
        const token = await getToken()
        const newForm = { ...normalizedProfile }
        let changed = false

        // Repair Top Artists
        if (newForm.topArtists?.length) {
          const repairedArtists = await Promise.all(
            newForm.topArtists.map(async (a) => {
              if (a.id) return a
              const results = await searchArtists(a.name, token, 1)
              const match = results.find((r) => r.name.toLowerCase() === a.name.toLowerCase())
              if (match) {
                changed = true
                return { ...a, id: match.id }
              }
              return a
            })
          )
          newForm.topArtists = repairedArtists
        }

        // Repair Top Songs
        if (newForm.topSongs?.length) {
          const repairedSongs = await Promise.all(
            newForm.topSongs.map(async (s) => {
              if (s.id && s.previewUrl) return s
              const results = await searchTracks(s.title, token, 5)
              const match = results.find(
                (r) =>
                  r.title.toLowerCase() === s.title.toLowerCase() &&
                  r.artist.toLowerCase() === s.artist.toLowerCase()
              )
              if (match) {
                changed = true
                return { ...s, id: match.id, previewUrl: match.preview }
              }
              return s
            })
          )
          newForm.topSongs = repairedSongs
        }

        // Repair Top Albums
        if (newForm.topAlbums?.length) {
          const repairedAlbums = await Promise.all(
            newForm.topAlbums.map(async (al) => {
              if (al.id) return al
              const results = await searchAlbums(al.title, token, 5)
              const match = results.find(
                (r) =>
                  r.title.toLowerCase() === al.title.toLowerCase() &&
                  r.artist.toLowerCase() === al.artist.toLowerCase()
              )
              if (match) {
                changed = true
                return { ...al, id: match.id }
              }
              return al
            })
          )
          newForm.topAlbums = repairedAlbums
        }

        if (changed) {
          // Patch only the resolved IDs onto the current form state so any
          // deletions / additions the user made while we were fetching are preserved.
          setForm((prev) => {
            const updated = { ...prev }

            if (newForm.topArtists?.length) {
              const idByName = new Map(
                newForm.topArtists.filter((a) => a.id).map((a) => [a.name.toLowerCase(), a.id])
              )
              updated.topArtists = prev.topArtists?.map((a) =>
                a.id ? a : { ...a, id: idByName.get(a.name.toLowerCase()) ?? a.id }
              )
            }

            if (newForm.topSongs?.length) {
              const patchByKey = new Map(
                newForm.topSongs.filter((s) => s.id).map((s) => [
                  `${s.title.toLowerCase()}|${s.artist.toLowerCase()}`,
                  { id: s.id, previewUrl: s.previewUrl },
                ])
              )
              updated.topSongs = prev.topSongs?.map((s) => {
                const patch = patchByKey.get(`${s.title.toLowerCase()}|${s.artist.toLowerCase()}`)
                return patch ? { ...s, ...patch } : s
              })
            }

            if (newForm.topAlbums?.length) {
              const idByKey = new Map(
                newForm.topAlbums.filter((al) => al.id).map((al) => [
                  `${al.title.toLowerCase()}|${al.artist.toLowerCase()}`,
                  al.id,
                ])
              )
              updated.topAlbums = prev.topAlbums?.map((al) => {
                const id = idByKey.get(`${al.title.toLowerCase()}|${al.artist.toLowerCase()}`)
                return id && !al.id ? { ...al, id } : al
              })
            }

            return updated
          })
        }
      } catch (err) {
        console.warn('Auto-repair IDs failed:', err)
      }
    })()
  }, [profile, getToken])

  const set = <K extends keyof ProfileCustomization>(key: K, value: ProfileCustomization[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const setMusicConnected = (value: boolean) => {
    setForm((prev) => ({
      ...prev,
      musicConnected: value,
      spotifyConnected: value,
    }))
  }

  const setMusicSync = (
    key: 'syncTopAlbumsWithMusic' | 'syncTopSongsWithMusic' | 'syncTopArtistsWithMusic',
    value: boolean,
  ) => {
    setForm((prev) => {
      if (key === 'syncTopAlbumsWithMusic') {
        return {
          ...prev,
          syncTopAlbumsWithMusic: value,
          syncTopAlbumsWithSpotify: value,
        }
      }
      if (key === 'syncTopSongsWithMusic') {
        return {
          ...prev,
          syncTopSongsWithMusic: value,
          syncTopSongsWithSpotify: value,
        }
      }
      return {
        ...prev,
        syncTopArtistsWithMusic: value,
        syncTopArtistsWithSpotify: value,
      }
    })
  }

  const handleSave = async () => {
    setError(null)
    try {
      await updateProfile(form)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.')
    }
  }

  const handleAvatarPress = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    })

    if (result.canceled || !result.assets?.[0]?.uri) return

    setIsUploadingAvatar(true)
    try {
      const asset = result.assets[0]
      const filename = asset.uri.split('/').pop() ?? 'avatar.jpg'
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'
      const file = {
        uri: asset.uri,
        type: mimeType,
        name: filename,
      } as unknown as Blob

      await user?.setProfileImage({ file })
    } catch (e) {
      console.error('Avatar upload failed:', e)
    } finally {
      setIsUploadingAvatar(false)
    }
  }, [user])

  // Tags helpers
  const toggleTag = (tag: string) => {
    const currentTags = form.tags || []
    if (currentTags.includes(tag)) {
      set('tags', currentTags.filter((t) => t !== tag))
    } else if (currentTags.length < 5) {
      set('tags', [...currentTags, tag])
    }
  }

  // Music helpers
  const addAlbum = (r: AlbumSearchResult) => {
    const albums = [...(form.topAlbums ?? [])]
    if (albums.length < 3) {
      albums.push({ id: r.id, title: r.title, artist: r.artist, coverUrl: r.coverUrl })
      set('topAlbums', albums)
    }
  }
  const removeAlbum = (i: number) => {
    const albums = [...(form.topAlbums ?? [])]
    albums.splice(i, 1)
    set('topAlbums', albums)
  }

  const addSong = (r: TrackSearchResult) => {
    const songs = [...(form.topSongs ?? [])]
    if (songs.length < 3) {
      songs.push({ id: r.id, title: r.title, artist: r.artist, coverUrl: r.coverUrl, previewUrl: r.preview })
      set('topSongs', songs)
    }
  }
  const removeSong = (i: number) => {
    const songs = [...(form.topSongs ?? [])]
    songs.splice(i, 1)
    set('topSongs', songs)
  }

  const addArtist = (r: ArtistSearchResult) => {
    const artists = [...(form.topArtists ?? [])]
    if (artists.length < 3) {
      artists.push({ id: r.id, name: r.name, imageUrl: r.imageUrl })
      set('topArtists', artists)
    }
  }
  const removeArtist = (i: number) => {
    const artists = [...(form.topArtists ?? [])]
    artists.splice(i, 1)
    set('topArtists', artists)
  }

  const hasWidgetContent = useCallback((type: WidgetType) => {
    switch (type) {
      case 'topAlbums':
        return Boolean((form.topAlbums?.length ?? 0) > 0 || form.syncTopAlbumsWithMusic)
      case 'currentlyListening':
        return Boolean(form.currentlyListening?.title)
      case 'topSongs':
        return Boolean((form.topSongs?.length ?? 0) > 0 || form.syncTopSongsWithMusic)
      case 'topArtists':
        return Boolean((form.topArtists?.length ?? 0) > 0 || form.syncTopArtistsWithMusic)
    }
  }, [
    form.currentlyListening?.title,
    form.syncTopAlbumsWithMusic,
    form.syncTopArtistsWithMusic,
    form.syncTopSongsWithMusic,
    form.topAlbums?.length,
    form.topArtists?.length,
    form.topSongs?.length,
  ])

  const toggleWidgetHidden = useCallback((type: WidgetType) => {
    setForm(prev => {
      const hiddenWidgets = prev.hiddenWidgets ?? []
      return {
        ...prev,
        hiddenWidgets: hiddenWidgets.includes(type)
          ? hiddenWidgets.filter(item => item !== type)
          : [...hiddenWidgets, type],
      }
    })
  }, [])

  const renderWidgetListItem = useCallback(({ item, drag, isActive }: RenderItemParams<WidgetListItem>) => {
    const hidden = (form.hiddenWidgets ?? []).includes(item.type)
    const hasContent = hasWidgetContent(item.type)

    return (
      <View
        className="mb-3 rounded-2xl px-4 py-4"
        style={{
          backgroundColor: isActive ? Colors.surfaceContainer : Colors.surfaceContainerLow,
          borderWidth: 1,
          borderColor: isActive ? `${Colors.primary}99` : Colors.outlineVariant,
          opacity: isActive ? 0.98 : 1,
          shadowColor: '#000',
          shadowOpacity: isActive ? 0.08 : 0.03,
          shadowRadius: isActive ? 6 : 2,
          shadowOffset: { width: 0, height: isActive ? 3 : 1 },
          elevation: isActive ? 3 : 0,
        }}
      >
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onLongPress={drag}
            delayLongPress={120}
            className="h-11 w-11 items-center justify-center rounded-2xl bg-surface-container"
          >
            <Ionicons name={item.icon} size={20} color={Colors.primary} />
          </TouchableOpacity>

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-bold text-on-surface">{item.title}</Text>
              {!hasContent ? (
                <View className="rounded-full bg-surface-container px-2 py-1">
                  <Text className="text-[11px] font-semibold text-on-surface-variant">Empty</Text>
                </View>
              ) : hidden ? (
                <View className="rounded-full bg-surface-container px-2 py-1">
                  <Text className="text-[11px] font-semibold text-on-surface-variant">Hidden</Text>
                </View>
              ) : null}
            </View>
            <Text className="mt-1 text-sm text-on-surface-variant">
              {hasContent ? item.description : 'Add content in the Music tab to show this widget.'}
            </Text>
          </View>

          <Switch
            value={!hidden}
            onValueChange={() => toggleWidgetHidden(item.type)}
            trackColor={{ false: Colors.outlineVariant, true: `${Colors.primary}66` }}
            thumbColor={!hidden ? Colors.primary : '#f4f3f4'}
          />

          <TouchableOpacity
            onLongPress={drag}
            delayLongPress={120}
            className="ml-1 h-10 w-8 items-center justify-center"
          >
            <Ionicons
              name="reorder-three-outline"
              size={22}
              color={isActive ? Colors.primary : Colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>

      </View>
    )
  }, [form.hiddenWidgets, hasWidgetContent, toggleWidgetHidden])

  useEffect(() => {
    if (!isLoaded || hasInitializedRef.current) return
    hasInitializedRef.current = true
    handleOpen()
  }, [handleOpen, isLoaded])

  const profileStepIndex = PROFILE_STEPS.findIndex((item) => item.key === profileStep)
  const currentProfileStep = PROFILE_STEPS[profileStepIndex] ?? PROFILE_STEPS[0]
  const isFirstProfileStep = profileStepIndex <= 0
  const isLastProfileStep = profileStepIndex >= PROFILE_STEPS.length - 1

  const goToPrevProfileStep = () => {
    if (isFirstProfileStep) return
    setProfileStep(PROFILE_STEPS[profileStepIndex - 1].key)
  }

  const goToNextProfileStep = () => {
    if (isLastProfileStep) {
      setTab('appearance')
      return
    }
    setProfileStep(PROFILE_STEPS[profileStepIndex + 1].key)
  }

  const sectionCardStyle = {
    borderRadius: 20,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  }

  const renderSectionSurface = (children: React.ReactNode, style?: object) => {
    if (useGlass) {
      return <GlassView style={[sectionCardStyle, style]}>{children}</GlassView>
    }
    return (
      <BlurView tint="systemMaterial" intensity={100} style={[sectionCardStyle, style]}>
        {children}
      </BlurView>
    )
  }

  const formContent = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-surface"
      style={{ paddingTop: Platform.OS === 'ios' ? 0 : insets.top }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-outline-variant">
        <TouchableOpacity onPress={onClose}>
          <Text className="text-base font-semibold text-on-surface-variant">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-on-surface">Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving || !isLoaded}>
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text
              className="text-base font-bold"
              style={{ color: !isLoaded ? Colors.onSurfaceVariant : Colors.primary }}
            >
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Top-level tabs */}
      <View className="px-5 pt-3">
        {useGlass ? (
          <GlassView style={{ borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.outlineVariant }}>
            <View className="flex-row h-14 p-1.5 gap-1.5">
              {TABS.map((item) => {
                const active = tab === item.key
                return (
                  <View key={item.key} className="flex-1">
                    <TouchableOpacity
                      onPress={() => setTab(item.key)}
                      className="h-full w-full flex-row items-center justify-center gap-1.5 rounded-xl px-2"
                      style={{ backgroundColor: active ? `${Colors.primary}22` : 'transparent' }}
                    >
                      <Ionicons
                        name={item.icon}
                        size={16}
                        color={active ? Colors.primary : Colors.onSurfaceVariant}
                      />
                      <Text
                        className="text-xs font-semibold"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                        style={{ color: active ? Colors.primary : Colors.onSurfaceVariant }}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          </GlassView>
        ) : (
          <BlurView tint="systemMaterial" intensity={100} style={{ borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.outlineVariant }}>
            <View className="flex-row h-14 p-1.5 gap-1.5">
              {TABS.map((item) => {
                const active = tab === item.key
                return (
                  <View key={item.key} className="flex-1">
                    <TouchableOpacity
                      onPress={() => setTab(item.key)}
                      className="h-full w-full flex-row items-center justify-center gap-1.5 rounded-xl px-2"
                      style={{ backgroundColor: active ? `${Colors.primary}22` : 'transparent' }}
                    >
                      <Ionicons
                        name={item.icon}
                        size={16}
                        color={active ? Colors.primary : Colors.onSurfaceVariant}
                      />
                      <Text
                        className="text-xs font-semibold"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                        style={{ color: active ? Colors.primary : Colors.onSurfaceVariant }}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          </BlurView>
        )}
      </View>

      {/* Profile-only wizard progress */}
      {tab === 'profile' && (
        <View className="px-5 pt-3">
          {renderSectionSurface(
            <View className="px-4 py-3">
              <Text className="text-xs font-semibold text-on-surface-variant">
                Profile step {profileStepIndex + 1} of {PROFILE_STEPS.length}
              </Text>
              <Text className="text-base font-bold text-on-surface mt-1">{currentProfileStep.label}</Text>
              <Text className="text-xs text-on-surface-variant mt-0.5">{currentProfileStep.subtitle}</Text>
              <View className="flex-row gap-2 mt-3">
                {PROFILE_STEPS.map((item, index) => (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => setProfileStep(item.key)}
                    className="flex-1 h-2 rounded-full"
                    style={{
                      backgroundColor: index <= profileStepIndex ? Colors.primary : Colors.surfaceContainerHighest,
                    }}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Error banner */}
      {error && (
        <View className="mx-5 mt-3 p-3 bg-red-50 rounded-xl">
          <Text className="text-base text-primary font-medium">{error}</Text>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingTop: 28, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Basics ── */}
        {tab === 'profile' && profileStep === 'basics' && (
          <View className="gap-5">
            {renderSectionSurface(
              <View className="p-5 gap-5">
                <View className="items-center gap-3">
                  <TouchableOpacity
                    onPress={handleAvatarPress}
                    activeOpacity={0.8}
                    disabled={isUploadingAvatar}
                  >
                    <View
                      className="w-24 h-24 rounded-2xl overflow-hidden bg-surface-container-high"
                      style={{ borderWidth: 2, borderColor: Colors.outlineVariant }}
                    >
                      {avatarUrl ? (
                        <Image
                          source={{ uri: avatarUrl }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                      ) : (
                        <View className="w-full h-full items-center justify-center">
                          <Ionicons name="person" size={40} color={Colors.onSurfaceVariant} />
                        </View>
                      )}
                    </View>
                    <View
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: Colors.primary }}
                    >
                      {isUploadingAvatar ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="camera" size={16} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAvatarPress}
                    disabled={isUploadingAvatar}
                    className="rounded-full px-5 py-2"
                    style={{ backgroundColor: Colors.surfaceContainerHigh }}
                  >
                    {isUploadingAvatar ? (
                      <View className="flex-row items-center gap-2">
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text className="text-sm font-semibold text-on-surface">Uploading…</Text>
                      </View>
                    ) : (
                      <Text className="text-sm font-bold text-primary">Change Photo</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View className="gap-2">
                  <SectionLabel>Display Name</SectionLabel>
                  <TextInput
                    value={form.displayName ?? ''}
                    onChangeText={(v) => set('displayName', v)}
                    placeholder="Your display name"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    className="bg-surface-container rounded-xl px-4 py-3.5 text-base text-on-surface"
                    style={{ color: Colors.onSurface }}
                    maxLength={50}
                  />
                </View>

                <View className="gap-2">
                  <SectionLabel>Bio</SectionLabel>
                  <TextInput
                    value={form.bio ?? ''}
                    onChangeText={(v) => set('bio', v)}
                    placeholder="Tell people about yourself..."
                    placeholderTextColor={Colors.onSurfaceVariant}
                    className="bg-surface-container rounded-xl px-4 py-3.5 text-base text-on-surface"
                    style={{ color: Colors.onSurface }}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={300}
                  />
                  <Text className="text-sm text-on-surface-variant text-right">
                    {(form.bio ?? '').length}/300
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Profile Details ── */}
        {tab === 'profile' && profileStep === 'details' && (
          <View className="gap-5">
            {renderSectionSurface(
              <View className="p-5 gap-4">
                <View className="gap-2 z-50">
                  <SectionLabel>Country</SectionLabel>
                  <CountryPicker
                    value={form.country ?? ''}
                    onChange={(v) => set('country', v)}
                  />
                </View>

                <View className="gap-2 z-40">
                  <SectionLabel>Tags ({form.tags?.length || 0}/5)</SectionLabel>
                  <GenrePicker onSelect={toggleTag} />

                  {form.tags && form.tags.length > 0 && (
                    <View className="flex-row flex-wrap gap-2 mt-2">
                      {form.tags.map((tag) => (
                        <TouchableOpacity
                          key={tag}
                          onPress={() => toggleTag(tag)}
                          className="flex-row items-center gap-1 bg-primary/15 px-3 py-1.5 rounded-full"
                        >
                          <Text className="text-xs font-semibold text-primary">{tag}</Text>
                          <Ionicons name="close" size={12} color={Colors.primary} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View className="gap-2 mt-2">
                  <SectionLabel>Integrations</SectionLabel>
                  <MusicConnectButton
                    connected={form.musicConnected ?? false}
                    onConnect={() => setMusicConnected(true)}
                    onDisconnect={() => setMusicConnected(false)}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Appearance Tab ── */}
        {tab === 'appearance' && (
          <View className="gap-5">
            {renderSectionSurface(
              <View className="p-5 gap-8">
                <View className="gap-3">
                  <SectionLabel>Banner</SectionLabel>

                  <ColorPicker
                    label="Custom Banner Color"
                    value={form.bannerUrl?.startsWith('#') ? form.bannerUrl : ''}
                    presets={ACCENT_PRESETS}
                    onChange={(v) => set('bannerUrl', v || BANNER_PRESETS[0])}
                  />

                  <Text className="text-sm font-semibold text-on-surface-variant mt-2">
                    Or select a preset image:
                  </Text>
                  <View className="flex-row flex-wrap gap-3">
                    {BANNER_PRESETS.map((url, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => set('bannerUrl', url)}
                        style={{
                          width: 80,
                          height: 50,
                          borderRadius: 10,
                          borderWidth: form.bannerUrl === url ? 3 : 1.5,
                          borderColor:
                            form.bannerUrl === url ? Colors.primary : Colors.outlineVariant,
                          overflow: 'hidden',
                        }}
                      >
                        <Image
                          source={{ uri: url }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text className="text-sm font-semibold text-on-surface-variant mt-1">
                    Or enter an image URL:
                  </Text>
                  <TextInput
                    value={
                      form.bannerUrl?.startsWith('linear-gradient') ||
                      form.bannerUrl?.startsWith('radial-gradient')
                        ? ''
                        : form.bannerUrl ?? ''
                    }
                    onChangeText={(v) => set('bannerUrl', v)}
                    placeholder="https://example.com/banner.jpg"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    className="bg-surface-container rounded-xl px-4 py-3.5 text-base text-on-surface"
                    style={{ color: Colors.onSurface }}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>

                <ColorPicker
                  label="Accent Color"
                  value={form.accentColor ?? ''}
                  presets={ACCENT_PRESETS}
                  onChange={(v) => set('accentColor', v || undefined)}
                />

                <ColorPicker
                  label="Name Color"
                  value={form.nameColor ?? ''}
                  presets={NAME_COLOR_PRESETS}
                  onChange={(v) => set('nameColor', v || undefined)}
                />

                <View className="gap-4">
                  <SectionLabel>Widget Colors</SectionLabel>
                  <ColorPicker
                    label="Albums widget"
                    value={form.albumsContainerColor ?? ''}
                    presets={ACCENT_PRESETS}
                    onChange={(v) => set('albumsContainerColor', v || undefined)}
                  />
                  <ColorPicker
                    label="Songs widget"
                    value={form.songsContainerColor ?? ''}
                    presets={ACCENT_PRESETS}
                    onChange={(v) => set('songsContainerColor', v || undefined)}
                  />
                  <ColorPicker
                    label="Artists widget"
                    value={form.artistsContainerColor ?? ''}
                    presets={ACCENT_PRESETS}
                    onChange={(v) => set('artistsContainerColor', v || undefined)}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Music Tab ── */}
        {tab === 'music' && (
          <View className="gap-6">
            {/* Integrations */}
            {renderSectionSurface(
              <View className="gap-3 p-5">
                <SectionLabel>Integrations</SectionLabel>
                <MusicConnectButton
                  connected={form.musicConnected ?? false}
                  onConnect={() => setMusicConnected(true)}
                  onDisconnect={() => setMusicConnected(false)}
                />
                <Text className="text-xs text-on-surface-variant">
                  Connect Apple Music to sync your top albums, songs, and artists automatically.
                </Text>
              </View>
            )}

            {/* Top Albums */}
            {renderSectionSurface(
              <View className="gap-3 p-5">
                <SectionHeaderWithMusicSync
                  title="Top Albums"
                  synced={form.syncTopAlbumsWithMusic === true}
                  canSync={canUseNativeMusicSync && form.musicConnected === true}
                  onToggle={(value) => setMusicSync('syncTopAlbumsWithMusic', value)}
                />
                {(form.topAlbums ?? []).map((album, i) => (
                  <MusicItem
                    key={i}
                    title={album.title}
                    subtitle={album.artist}
                    imageUrl={album.coverUrl}
                    imageShape="square"
                    onRemove={() => removeAlbum(i)}
                  />
                ))}
                {!(form.syncTopAlbumsWithMusic && form.musicConnected) && (form.topAlbums ?? []).length < 3 && (
                  <MusicSearch
                    type="album"
                    placeholder="Search for an album..."
                    onSelect={(r) => addAlbum(r as AlbumSearchResult)}
                  />
                )}
                {form.syncTopAlbumsWithMusic && form.musicConnected && (
                  <Text className="text-xs text-on-surface-variant">
                    Synced from Apple Music. Toggle off to curate this section manually.
                  </Text>
                )}
                {!canUseNativeMusicSync && (
                  <Text className="text-xs text-on-surface-variant">
                    Auto-sync is currently iOS development-build only. Manual curation stays available.
                  </Text>
                )}
              </View>
            )}

            {/* Top Songs */}
            {renderSectionSurface(
              <View className="gap-3 p-5">
                <SectionHeaderWithMusicSync
                  title="Top Songs"
                  synced={form.syncTopSongsWithMusic === true}
                  canSync={canUseNativeMusicSync && form.musicConnected === true}
                  onToggle={(value) => setMusicSync('syncTopSongsWithMusic', value)}
                />
                {(form.topSongs ?? []).map((song, i) => (
                  <MusicItem
                    key={i}
                    index={i + 1}
                    title={song.title}
                    subtitle={song.artist}
                    imageUrl={song.coverUrl}
                    imageShape="square"
                    onRemove={() => removeSong(i)}
                  />
                ))}
                {!(form.syncTopSongsWithMusic && form.musicConnected) && (form.topSongs ?? []).length < 3 && (
                  <MusicSearch
                    type="track"
                    placeholder="Search for a song..."
                    onSelect={(r) => addSong(r as TrackSearchResult)}
                  />
                )}
                {form.syncTopSongsWithMusic && form.musicConnected && (
                  <Text className="text-xs text-on-surface-variant">
                    Synced from Apple Music. Toggle off to curate this section manually.
                  </Text>
                )}
                {!canUseNativeMusicSync && (
                  <Text className="text-xs text-on-surface-variant">
                    Auto-sync is currently iOS development-build only. Manual curation stays available.
                  </Text>
                )}
              </View>
            )}

            {/* Top Artists */}
            {renderSectionSurface(
              <View className="gap-3 p-5">
                <SectionHeaderWithMusicSync
                  title="Top Artists"
                  synced={form.syncTopArtistsWithMusic === true}
                  canSync={canUseNativeMusicSync && form.musicConnected === true}
                  onToggle={(value) => setMusicSync('syncTopArtistsWithMusic', value)}
                />
                {(form.topArtists ?? []).map((artist, i) => (
                  <MusicItem
                    key={i}
                    title={artist.name}
                    imageUrl={artist.imageUrl}
                    imageShape="circle"
                    onRemove={() => removeArtist(i)}
                  />
                ))}
                {!(form.syncTopArtistsWithMusic && form.musicConnected) && (form.topArtists ?? []).length < 3 && (
                  <MusicSearch
                    type="artist"
                    placeholder="Search for an artist..."
                    onSelect={(r) => addArtist(r as ArtistSearchResult)}
                  />
                )}
                {form.syncTopArtistsWithMusic && form.musicConnected && (
                  <Text className="text-xs text-on-surface-variant">
                    Synced from Apple Music. Toggle off to curate this section manually.
                  </Text>
                )}
                {!canUseNativeMusicSync && (
                  <Text className="text-xs text-on-surface-variant">
                    Auto-sync is currently iOS development-build only. Manual curation stays available.
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {tab === 'widgets' && (
          <View className="gap-5">
            {renderSectionSurface(
              <View className="p-5">
                <Text className="text-base font-bold text-on-surface">Arrange your profile widgets</Text>
                <Text className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Long-press and drag a row to reorder it. Use the switch to hide a widget without removing its content.
                </Text>
              </View>
            )}

            <DraggableFlatList
              data={normalizeWidgetOrder(form.widgetOrder).map(type =>
                WIDGET_ITEMS.find(item => item.type === type)!
              )}
              keyExtractor={(item) => item.type}
              onDragEnd={({ data }) => {
                set('widgetOrder', data.map(item => item.type))
              }}
              renderItem={renderWidgetListItem}
              scrollEnabled={false}
              activationDistance={8}
              containerStyle={{ flexGrow: 0 }}
            />
          </View>
        )}

        {/* Profile wizard controls */}
        {tab === 'profile' &&
          renderSectionSurface(
            <View className="mx-1 px-4 py-4 flex-row items-center gap-4">
              <TouchableOpacity
                onPress={goToPrevProfileStep}
                disabled={isFirstProfileStep}
                className="flex-1 rounded-xl py-3.5 items-center"
                style={{
                  backgroundColor: isFirstProfileStep ? Colors.surfaceContainerHigh : Colors.surfaceContainer,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: isFirstProfileStep ? Colors.onSurfaceVariant : Colors.onSurface }}
                >
                  Back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={goToNextProfileStep}
                className="flex-1 rounded-xl py-3.5 items-center"
                style={{ backgroundColor: Colors.primary }}
              >
                <Text className="text-sm font-semibold" style={{ color: Colors.onPrimary }}>
                  {isLastProfileStep ? 'Done' : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
      </ScrollView>
    </KeyboardAvoidingView>
  )

  if (Platform.OS === 'android') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Host, ModalBottomSheet, RNHostView } = require('@expo/ui/jetpack-compose')

    return (
      <Host matchContents>
        <ModalBottomSheet
          containerColor={Colors.surface}
          showDragHandle
          onDismissRequest={() => router.back()}
        >
          <RNHostView matchContents>
            {formContent}
          </RNHostView>
        </ModalBottomSheet>
      </Host>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.75, 0.95],
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'slide_from_bottom',
        }}
      />
      {useGlass ? (
        <GlassView style={{ flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
          {formContent}
        </GlassView>
      ) : (
        <BlurView
          tint="systemMaterial"
          intensity={100}
          style={{ flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}
        >
          {formContent}
        </BlurView>
      )}
    </>
  )
}

// ── Music item row ────────────────────────────────────────────────────────────

interface MusicItemProps {
  title: string
  subtitle?: string
  imageUrl?: string
  imageShape: 'square' | 'circle'
  index?: number
  onRemove: () => void
}

function MusicItem({ title, subtitle, imageUrl, imageShape, index, onRemove }: MusicItemProps) {
  return (
    <View className="flex-row items-center gap-3">
      {index !== undefined && (
        <Text className="text-sm font-bold w-5 text-center text-on-surface-variant shrink-0">
          {index}
        </Text>
      )}
      <View
        className="w-14 h-14 overflow-hidden bg-surface-container shrink-0"
        style={{ borderRadius: imageShape === 'circle' ? 28 : 10 }}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Ionicons name="musical-note" size={22} color={Colors.onSurfaceVariant} />
          </View>
        )}
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-base font-bold text-on-surface" numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text className="text-sm text-on-surface-variant" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={onRemove} className="p-1 shrink-0">
        <Ionicons name="close-circle" size={24} color={Colors.onSurfaceVariant} />
      </TouchableOpacity>
    </View>
  )
}
