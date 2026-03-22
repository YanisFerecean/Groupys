import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
} from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import ColorWheel from 'react-native-wheel-color-picker'
import { useAuth } from '@clerk/expo'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import type { ProfileCustomization } from '@/models/ProfileCustomization'
import {
  searchTracks,
  searchArtists,
  searchAlbums,
} from '@/lib/musicSearch'
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

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-base font-extrabold text-on-surface mb-1">
      {children}
    </Text>
  )
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'appearance' | 'music'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'profile', label: 'Profile', icon: 'person-outline' },
  { key: 'appearance', label: 'Appearance', icon: 'color-palette-outline' },
  { key: 'music', label: 'Music', icon: 'musical-notes-outline' },
]

// ── Main component ───────────────────────────────────────────────────────────

interface EditProfileModalProps {
  visible: boolean
  onClose: () => void
  profile: ProfileCustomization
  isSaving: boolean
  onSave: (data: Partial<ProfileCustomization>) => Promise<void>
  onAvatarPress?: () => void
  isUploadingAvatar?: boolean
  avatarUrl?: string | null
}

export default function EditProfileModal({
  visible,
  onClose,
  profile,
  isSaving,
  onSave,
  onAvatarPress,
  isUploadingAvatar = false,
  avatarUrl,
}: EditProfileModalProps) {
  const insets = useSafeAreaInsets()
  const { getToken } = useAuth()
  const [tab, setTab] = useState<Tab>('profile')
  const [form, setForm] = useState<ProfileCustomization>({ ...profile })
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens
  const handleOpen = useCallback(() => {
    setForm({ ...profile })
    setError(null)

    // Auto-repair missing IDs for better navigation
    ;(async () => {
      try {
        const token = await getToken()
        const newForm = { ...profile }
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
              if (s.id) return s
              const results = await searchTracks(s.title, token, 5)
              const match = results.find(
                (r) =>
                  r.title.toLowerCase() === s.title.toLowerCase() &&
                  r.artist.toLowerCase() === s.artist.toLowerCase()
              )
              if (match) {
                changed = true
                return { ...s, id: match.id }
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

        // Repair Currently Listening
        if (newForm.currentlyListening && !newForm.currentlyListening.id) {
          const results = await searchTracks(newForm.currentlyListening.title, token, 5)
          const match = results.find(
            (r) =>
              r.title.toLowerCase() === newForm.currentlyListening!.title.toLowerCase() &&
              r.artist.toLowerCase() === newForm.currentlyListening!.artist.toLowerCase()
          )
          if (match) {
            changed = true
            newForm.currentlyListening = { ...newForm.currentlyListening, id: match.id }
          }
        }

        if (changed) {
          setForm(newForm)
        }
      } catch (err) {
        console.warn('Auto-repair IDs failed:', err)
      }
    })()
  }, [profile, getToken])

  const set = <K extends keyof ProfileCustomization>(key: K, value: ProfileCustomization[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setError(null)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.')
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
      songs.push({ id: r.id, title: r.title, artist: r.artist, coverUrl: r.coverUrl })
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

  const setListening = (r: TrackSearchResult) => {
    set('currentlyListening', { id: r.id, title: r.title, artist: r.artist, coverUrl: r.coverUrl })
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onShow={handleOpen}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-surface"
        style={{ paddingTop: insets.top }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-outline-variant">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-base font-semibold text-on-surface-variant">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-xl font-extrabold text-on-surface">Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text className="text-base font-bold text-primary">Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tab bar */}
        <View className="flex-row border-b border-outline-variant">
          {TABS.map(({ key, label, icon }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setTab(key)}
              className="flex-1 items-center py-3 gap-1"
              style={{
                borderBottomWidth: tab === key ? 2 : 0,
                borderBottomColor: Colors.primary,
              }}
            >
              <Ionicons
                name={icon as any}
                size={22}
                color={tab === key ? Colors.primary : Colors.onSurfaceVariant}
              />
              <Text
                className="text-sm font-bold"
                style={{ color: tab === key ? Colors.primary : Colors.onSurfaceVariant }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Error banner */}
        {error && (
          <View className="mx-5 mt-3 p-3 bg-red-50 rounded-xl">
            <Text className="text-base text-primary font-medium">{error}</Text>
          </View>
        )}

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Profile Tab ── */}
          {tab === 'profile' && (
            <View className="gap-6">
              {/* Avatar editor */}
              <View className="items-center gap-3 py-2">
                <TouchableOpacity
                  onPress={onAvatarPress}
                  activeOpacity={0.8}
                  disabled={!onAvatarPress || isUploadingAvatar}
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
                  {/* Camera badge */}
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
                  onPress={onAvatarPress}
                  disabled={!onAvatarPress || isUploadingAvatar}
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

              <View className="gap-2">
                <SectionLabel>Country</SectionLabel>
                <TextInput
                  value={form.country ?? ''}
                  onChangeText={(v) => set('country', v)}
                  placeholder="e.g. United States"
                  placeholderTextColor={Colors.onSurfaceVariant}
                  className="bg-surface-container rounded-xl px-4 py-3.5 text-base text-on-surface"
                  style={{ color: Colors.onSurface }}
                />
              </View>
            </View>
          )}

          {/* ── Appearance Tab ── */}
          {tab === 'appearance' && (
            <View className="gap-8">
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

          {/* ── Music Tab ── */}
          {tab === 'music' && (
            <View className="gap-6">
              {/* Top Albums */}
              <View className="gap-3 p-5 bg-surface-container-low rounded-2xl">
                <SectionLabel>Top Albums</SectionLabel>
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
                {(form.topAlbums ?? []).length < 3 && (
                  <MusicSearch
                    type="album"
                    placeholder="Search for an album..."
                    onSelect={(r) => addAlbum(r as AlbumSearchResult)}
                  />
                )}
              </View>

              {/* Currently Listening */}
              <View className="gap-3 p-5 bg-surface-container-low rounded-2xl">
                <SectionLabel>Currently Listening</SectionLabel>
                {form.currentlyListening?.title ? (
                  <MusicItem
                    title={form.currentlyListening.title}
                    subtitle={form.currentlyListening.artist}
                    imageUrl={form.currentlyListening.coverUrl}
                    imageShape="square"
                    onRemove={() => set('currentlyListening', undefined)}
                  />
                ) : (
                  <MusicSearch
                    type="track"
                    placeholder="Search for a track..."
                    onSelect={(r) => setListening(r as TrackSearchResult)}
                  />
                )}
              </View>

              {/* Top Songs */}
              <View className="gap-3 p-5 bg-surface-container-low rounded-2xl">
                <SectionLabel>Top Songs</SectionLabel>
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
                {(form.topSongs ?? []).length < 3 && (
                  <MusicSearch
                    type="track"
                    placeholder="Search for a song..."
                    onSelect={(r) => addSong(r as TrackSearchResult)}
                  />
                )}
              </View>

              {/* Top Artists */}
              <View className="gap-3 p-5 bg-surface-container-low rounded-2xl">
                <SectionLabel>Top Artists</SectionLabel>
                {(form.topArtists ?? []).map((artist, i) => (
                  <MusicItem
                    key={i}
                    title={artist.name}
                    imageUrl={artist.imageUrl}
                    imageShape="circle"
                    onRemove={() => removeArtist(i)}
                  />
                ))}
                {(form.topArtists ?? []).length < 3 && (
                  <MusicSearch
                    type="artist"
                    placeholder="Search for an artist..."
                    onSelect={(r) => addArtist(r as ArtistSearchResult)}
                  />
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
