import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { searchArtists } from '@/lib/musicSearch'
import { apiDelete, apiFetch, apiPut, uploadCommunityMedia } from '@/lib/api'
import { normalizeMediaUrl } from '@/lib/media'
import { Colors } from '@/constants/colors'
import type { ArtistRes } from '@/models/ArtistRes'
import type { ArtistSearchResult } from '@/models/ArtistSearchResult'
import type { CommunityResDto } from '@/models/CommunityRes'
import { CountryPicker } from '@/components/profile/CountryPicker'
import AuthImageWithToken from '../ui/AuthImageWithToken'

const TAG_SUGGESTIONS = [
  'fan club',
  'discussion',
  'covers',
  'live shows',
  'vinyl',
  'lyrics',
  'remixes',
  'setlists',
  'news',
  'throwbacks',
]

const INPUT_GLASS_TINT = 'rgba(255, 255, 255, 0.78)'
const INPUT_GLASS_BORDER = 'rgba(145, 110, 110, 0.24)'
const EMOJI_MATCH_REGEX = /(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*(?:\u{1F3FB}|\u{1F3FC}|\u{1F3FD}|\u{1F3FE}|\u{1F3FF})?|[\u{1F1E6}-\u{1F1FF}]{2}|[0-9#*]\uFE0F?\u20E3)/gu

type CommunityVisibility = 'PUBLIC' | 'PRIVATE'

interface Props {
  visible: boolean
  onClose: () => void
  onUpdated: (community: CommunityResDto) => void
  onDeleted: () => void
  community: CommunityResDto
}

function normalizeTag(value: string): string {
  return value.trim().toLowerCase()
}

function extractFirstEmoji(value: string): string {
  if (!value) return ''
  const match = value.match(EMOJI_MATCH_REGEX)
  return match?.[0] ?? ''
}

function GlassSurface({
  children,
  style,
  isInteractive = false,
  tinted = true,
}: {
  children: React.ReactNode
  style?: any
  isInteractive?: boolean
  tinted?: boolean
}) {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        isInteractive={isInteractive}
        style={[
          {
            borderRadius: 18,
            overflow: 'hidden',
            backgroundColor: tinted ? INPUT_GLASS_TINT : 'transparent',
            borderWidth: tinted ? 1 : 0,
            borderColor: tinted ? INPUT_GLASS_BORDER : 'transparent',
          },
          style,
        ]}
      >
        {children}
      </GlassView>
    )
  }

  return (
    <BlurView
      tint="systemMaterial"
      intensity={100}
      style={[
        {
          borderRadius: 18,
          overflow: 'hidden',
          backgroundColor: tinted ? INPUT_GLASS_TINT : 'transparent',
          borderWidth: tinted ? 1 : 0,
          borderColor: tinted ? INPUT_GLASS_BORDER : 'transparent',
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  )
}

export default function EditCommunityModal({
  visible,
  onClose,
  onUpdated,
  onDeleted,
  community,
}: Props) {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const artistSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('')
  const [country, setCountry] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [visibility, setVisibility] = useState<CommunityVisibility>('PUBLIC')
  const [tasteSummaryText, setTasteSummaryText] = useState('')

  const [bannerUri, setBannerUri] = useState<string | null>(null)
  const [iconType, setIconType] = useState<'IMAGE' | 'EMOJI'>('IMAGE')
  const [iconEmoji, setIconEmoji] = useState('')
  const [iconUri, setIconUri] = useState<string | null>(null)
  const [iconTabTrackWidth, setIconTabTrackWidth] = useState(0)
  const iconTabAnim = useRef(new Animated.Value(0)).current

  const [newBannerFile, setNewBannerFile] = useState<string | null>(null)
  const [newIconFile, setNewIconFile] = useState<string | null>(null)

  const [selectedArtist, setSelectedArtist] = useState<ArtistSearchResult | null>(null)
  const [artistQuery, setArtistQuery] = useState('')
  const [artistResults, setArtistResults] = useState<ArtistSearchResult[]>([])
  const [artistLoading, setArtistLoading] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  useEffect(() => {
    Animated.timing(iconTabAnim, {
      toValue: iconType === 'EMOJI' ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start()
  }, [iconTabAnim, iconType])

  useEffect(() => {
    if (!visible) return

    let cancelled = false

    setName(community.name || '')
    setDescription(community.description || '')
    setGenre(community.genre || '')
    setCountry(community.country || '')
    setTags(community.tags || [])
    setTagInput('')
    setVisibility(community.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC')
    setTasteSummaryText(community.tasteSummaryText || '')
    setBannerUri(normalizeMediaUrl(community.bannerUrl))
    setIconType(community.iconType === 'EMOJI' ? 'EMOJI' : 'IMAGE')
    setIconEmoji(community.iconEmoji || '')
    setIconUri(normalizeMediaUrl(community.iconUrl))
    setNewBannerFile(null)
    setNewIconFile(null)
    setSelectedArtist(null)
    setArtistQuery('')
    setArtistResults([])

    const loadArtist = async () => {
      if (!community.artistId) return
      try {
        const token = await getTokenRef.current()
        if (!token) return
        const artist = await apiFetch<ArtistRes>(`/artists/${community.artistId}`, token)
        if (!cancelled) {
          setSelectedArtist({
            id: artist.id,
            name: artist.name,
            imageUrl: artist.images?.[0],
          })
        }
      } catch (err) {
        console.error('Load community artist error:', err)
        if (!cancelled) {
          setSelectedArtist({
            id: community.artistId,
            name: `Artist #${community.artistId}`,
          })
        }
      }
    }

    loadArtist()

    return () => {
      cancelled = true
      if (artistSearchDebounceRef.current) {
        clearTimeout(artistSearchDebounceRef.current)
      }
    }
  }, [community, visible])

  const addTag = (raw: string) => {
    const nextTag = normalizeTag(raw)
    if (!nextTag || tags.includes(nextTag) || tags.length >= 5) return
    setTags((prev) => [...prev, nextTag])
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((item) => item !== tag))
  }

  const toggleSuggestion = (tag: string) => {
    if (tags.includes(tag)) {
      removeTag(tag)
      return
    }
    addTag(tag)
  }

  const pickImage = async (isBanner: boolean) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: isBanner ? [16, 9] : [1, 1],
    })

    if (!result.canceled && result.assets[0]?.uri) {
      if (isBanner) {
        setNewBannerFile(result.assets[0].uri)
        setBannerUri(result.assets[0].uri)
      } else {
        setNewIconFile(result.assets[0].uri)
        setIconUri(result.assets[0].uri)
      }
    }
  }

  const removeImageIcon = () => {
    setIconUri(null)
    setNewIconFile(null)
  }

  const handleArtistQueryChange = (text: string) => {
    setArtistQuery(text)

    if (artistSearchDebounceRef.current) {
      clearTimeout(artistSearchDebounceRef.current)
    }

    if (text.trim().length < 2) {
      setArtistResults([])
      setArtistLoading(false)
      return
    }

    artistSearchDebounceRef.current = setTimeout(async () => {
      setArtistLoading(true)
      try {
        const token = await getToken()
        if (!token) return
        const results = await searchArtists(text, token, 5)
        setArtistResults(results)
      } catch (err) {
        console.error('Artist search error:', err)
        setArtistResults([])
      } finally {
        setArtistLoading(false)
      }
    }, 350)
  }

  const handleUpdate = async () => {
    if (submitting || deleting || name.trim().length < 2) return
    setSubmitting(true)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const token = await getToken()
      if (!token) return

      let finalBannerUrl: string | null = community.bannerUrl ?? null
      let finalIconUrl: string | null = community.iconUrl ?? null

      if (bannerUri === null) {
        finalBannerUrl = null
      } else if (newBannerFile) {
        finalBannerUrl = await uploadCommunityMedia(token, newBannerFile, 'image')
      }

      if (iconType === 'IMAGE') {
        if (iconUri === null) {
          finalIconUrl = null
        } else if (newIconFile) {
          finalIconUrl = await uploadCommunityMedia(token, newIconFile, 'image')
        }
      } else {
        finalIconUrl = null
      }

      const updated = await apiPut<CommunityResDto>(`/communities/${community.id}`, token, {
        name: name.trim(),
        description: description.trim() || null,
        genre: genre.trim() || null,
        country: country.trim() || null,
        countryCode: null,
        imageUrl: community.imageUrl ?? null,
        bannerUrl: finalBannerUrl,
        iconType,
        iconEmoji: iconType === 'EMOJI' ? iconEmoji.trim() || null : null,
        iconUrl: iconType === 'IMAGE' ? finalIconUrl : null,
        tags,
        artistId: selectedArtist?.id ?? null,
        visibility,
        discoveryEnabled: community.discoveryEnabled ?? true,
        tasteSummaryText: tasteSummaryText.trim() || null,
      })

      onUpdated(updated)
      onClose()
    } catch (err) {
      console.error('Update community error:', err)
      Alert.alert('Error', 'Failed to save community settings.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = () => {
    if (submitting || deleting) return

    Alert.alert(
      'Delete Community',
      'Are you sure you want to delete this community? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              const token = await getToken()
              if (!token) return
              await apiDelete(`/communities/${community.id}`, token)
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              onClose()
              onDeleted()
            } catch (err) {
              console.error('Delete community error:', err)
              Alert.alert('Error', 'Failed to delete community.')
            } finally {
              setDeleting(false)
            }
          },
        },
      ],
    )
  }

  const canSave = name.trim().length >= 2 && !submitting && !deleting
  const useGlassSheet = isLiquidGlassAvailable()

  const content = (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <GlassSurface tinted={false} style={{ marginHorizontal: 16, marginTop: 8 }}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity onPress={onClose} disabled={submitting || deleting}>
            <Text className="text-on-surface-variant text-base">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-on-surface font-bold text-base">Community Settings</Text>
          <TouchableOpacity onPress={handleUpdate} disabled={!canSave}>
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text
                className={`text-base font-bold ${
                  canSave ? 'text-primary' : 'text-on-surface-variant'
                }`}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </GlassSurface>

      <ScrollView
        className="flex-1"
        style={{ marginTop: 10 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 34, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <GlassSurface isInteractive>
          <TouchableOpacity onPress={() => pickImage(true)} activeOpacity={0.8}>
            <View className="p-4">
              <Text className="text-on-surface text-sm font-semibold mb-3">Banner Image</Text>
              <View className="h-40 rounded-2xl overflow-hidden bg-black/20 items-center justify-center">
                {bannerUri ? (
                  <>
                    {newBannerFile ? (
                      <Image
                        source={{ uri: bannerUri }}
                        className="w-full h-full absolute"
                        resizeMode="cover"
                      />
                    ) : (
                      <AuthImageWithToken
                        uri={bannerUri}
                        style={{ position: 'absolute', width: '100%', height: '100%' }}
                      />
                    )}
                    <View className="absolute inset-0 bg-black/30 items-center justify-center">
                      <Ionicons name="camera" size={26} color="#fff" />
                    </View>
                  </>
                ) : (
                  <Ionicons name="image-outline" size={30} color={Colors.onSurfaceVariant} />
                )}
              </View>
            </View>
          </TouchableOpacity>
        </GlassSurface>

        <GlassSurface>
          <View className="p-4">
            <Text className="text-on-surface text-sm font-semibold mb-3">Community Icon</Text>

            <GlassSurface style={{ marginBottom: 12 }}>
              <View
                className="relative"
                style={{ padding: 2 }}
                onLayout={(event) => {
                  const nextWidth = event.nativeEvent.layout.width
                  if (nextWidth !== iconTabTrackWidth) setIconTabTrackWidth(nextWidth)
                }}
              >
                {iconTabTrackWidth > 0 ? (
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 2,
                      bottom: 2,
                      left: 2,
                      width: (iconTabTrackWidth - 4) / 2,
                      borderRadius: 14,
                      backgroundColor: 'rgba(186, 0, 43, 0.2)',
                      transform: [
                        {
                          translateX: iconTabAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, (iconTabTrackWidth - 4) / 2],
                          }),
                        },
                      ],
                    }}
                  />
                ) : null}

                <View className="flex-row">
                  <TouchableOpacity
                    onPress={() => setIconType('IMAGE')}
                    activeOpacity={0.85}
                    style={{ flex: 1 }}
                  >
                    <View className="py-2.5 items-center">
                      <Text
                        className={`font-semibold ${
                          iconType === 'IMAGE' ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                      >
                        Image
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setIconType('EMOJI')}
                    activeOpacity={0.85}
                    style={{ flex: 1 }}
                  >
                    <View className="py-2.5 items-center">
                      <Text
                        className={`font-semibold ${
                          iconType === 'EMOJI' ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                      >
                        Emoji
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </GlassSurface>

            {iconType === 'IMAGE' ? (
              <>
                <GlassSurface isInteractive style={{ alignSelf: 'center' }}>
                  <TouchableOpacity onPress={() => pickImage(false)} activeOpacity={0.8}>
                    <View className="w-24 h-24 rounded-full overflow-hidden bg-black/20 items-center justify-center">
                      {iconUri ? (
                        <>
                          {newIconFile ? (
                            <Image
                              source={{ uri: iconUri }}
                              className="w-full h-full absolute"
                              resizeMode="cover"
                            />
                          ) : (
                            <AuthImageWithToken
                              uri={iconUri}
                              style={{ position: 'absolute', width: '100%', height: '100%' }}
                            />
                          )}
                          <View className="absolute inset-0 bg-black/30 items-center justify-center">
                            <Ionicons name="camera" size={20} color="#fff" />
                          </View>
                        </>
                      ) : (
                        <Ionicons name="image-outline" size={24} color={Colors.onSurfaceVariant} />
                      )}
                    </View>
                  </TouchableOpacity>
                </GlassSurface>

                {iconUri ? (
                  <GlassSurface isInteractive style={{ alignSelf: 'center', marginTop: 10 }}>
                    <TouchableOpacity onPress={removeImageIcon} activeOpacity={0.8}>
                      <View className="px-3 py-1.5">
                        <Text className="text-primary text-sm font-semibold">Remove icon image</Text>
                      </View>
                    </TouchableOpacity>
                  </GlassSurface>
                ) : null}
              </>
            ) : (
              <GlassSurface style={{ alignSelf: 'center' }}>
                <View className="w-24 h-24 rounded-full items-center justify-center">
                  <TextInput
                    className="text-5xl text-center"
                    placeholder="🙂"
                    value={iconEmoji}
                    onChangeText={(value) => setIconEmoji(extractFirstEmoji(value))}
                    autoCorrect={false}
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </View>
              </GlassSurface>
            )}
          </View>
        </GlassSurface>

        <GlassSurface>
          <View className="px-4 py-3">
            <Text className="text-on-surface text-sm font-semibold mb-2">Community Name</Text>
            <TextInput
              className="text-on-surface text-base py-1"
              placeholder="Community name"
              placeholderTextColor={Colors.onSurfaceVariant}
              value={name}
              onChangeText={(value) => setName(value.slice(0, 60))}
              maxLength={60}
            />
            <Text className="text-xs text-on-surface-variant mt-1">{name.length}/60</Text>
          </View>
        </GlassSurface>

        <GlassSurface>
          <View className="px-4 py-3">
            <Text className="text-on-surface text-sm font-semibold mb-2">Description</Text>
            <TextInput
              className="text-on-surface text-base"
              placeholder="What is this community about?"
              placeholderTextColor={Colors.onSurfaceVariant}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>
        </GlassSurface>

        <GlassSurface>
          <View className="px-4 py-3">
            <Text className="text-on-surface text-sm font-semibold mb-2">Genre / Topic</Text>
            <TextInput
              className="text-on-surface text-base py-1"
              placeholder="e.g. Indie Pop, Synthwave"
              placeholderTextColor={Colors.onSurfaceVariant}
              value={genre}
              onChangeText={(value) => setGenre(value.slice(0, 50))}
              maxLength={50}
            />
          </View>
        </GlassSurface>

        <GlassSurface>
          <View className="px-4 py-3">
            <Text className="text-on-surface text-sm font-semibold mb-2">Country</Text>
            <CountryPicker value={country} onChange={setCountry} />
          </View>
        </GlassSurface>

        <GlassSurface>
          <View className="p-4">
            <Text className="text-on-surface text-sm font-semibold mb-2">Tags ({tags.length}/5)</Text>

            <GlassSurface style={{ marginBottom: 10 }}>
              <View className="flex-row items-center px-3 py-2 gap-2">
                <TextInput
                  className="flex-1 text-on-surface text-sm"
                  placeholder="Add a custom tag..."
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={() => addTag(tagInput)}
                  returnKeyType="done"
                  editable={tags.length < 5}
                  maxLength={30}
                />
                <GlassSurface isInteractive>
                  <TouchableOpacity
                    onPress={() => addTag(tagInput)}
                    disabled={!tagInput.trim() || tags.length >= 5}
                    activeOpacity={0.8}
                  >
                    <View className="px-3 py-1.5">
                      <Text
                        className={`${
                          tagInput.trim() && tags.length < 5 ? 'text-primary' : 'text-on-surface-variant'
                        } text-sm font-semibold`}
                      >
                        Add
                      </Text>
                    </View>
                  </TouchableOpacity>
                </GlassSurface>
              </View>
            </GlassSurface>

            {tags.length > 0 ? (
              <View className="flex-row flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <GlassSurface key={tag} isInteractive>
                    <TouchableOpacity onPress={() => removeTag(tag)} activeOpacity={0.8}>
                      <View className="flex-row items-center gap-1 px-3 py-1.5">
                        <Text className="text-primary text-xs font-semibold">#{tag}</Text>
                        <Ionicons name="close" size={12} color={Colors.primary} />
                      </View>
                    </TouchableOpacity>
                  </GlassSurface>
                ))}
              </View>
            ) : null}

            <Text className="text-xs text-on-surface-variant mb-2">Suggestions</Text>
            <View className="flex-row flex-wrap gap-2">
              {TAG_SUGGESTIONS.map((tag) => {
                const active = tags.includes(tag)
                return (
                  <GlassSurface key={tag} isInteractive>
                    <TouchableOpacity
                      onPress={() => toggleSuggestion(tag)}
                      disabled={!active && tags.length >= 5}
                      activeOpacity={0.8}
                    >
                      <View
                        className="px-3 py-1.5"
                        style={{ backgroundColor: active ? 'rgba(186, 0, 43, 0.2)' : 'transparent' }}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            active ? 'text-primary' : 'text-on-surface-variant'
                          }`}
                        >
                          {tag}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </GlassSurface>
                )
              })}
            </View>
          </View>
        </GlassSurface>

        <GlassSurface>
          <View className="p-4">
            <Text className="text-on-surface text-sm font-semibold mb-3">Associated Artist</Text>

            {selectedArtist ? (
              <GlassSurface style={{ marginBottom: 10 }}>
                <View className="flex-row items-center gap-3 px-3 py-3">
                  <View className="w-12 h-12 rounded-full overflow-hidden bg-black/15">
                    {selectedArtist.imageUrl ? (
                      <Image
                        source={{ uri: selectedArtist.imageUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : null}
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-on-surface" numberOfLines={1}>
                      {selectedArtist.name}
                    </Text>
                    <Text className="text-xs text-on-surface-variant">Artist ID {selectedArtist.id}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedArtist(null)}>
                    <Ionicons name="close-circle" size={22} color={Colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
              </GlassSurface>
            ) : null}

            <GlassSurface style={{ marginBottom: artistResults.length > 0 ? 10 : 0 }}>
              <View className="flex-row items-center px-3 py-2 gap-2">
                {artistLoading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="search" size={18} color={Colors.onSurfaceVariant} />
                )}
                <TextInput
                  className="flex-1 text-on-surface text-base"
                  placeholder="Search for an artist..."
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={artistQuery}
                  onChangeText={handleArtistQueryChange}
                />
                {artistQuery.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => {
                      setArtistQuery('')
                      setArtistResults([])
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color={Colors.onSurfaceVariant} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </GlassSurface>

            {artistResults.length > 0 ? (
              <GlassSurface style={{ overflow: 'hidden' }}>
                <View>
                  {artistResults.map((artist, index) => (
                    <TouchableOpacity
                      key={artist.id}
                      onPress={() => {
                        setSelectedArtist(artist)
                        setArtistQuery('')
                        setArtistResults([])
                      }}
                      className="flex-row items-center gap-3 px-3 py-3"
                      style={{
                        borderTopWidth: index > 0 ? 1 : 0,
                        borderTopColor: INPUT_GLASS_BORDER,
                      }}
                    >
                      <View className="w-10 h-10 rounded-full overflow-hidden bg-black/15">
                        {artist.imageUrl ? (
                          <Image
                            source={{ uri: artist.imageUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : null}
                      </View>
                      <Text className="flex-1 text-base font-semibold text-on-surface" numberOfLines={1}>
                        {artist.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </GlassSurface>
            ) : null}
          </View>
        </GlassSurface>

        <GlassSurface>
          <View className="p-4">
            <Text className="text-on-surface text-sm font-semibold mb-3">Visibility</Text>
            <View className="gap-2">
              {([
                {
                  value: 'PUBLIC' as const,
                  label: 'Public',
                  subtitle: 'Anyone can discover and join this community.',
                  icon: 'globe-outline',
                },
                {
                  value: 'PRIVATE' as const,
                  label: 'Private',
                  subtitle: 'Only invited members can access this community.',
                  icon: 'lock-closed-outline',
                },
              ]).map((option) => {
                const active = visibility === option.value
                return (
                  <GlassSurface key={option.value} isInteractive>
                    <TouchableOpacity onPress={() => setVisibility(option.value)} activeOpacity={0.8}>
                      <View
                        className="flex-row items-center justify-between px-3 py-3"
                        style={{ backgroundColor: active ? 'rgba(186, 0, 43, 0.2)' : 'transparent' }}
                      >
                        <View className="flex-row items-center gap-2 flex-1">
                          <Ionicons
                            name={option.icon as any}
                            size={18}
                            color={active ? Colors.primary : Colors.onSurfaceVariant}
                          />
                          <View className="flex-1">
                            <Text className={`${active ? 'text-primary' : 'text-on-surface'} font-semibold`}>
                              {option.label}
                            </Text>
                            <Text className="text-on-surface-variant text-xs mt-0.5">
                              {option.subtitle}
                            </Text>
                          </View>
                        </View>
                        {active ? <Ionicons name="checkmark-circle" size={18} color={Colors.primary} /> : null}
                      </View>
                    </TouchableOpacity>
                  </GlassSurface>
                )
              })}
            </View>
          </View>
        </GlassSurface>

        <GlassSurface>
          <View className="px-4 py-3">
            <Text className="text-on-surface text-sm font-semibold mb-2">Taste Summary</Text>
            <TextInput
              className="text-on-surface text-base"
              placeholder="Add a short summary of the community's taste."
              placeholderTextColor={Colors.onSurfaceVariant}
              value={tasteSummaryText}
              onChangeText={setTasteSummaryText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </GlassSurface>

        <GlassSurface>
          <View className="p-4">
            <Text className="text-on-surface text-sm font-semibold mb-2">Danger Zone</Text>
            <Text className="text-on-surface-variant text-sm mb-3">
              Deleting a community removes it permanently for all members.
            </Text>
            <GlassSurface
              isInteractive
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.24)',
              }}
            >
              <TouchableOpacity
                onPress={handleDelete}
                disabled={submitting || deleting}
                activeOpacity={0.8}
              >
                <View className="py-3 items-center">
                  {deleting ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <Text className="text-red-500 font-bold">Delete Community</Text>
                  )}
                </View>
              </TouchableOpacity>
            </GlassSurface>
          </View>
        </GlassSurface>
      </ScrollView>
    </KeyboardAvoidingView>
  )

  const sheetStyle = {
    height: '92%' as const,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden' as const,
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/30">
        {useGlassSheet ? (
          <GlassView style={sheetStyle}>
            <View className="items-center pt-3 pb-1">
              <View
                style={{
                  width: 44,
                  height: 5,
                  borderRadius: 999,
                  backgroundColor: 'rgba(255, 255, 255, 0.88)',
                }}
              />
            </View>
            {content}
          </GlassView>
        ) : (
          <BlurView tint="systemMaterial" intensity={100} style={sheetStyle}>
            <View className="items-center pt-3 pb-1">
              <View
                style={{
                  width: 44,
                  height: 5,
                  borderRadius: 999,
                  backgroundColor: 'rgba(255, 255, 255, 0.88)',
                }}
              />
            </View>
            {content}
          </BlurView>
        )}
      </View>
    </Modal>
  )
}
