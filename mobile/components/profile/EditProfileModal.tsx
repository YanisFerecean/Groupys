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
  Modal,
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
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1000&auto=format&fit=crop', // Basketball
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1000&auto=format&fit=crop', // Concert
  'https://images.unsplash.com/photo-1667833966178-f98135a582f8?q=80&w=1000&auto=format&fit=crop', // Abstract
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
  icon: keyof typeof Ionicons.glyphMap
}

const DEFAULT_WIDGET_ORDER: WidgetType[] = ['topAlbums', 'currentlyListening', 'topSongs', 'topArtists']
const WIDGET_ITEMS: WidgetListItem[] = [
  { type: 'topAlbums', title: 'Top Albums', icon: 'albums-outline' },
  { type: 'currentlyListening', title: 'Currently Listening', icon: 'headset-outline' },
  { type: 'topSongs', title: 'Top Songs', icon: 'musical-notes-outline' },
  { type: 'topArtists', title: 'Top Artists', icon: 'people-outline' },
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
              key={`${String((result as { id: number }).id)}-${i}`}
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

// ── Color row + shared editor sheet ─────────────────────────────────────────

interface ColorRowProps {
  label: string
  value: string
  onPress: () => void
}

function ColorRow({ label, value, onPress }: ColorRowProps) {
  const isValidHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center justify-between rounded-2xl px-4 py-3.5"
      style={{ backgroundColor: Colors.surfaceContainer }}
    >
      <View className="flex-row items-center gap-3">
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: isValidHex ? value : Colors.surfaceContainerHigh,
            borderWidth: 1,
            borderColor: Colors.outlineVariant,
          }}
        />
        <Text className="text-base font-medium text-on-surface">{label}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Text className="text-sm font-mono text-on-surface-variant uppercase">
          {isValidHex ? value : '—'}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.onSurfaceVariant} />
      </View>
    </TouchableOpacity>
  )
}

interface ColorEditorTarget {
  label: string
  value: string
  presets: string[]
  onChange: (v: string) => void
}

interface ColorEditorSheetProps {
  target: ColorEditorTarget | null
  onClose: () => void
}

function ColorEditorSheet({ target, onClose }: ColorEditorSheetProps) {
  const value = target?.value ?? ''
  const isValidHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)
  const wheelColor = isValidHex ? value : '#ffffff'

  return (
    <Modal
      visible={target !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <BlurView
          tint="dark"
          intensity={40}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View
          className="rounded-t-3xl px-5 pt-4 pb-8"
          style={{ backgroundColor: Colors.surface }}
        >
          {/* Grabber */}
          <View
            className="self-center mb-3 rounded-full"
            style={{ width: 36, height: 4, backgroundColor: Colors.outlineVariant }}
          />

          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity onPress={onClose} className="px-2 py-1">
              <Ionicons name="close" size={24} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
            <Text className="text-base font-semibold text-on-surface">{target?.label ?? ''}</Text>
            <TouchableOpacity
              onPress={() => target?.onChange('')}
              disabled={!isValidHex}
              className="px-2 py-1"
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: isValidHex ? Colors.primary : Colors.onSurfaceVariant }}
              >
                Reset
              </Text>
            </TouchableOpacity>
          </View>

          {/* Presets */}
          {target && target.presets.length > 0 && (
            <View className="flex-row flex-wrap gap-3 mb-4">
              {target.presets.map((preset) => {
                const selected = preset.toLowerCase() === value.toLowerCase()
                return (
                  <TouchableOpacity
                    key={preset}
                    onPress={() => target.onChange(preset)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: preset,
                      borderWidth: selected ? 3 : 1,
                      borderColor: selected ? Colors.primary : Colors.outlineVariant,
                    }}
                  />
                )
              })}
            </View>
          )}

          {/* Wheel */}
          <View style={{ height: 240 }}>
            {target && (
              <ColorWheel
                color={wheelColor}
                onColorChangeComplete={target.onChange}
                thumbSize={24}
                sliderSize={12}
                noSnap={true}
                row={false}
                swatches={false}
              />
            )}
          </View>

          {/* Hex */}
          <View className="flex-row items-center gap-3 mt-4">
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: isValidHex ? value : Colors.surfaceContainerHigh,
                borderWidth: 1,
                borderColor: Colors.outlineVariant,
              }}
            />
            <TextInput
              value={value}
              onChangeText={(v) => target?.onChange(v)}
              placeholder="#hex"
              placeholderTextColor={Colors.onSurfaceVariant}
              className="bg-surface-container rounded-xl px-4 py-3 text-base text-on-surface flex-1"
              style={{ color: Colors.onSurface }}
              autoCapitalize="none"
              maxLength={7}
            />
          </View>

          {/* Done */}
          <TouchableOpacity
            onPress={onClose}
            className="rounded-full py-3.5 mt-5 items-center"
            style={{ backgroundColor: Colors.primary }}
          >
            <Text className="text-base font-bold" style={{ color: Colors.onPrimary }}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-sm font-semibold text-on-surface mb-2">
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
    <View className="flex-row items-center justify-between mb-1.5">
      <Text className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
        {title}
      </Text>
      <View className="flex-row items-center gap-2">
        <MaterialCommunityIcons
          name="apple"
          size={16}
          color={canSync ? '#FA243C' : Colors.onSurfaceVariant}
        />
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

const PROFILE_STEPS: { key: ProfileStep; label: string }[] = [
  { key: 'basics', label: 'Basics' },
  { key: 'details', label: 'Details' },
]

function toProviderNeutralProfile(profile: ProfileCustomization): ProfileCustomization {
  return {
    ...profile,
    musicConnected: profile.musicConnected ?? false,
    syncTopSongsWithMusic: profile.syncTopSongsWithMusic ?? false,
    syncTopArtistsWithMusic: profile.syncTopArtistsWithMusic ?? false,
    syncTopAlbumsWithMusic: profile.syncTopAlbumsWithMusic ?? false,
  }
}

// ── Color edit keys ──────────────────────────────────────────────────────────

type ColorEditKey = 'banner' | 'accent' | 'name' | 'albums' | 'songs' | 'artists'

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
  const [editingColorKey, setEditingColorKey] = useState<ColorEditKey | null>(null)
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
    }))
  }

  const setMusicSync = (
    key: 'syncTopAlbumsWithMusic' | 'syncTopSongsWithMusic' | 'syncTopArtistsWithMusic',
    value: boolean,
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
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
      // iOS HEIC/iCloud assets fail to load via the raw representation; force transcoding.
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
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
              <Text className="text-base font-semibold text-on-surface">{item.title}</Text>
              {!hasContent ? (
                <View className="rounded-full bg-surface-container px-2 py-0.5">
                  <Text className="text-[11px] font-medium text-on-surface-variant">Empty</Text>
                </View>
              ) : hidden ? (
                <View className="rounded-full bg-surface-container px-2 py-0.5">
                  <Text className="text-[11px] font-medium text-on-surface-variant">Hidden</Text>
                </View>
              ) : null}
            </View>
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

  const renderSectionSurface = (children: React.ReactNode) => (
    <View>{children}</View>
  )

  const colorTargets: Record<ColorEditKey, ColorEditorTarget> = {
    banner: {
      label: 'Banner Color',
      presets: ACCENT_PRESETS,
      value: form.bannerUrl?.startsWith('#') ? form.bannerUrl : '',
      onChange: (v) => set('bannerUrl', v || BANNER_PRESETS[0]),
    },
    accent: {
      label: 'Accent Color',
      presets: ACCENT_PRESETS,
      value: form.accentColor ?? '',
      onChange: (v) => set('accentColor', v || undefined),
    },
    name: {
      label: 'Name Color',
      presets: NAME_COLOR_PRESETS,
      value: form.nameColor ?? '',
      onChange: (v) => set('nameColor', v || undefined),
    },
    albums: {
      label: 'Albums widget',
      presets: ACCENT_PRESETS,
      value: form.albumsContainerColor ?? '',
      onChange: (v) => set('albumsContainerColor', v || undefined),
    },
    songs: {
      label: 'Songs widget',
      presets: ACCENT_PRESETS,
      value: form.songsContainerColor ?? '',
      onChange: (v) => set('songsContainerColor', v || undefined),
    },
    artists: {
      label: 'Artists widget',
      presets: ACCENT_PRESETS,
      value: form.artistsContainerColor ?? '',
      onChange: (v) => set('artistsContainerColor', v || undefined),
    },
  }

  const editingColor = editingColorKey ? colorTargets[editingColorKey] : null

  const formContent = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-surface"
      style={{ paddingTop: Platform.OS === 'ios' ? 0 : insets.top }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity
          onPress={onClose}
          className="rounded-full px-4 py-2"
          style={{ backgroundColor: Colors.surfaceContainer }}
        >
          <Text className="text-sm font-semibold text-on-surface">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-on-surface">Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving || !isLoaded}
          className="rounded-full px-5 py-2"
          style={{
            backgroundColor: !isLoaded ? Colors.surfaceContainerHigh : Colors.primary,
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.onPrimary} />
          ) : (
            <Text
              className="text-sm font-bold"
              style={{ color: !isLoaded ? Colors.onSurfaceVariant : Colors.onPrimary }}
            >
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Top-level icon tabs */}
      <View className="px-4 pt-1 pb-2">
        <View className="flex-row justify-around items-center">
          {TABS.map((item) => {
            const active = tab === item.key
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setTab(item.key)}
                activeOpacity={0.7}
                className="items-center justify-center rounded-2xl"
                style={{
                  width: 56,
                  height: 44,
                  backgroundColor: active ? `${Colors.primary}1f` : 'transparent',
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={active ? Colors.primary : Colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Profile-only wizard segmented */}
      {tab === 'profile' && (
        <View className="px-5 pb-2 pt-1">
          <View
            className="flex-row rounded-full p-1.5 self-center"
            style={{ backgroundColor: Colors.surfaceContainer }}
          >
            {PROFILE_STEPS.map((item) => {
              const active = profileStep === item.key
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setProfileStep(item.key)}
                  className="px-8 py-2.5 rounded-full"
                  style={{ backgroundColor: active ? Colors.surface : 'transparent' }}
                >
                  <Text
                    className="text-base"
                    style={{
                      color: active ? Colors.onSurface : Colors.onSurfaceVariant,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}

      {/* Error banner */}
      {error && (
        <View className="mx-5 mt-2 px-3 py-2 rounded-lg" style={{ backgroundColor: `${Colors.primary}1a` }}>
          <Text className="text-sm text-primary">{error}</Text>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Basics ── */}
        {tab === 'profile' && profileStep === 'basics' && (
          <View className="gap-5">
            {renderSectionSurface(
              <View className="gap-5">
                <View className="items-center pt-2 pb-3">
                  <TouchableOpacity
                    onPress={handleAvatarPress}
                    activeOpacity={0.8}
                    disabled={isUploadingAvatar}
                  >
                    <View
                      className="w-32 h-32 rounded-3xl overflow-hidden bg-surface-container-high"
                    >
                      {avatarUrl ? (
                        <Image
                          source={{ uri: avatarUrl }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                      ) : (
                        <View className="w-full h-full items-center justify-center">
                          <Ionicons name="person" size={52} color={Colors.onSurfaceVariant} />
                        </View>
                      )}
                    </View>
                    <View
                      className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: Colors.primary, borderWidth: 3, borderColor: Colors.surface }}
                    >
                      {isUploadingAvatar ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="camera" size={18} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                </View>

                <View className="gap-2">
                  <SectionLabel>Display Name</SectionLabel>
                  <TextInput
                    value={form.displayName ?? ''}
                    onChangeText={(v) => set('displayName', v)}
                    placeholder="Your name"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    className="bg-surface-container rounded-2xl px-4 py-4 text-lg text-on-surface"
                    style={{ color: Colors.onSurface }}
                    maxLength={50}
                  />
                </View>

                <View className="gap-2">
                  <SectionLabel>Bio</SectionLabel>
                  <TextInput
                    value={form.bio ?? ''}
                    onChangeText={(v) => set('bio', v)}
                    placeholder="Add a bio"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    className="bg-surface-container rounded-2xl px-4 py-4 text-lg text-on-surface"
                    style={{ color: Colors.onSurface, minHeight: 120 }}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    maxLength={300}
                  />
                  {(form.bio ?? '').length > 250 && (
                    <Text className="text-xs text-on-surface-variant text-right">
                      {(form.bio ?? '').length}/300
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Profile Details ── */}
        {tab === 'profile' && profileStep === 'details' && (
          <View className="gap-5">
            {renderSectionSurface(
              <View className="gap-4">
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
              </View>
            )}
          </View>
        )}

        {/* ── Appearance Tab ── */}
        {tab === 'appearance' && (
          <View className="gap-5">
            {renderSectionSurface(
              <View className="gap-6">
                <View className="gap-3">
                  <SectionLabel>Banner</SectionLabel>

                  <ColorRow
                    label="Custom Banner Color"
                    value={colorTargets.banner.value}
                    onPress={() => setEditingColorKey('banner')}
                  />

                  <View className="flex-row flex-wrap justify-center gap-2.5">
                    {BANNER_PRESETS.map((url, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => set('bannerUrl', url)}
                        style={{
                          width: 104,
                          height: 64,
                          borderRadius: 14,
                          borderWidth: form.bannerUrl === url ? 3 : 0,
                          borderColor: Colors.primary,
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
                  <TextInput
                    value={
                      form.bannerUrl?.startsWith('linear-gradient') ||
                      form.bannerUrl?.startsWith('radial-gradient')
                        ? ''
                        : form.bannerUrl ?? ''
                    }
                    onChangeText={(v) => set('bannerUrl', v)}
                    placeholder="Image URL"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    className="bg-surface-container rounded-2xl px-4 py-4 text-base text-on-surface"
                    style={{ color: Colors.onSurface }}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>

                <ColorRow
                  label="Accent Color"
                  value={colorTargets.accent.value}
                  onPress={() => setEditingColorKey('accent')}
                />

                <ColorRow
                  label="Name Color"
                  value={colorTargets.name.value}
                  onPress={() => setEditingColorKey('name')}
                />

                <View className="gap-2">
                  <SectionLabel>Widget Colors</SectionLabel>
                  <ColorRow
                    label="Albums widget"
                    value={colorTargets.albums.value}
                    onPress={() => setEditingColorKey('albums')}
                  />
                  <ColorRow
                    label="Songs widget"
                    value={colorTargets.songs.value}
                    onPress={() => setEditingColorKey('songs')}
                  />
                  <ColorRow
                    label="Artists widget"
                    value={colorTargets.artists.value}
                    onPress={() => setEditingColorKey('artists')}
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
              <View className="gap-3">
                <SectionLabel>Integrations</SectionLabel>
                <MusicConnectButton
                  connected={form.musicConnected ?? false}
                  onConnect={() => setMusicConnected(true)}
                  onDisconnect={() => setMusicConnected(false)}
                />
              </View>
            )}

            {/* Top Albums */}
            {renderSectionSurface(
              <View className="gap-3">
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
                    placeholder="Search albums"
                    onSelect={(r) => addAlbum(r as AlbumSearchResult)}
                  />
                )}
                {form.syncTopAlbumsWithMusic && form.musicConnected && (
                  <Text className="text-xs text-on-surface-variant">
                    Synced from Apple Music.
                  </Text>
                )}
                {!canUseNativeMusicSync && (
                  <Text className="text-xs text-on-surface-variant">
                    Auto-sync requires iOS dev build.
                  </Text>
                )}
              </View>
            )}

            {/* Top Songs */}
            {renderSectionSurface(
              <View className="gap-3">
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
                    placeholder="Search songs"
                    onSelect={(r) => addSong(r as TrackSearchResult)}
                  />
                )}
                {form.syncTopSongsWithMusic && form.musicConnected && (
                  <Text className="text-xs text-on-surface-variant">
                    Synced from Apple Music.
                  </Text>
                )}
                {!canUseNativeMusicSync && (
                  <Text className="text-xs text-on-surface-variant">
                    Auto-sync requires iOS dev build.
                  </Text>
                )}
              </View>
            )}

            {/* Top Artists */}
            {renderSectionSurface(
              <View className="gap-3">
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
                    placeholder="Search artists"
                    onSelect={(r) => addArtist(r as ArtistSearchResult)}
                  />
                )}
                {form.syncTopArtistsWithMusic && form.musicConnected && (
                  <Text className="text-xs text-on-surface-variant">
                    Synced from Apple Music.
                  </Text>
                )}
                {!canUseNativeMusicSync && (
                  <Text className="text-xs text-on-surface-variant">
                    Auto-sync requires iOS dev build.
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {tab === 'widgets' && (
          <View className="gap-3">
            <Text className="text-xs text-on-surface-variant">
              Drag to reorder. Toggle to hide.
            </Text>

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

      </ScrollView>

      <ColorEditorSheet target={editingColor} onClose={() => setEditingColorKey(null)} />
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
