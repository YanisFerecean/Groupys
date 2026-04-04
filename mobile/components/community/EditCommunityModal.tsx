import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
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
  const [discoveryEnabled, setDiscoveryEnabled] = useState(true)
  const [tasteSummaryText, setTasteSummaryText] = useState('')

  const [bannerUri, setBannerUri] = useState<string | null>(null)
  const [iconType, setIconType] = useState<'IMAGE' | 'EMOJI'>('IMAGE')
  const [iconEmoji, setIconEmoji] = useState('🌟')
  const [iconUri, setIconUri] = useState<string | null>(null)

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
    if (!visible) return

    let cancelled = false

    setName(community.name || '')
    setDescription(community.description || '')
    setGenre(community.genre || '')
    setCountry(community.country || '')
    setTags(community.tags || [])
    setTagInput('')
    setVisibility(community.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC')
    setDiscoveryEnabled(community.discoveryEnabled ?? true)
    setTasteSummaryText(community.tasteSummaryText || '')
    setBannerUri(normalizeMediaUrl(community.bannerUrl))
    setIconType(community.iconType === 'EMOJI' ? 'EMOJI' : 'IMAGE')
    setIconEmoji(community.iconEmoji || '🌟')
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

  const removeBanner = () => {
    setBannerUri(null)
    setNewBannerFile(null)
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
        discoveryEnabled,
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 bg-surface"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-surface-container-high">
          <TouchableOpacity onPress={onClose} disabled={submitting || deleting}>
            <Text className="text-on-surface-variant text-base">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-on-surface font-bold text-base">Community Settings</Text>
          <TouchableOpacity onPress={handleUpdate} disabled={!canSave}>
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text
                className={`font-bold text-base ${
                  canSave ? 'text-primary' : 'text-on-surface-variant'
                }`}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-6" keyboardShouldPersistTaps="handled">
          <Text className="text-on-surface font-semibold text-sm mb-2">Banner Image</Text>
          <TouchableOpacity
            onPress={() => pickImage(true)}
            className="w-full h-32 bg-surface-container-high rounded-xl items-center justify-center mb-2 overflow-hidden relative"
          >
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
                  <Ionicons name="camera" size={24} color="#fff" />
                </View>
              </>
            ) : (
              <Ionicons name="image-outline" size={32} color={Colors.onSurfaceVariant} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={removeBanner} className="self-start mb-6">
            <Text className="text-sm font-semibold text-primary">Remove banner</Text>
          </TouchableOpacity>

          <Text className="text-on-surface font-semibold text-sm mb-2">Community Icon</Text>
          <View className="flex-row items-center gap-4 mb-3">
            <TouchableOpacity
              onPress={() => setIconType('IMAGE')}
              className={`flex-1 py-2 rounded-lg items-center ${
                iconType === 'IMAGE' ? 'bg-primary' : 'bg-surface-container-high'
              }`}
            >
              <Text
                className={`font-bold ${
                  iconType === 'IMAGE' ? 'text-on-primary' : 'text-on-surface-variant'
                }`}
              >
                Image
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIconType('EMOJI')}
              className={`flex-1 py-2 rounded-lg items-center ${
                iconType === 'EMOJI' ? 'bg-primary' : 'bg-surface-container-high'
              }`}
            >
              <Text
                className={`font-bold ${
                  iconType === 'EMOJI' ? 'text-on-primary' : 'text-on-surface-variant'
                }`}
              >
                Emoji
              </Text>
            </TouchableOpacity>
          </View>

          {iconType === 'IMAGE' ? (
            <>
              <TouchableOpacity
                onPress={() => pickImage(false)}
                className="w-20 h-20 rounded-full bg-surface-container-high items-center justify-center mb-2 self-start relative overflow-hidden"
              >
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
              </TouchableOpacity>
              <TouchableOpacity onPress={removeImageIcon} className="self-start mb-6">
                <Text className="text-sm font-semibold text-primary">Remove icon image</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TextInput
              className="w-20 h-20 bg-surface-container-low rounded-full text-4xl text-center mb-6 items-center justify-center pb-2"
              placeholder="🌟"
              value={iconEmoji}
              onChangeText={(value) => setIconEmoji(value)}
              maxLength={2}
            />
          )}

          <Text className="text-on-surface font-semibold text-sm mb-2">Community Name</Text>
          <TextInput
            className="bg-surface-container-low rounded-xl px-4 py-3 text-base text-on-surface mb-1"
            placeholder="Community name"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={name}
            onChangeText={(value) => setName(value.slice(0, 60))}
            maxLength={60}
          />
          <Text className="text-xs text-on-surface-variant mb-4">{name.length}/60</Text>

          <Text className="text-on-surface font-semibold text-sm mb-2">Description</Text>
          <TextInput
            className="bg-surface-container-low rounded-xl px-4 py-3 text-base text-on-surface mb-4"
            placeholder="What is this community about?"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />

          <Text className="text-on-surface font-semibold text-sm mb-2">Genre / Topic</Text>
          <TextInput
            className="bg-surface-container-low rounded-xl px-4 py-3 text-base text-on-surface mb-4"
            placeholder="e.g. Indie Pop, Synthwave"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={genre}
            onChangeText={(value) => setGenre(value.slice(0, 50))}
            maxLength={50}
          />

          <Text className="text-on-surface font-semibold text-sm mb-2">Country</Text>
          <View className="mb-4">
            <CountryPicker value={country} onChange={setCountry} />
          </View>

          <Text className="text-on-surface font-semibold text-sm mb-2">
            Tags ({tags.length}/5)
          </Text>
          <View className="bg-surface-container-low rounded-xl px-4 py-2 mb-3">
            <TextInput
              className="text-base text-on-surface py-2"
              placeholder="Add a tag and press enter"
              placeholderTextColor={Colors.onSurfaceVariant}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={() => addTag(tagInput)}
              returnKeyType="done"
              editable={tags.length < 5}
            />
          </View>

          <View className="flex-row flex-wrap gap-2 mb-3">
            {tags.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => removeTag(tag)}
                className="flex-row items-center gap-1 bg-primary/10 px-3 py-2 rounded-full"
              >
                <Text className="text-primary font-semibold text-xs">{tag}</Text>
                <Ionicons name="close" size={12} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </View>

          <View className="flex-row flex-wrap gap-2 mb-6">
            {TAG_SUGGESTIONS.map((tag) => {
              const active = tags.includes(tag)
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleSuggestion(tag)}
                  className={`px-3 py-2 rounded-full ${
                    active ? 'bg-primary' : 'bg-surface-container-high'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      active ? 'text-on-primary' : 'text-on-surface-variant'
                    }`}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text className="text-on-surface font-semibold text-sm mb-2">Associated Artist</Text>
          {selectedArtist ? (
            <View className="flex-row items-center gap-3 bg-surface-container-low rounded-2xl px-4 py-3 mb-3">
              <View className="w-12 h-12 rounded-full overflow-hidden bg-surface-container-high">
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
          ) : null}

          <View className="bg-surface-container-low rounded-xl px-4 py-3 gap-2 mb-4">
            <View className="flex-row items-center gap-3">
              {artistLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="search" size={18} color={Colors.onSurfaceVariant} />
              )}
              <TextInput
                className="flex-1 text-base text-on-surface"
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
          </View>

          {artistResults.length > 0 ? (
            <View className="rounded-xl bg-surface-container-lowest border border-outline-variant overflow-hidden mb-6">
              {artistResults.map((artist, index) => (
                <TouchableOpacity
                  key={artist.id}
                  onPress={() => {
                    setSelectedArtist(artist)
                    setArtistQuery('')
                    setArtistResults([])
                  }}
                  className="flex-row items-center gap-3 px-4 py-3"
                  style={{
                    borderTopWidth: index > 0 ? 1 : 0,
                    borderTopColor: Colors.outlineVariant,
                  }}
                >
                  <View className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high">
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
          ) : null}

          <Text className="text-on-surface font-semibold text-sm mb-2">Visibility</Text>
          <View className="flex-row gap-3 mb-6">
            {(['PUBLIC', 'PRIVATE'] as const).map((option) => {
              const active = visibility === option
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => setVisibility(option)}
                  className={`flex-1 rounded-xl px-4 py-3 items-center ${
                    active ? 'bg-primary' : 'bg-surface-container-high'
                  }`}
                >
                  <Text
                    className={`font-bold ${
                      active ? 'text-on-primary' : 'text-on-surface-variant'
                    }`}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View className="flex-row items-center justify-between bg-surface-container-low rounded-2xl px-4 py-4 mb-6">
            <View className="flex-1 pr-4">
              <Text className="text-on-surface font-semibold text-base">Discovery</Text>
              <Text className="text-on-surface-variant text-sm mt-1">
                Allow this community to appear in discovery recommendations.
              </Text>
            </View>
            <Switch
              value={discoveryEnabled}
              onValueChange={setDiscoveryEnabled}
              trackColor={{ false: Colors.outlineVariant, true: `${Colors.primary}66` }}
              thumbColor={discoveryEnabled ? Colors.primary : '#f4f3f4'}
            />
          </View>

          <Text className="text-on-surface font-semibold text-sm mb-2">Taste Summary</Text>
          <TextInput
            className="bg-surface-container-low rounded-xl px-4 py-3 text-base text-on-surface mb-8"
            placeholder="Add a short summary of the community's taste."
            placeholderTextColor={Colors.onSurfaceVariant}
            value={tasteSummaryText}
            onChangeText={setTasteSummaryText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View className="border-t border-surface-container-high pt-6 pb-10">
            <Text className="text-on-surface font-semibold text-sm mb-2">Danger Zone</Text>
            <Text className="text-on-surface-variant text-sm mb-4">
              Deleting a community removes it permanently for all members.
            </Text>
            <TouchableOpacity
              onPress={handleDelete}
              disabled={submitting || deleting}
              className="bg-red-500/10 rounded-xl px-4 py-4 items-center"
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Text className="text-red-500 font-bold">Delete Community</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}
