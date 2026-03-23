import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useState } from 'react'
import {
  ActivityIndicator,
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
import { apiPost, uploadCommunityMedia } from '@/lib/api'
import { Colors } from '@/constants/colors'
import type { CommunityResDto } from '@/models/CommunityRes'

const TAG_SUGGESTIONS = [
  'Fan Club', 'Discussion', 'Covers', 'Live Shows', 'Vinyl',
  'Lyrics', 'Remixes', 'Setlists', 'News', 'Throwbacks',
]

interface Props {
  visible: boolean
  onClose: () => void
  onCreated: (community: CommunityResDto) => void
  artistId: number
  artistName: string
}

export default function CreateCommunityModal({
  visible,
  onClose,
  onCreated,
  artistId,
  artistName,
}: Props) {
  const { getToken } = useAuth()
  const [name, setName] = useState(`${artistName} Fans`)
  const [country, setCountry] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  
  const [bannerUri, setBannerUri] = useState<string | null>(null)
  const [iconType, setIconType] = useState<'IMAGE' | 'EMOJI'>('EMOJI')
  const [iconEmoji, setIconEmoji] = useState('🌟')
  const [iconUri, setIconUri] = useState<string | null>(null)
  
  const [submitting, setSubmitting] = useState(false)

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase()
    if (!tag || tags.includes(tag) || tags.length >= 5) return
    setTags([...tags, tag])
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const toggleSuggestion = (tag: string) => {
    const normalized = tag.toLowerCase()
    if (tags.includes(normalized)) {
      removeTag(normalized)
    } else if (tags.length < 5) {
      setTags([...tags, normalized])
    }
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
        setBannerUri(result.assets[0].uri)
      } else {
        setIconUri(result.assets[0].uri)
      }
    }
  }

  const handleCreate = async () => {
    if (!name.trim() || submitting) return
    setSubmitting(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const token = await getToken()
      if (!token) return

      let finalBannerUrl = null
      let finalIconUrl = null

      if (bannerUri) {
        finalBannerUrl = await uploadCommunityMedia(token, bannerUri, 'image')
      }
      if (iconType === 'IMAGE' && iconUri) {
        finalIconUrl = await uploadCommunityMedia(token, iconUri, 'image')
      }

      const created = await apiPost<CommunityResDto>('/communities', token, {
        name: name.trim(),
        description: '',
        genre: artistName,
        country: country.trim() || null,
        imageUrl: null,
        bannerUrl: finalBannerUrl,
        iconType: iconType,
        iconEmoji: iconEmoji.trim() || null,
        iconUrl: finalIconUrl,
        tags,
        artistId,
      })
      onCreated(created)
      // Reset
      setName(`${artistName} Fans`)
      setCountry('')
      setTags([])
      setBannerUri(null)
      setIconUri(null)
      setTagInput('')
      setIconEmoji('🌟')
      setIconType('EMOJI')
    } catch (err) {
      console.error('Create community error:', err)
    } finally {
      setSubmitting(false)
    }
  }

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
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-surface-container-high">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-on-surface-variant text-base">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-on-surface font-bold text-base">New Community</Text>
          <TouchableOpacity onPress={handleCreate} disabled={!name.trim() || submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text
                className={`text-base font-bold ${
                  name.trim() ? 'text-primary' : 'text-on-surface-variant'
                }`}
              >
                Create
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-8" keyboardShouldPersistTaps="handled">
          <Text className="text-on-surface font-semibold text-sm mb-2">Banner Image</Text>
          <TouchableOpacity 
            onPress={() => pickImage(true)}
            className="w-full h-32 bg-surface-container-high rounded-xl items-center justify-center mb-6 overflow-hidden relative"
          >
            {bannerUri ? (
              <>
                <Image source={{ uri: bannerUri }} className="w-full h-full absolute" resizeMode="cover" />
                <View className="absolute inset-0 bg-black/30 items-center justify-center">
                  <Ionicons name="camera" size={24} color="#fff" />
                </View>
              </>
            ) : (
              <Ionicons name="image-outline" size={32} color={Colors.onSurfaceVariant} />
            )}
          </TouchableOpacity>

          <Text className="text-on-surface font-semibold text-sm mb-2">Community Icon</Text>
          <View className="flex-row items-center gap-4 mb-3">
            <TouchableOpacity 
              onPress={() => setIconType('IMAGE')}
              className={`flex-1 py-2 rounded-lg items-center ${iconType === 'IMAGE' ? 'bg-primary' : 'bg-surface-container-high'}`}
            >
              <Text className={`font-bold ${iconType === 'IMAGE' ? 'text-on-primary' : 'text-on-surface-variant'}`}>Image</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setIconType('EMOJI')}
              className={`flex-1 py-2 rounded-lg items-center ${iconType === 'EMOJI' ? 'bg-primary' : 'bg-surface-container-high'}`}
            >
              <Text className={`font-bold ${iconType === 'EMOJI' ? 'text-on-primary' : 'text-on-surface-variant'}`}>Emoji</Text>
            </TouchableOpacity>
          </View>

          {iconType === 'IMAGE' ? (
            <TouchableOpacity 
              onPress={() => pickImage(false)}
              className="w-20 h-20 rounded-full bg-surface-container-high items-center justify-center mb-6 self-start relative overflow-hidden"
            >
              {iconUri ? (
                <>
                  <Image source={{ uri: iconUri }} className="w-full h-full absolute" resizeMode="cover" />
                  <View className="absolute inset-0 bg-black/30 items-center justify-center">
                    <Ionicons name="camera" size={20} color="#fff" />
                  </View>
                </>
              ) : (
                <Ionicons name="image-outline" size={24} color={Colors.onSurfaceVariant} />
              )}
            </TouchableOpacity>
          ) : (
            <TextInput
              className="w-20 h-20 bg-surface-container-low rounded-full text-4xl text-center mb-6 items-center justify-center pb-2"
              placeholder="🌟"
              value={iconEmoji}
              onChangeText={(t) => setIconEmoji(t)}
              maxLength={2}
            />
          )}

          {/* Name */}
          <Text className="text-on-surface font-semibold text-sm mb-2">Community Name</Text>
          <TextInput
            className="bg-surface-container-low rounded-xl px-4 py-3 text-base text-on-surface mb-1"
            placeholder="Community name"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={name}
            onChangeText={(t) => setName(t.slice(0, 60))}
            maxLength={60}
          />
          <Text className="text-xs text-on-surface-variant mb-6">{name.length}/60</Text>

          {/* Country */}
          <Text className="text-on-surface font-semibold text-sm mb-2">Country (optional)</Text>
          <TextInput
            className="bg-surface-container-low rounded-xl px-4 py-3 text-base text-on-surface mb-6"
            placeholder="e.g. United States"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={country}
            onChangeText={setCountry}
          />

          {/* Tags */}
          <Text className="text-on-surface font-semibold text-sm mb-2">
            Tags ({tags.length}/5)
          </Text>

          {/* Custom tag input */}
          <View className="flex-row items-center gap-2 mb-3">
            <TextInput
              className="flex-1 bg-surface-container-low rounded-xl px-4 py-3 text-sm text-on-surface"
              placeholder="Add a custom tag..."
              placeholderTextColor={Colors.onSurfaceVariant}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={() => addTag(tagInput)}
              returnKeyType="done"
              maxLength={30}
            />
            <TouchableOpacity
              onPress={() => addTag(tagInput)}
              disabled={!tagInput.trim() || tags.length >= 5}
              className={`px-4 py-3 rounded-xl ${
                tagInput.trim() && tags.length < 5 ? 'bg-primary' : 'bg-surface-container-high'
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  tagInput.trim() && tags.length < 5 ? 'text-white' : 'text-on-surface-variant'
                }`}
              >
                Add
              </Text>
            </TouchableOpacity>
          </View>

          {/* Selected tags */}
          {tags.length > 0 ? (
            <View className="flex-row flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => removeTag(tag)}
                  className="flex-row items-center gap-1 bg-primary/15 px-3 py-1.5 rounded-full"
                >
                  <Text className="text-xs font-semibold text-primary">#{tag}</Text>
                  <Ionicons name="close" size={12} color={Colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {/* Suggestions */}
          <Text className="text-xs text-on-surface-variant mb-2">Suggestions:</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {TAG_SUGGESTIONS.filter((t) => !tags.includes(t.toLowerCase())).map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleSuggestion(tag)}
                className="bg-surface-container-high px-3 py-1.5 rounded-full"
                disabled={tags.length >= 5}
              >
                <Text
                  className={`text-xs font-semibold ${
                    tags.length >= 5 ? 'text-on-surface-variant/50' : 'text-on-surface-variant'
                  }`}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}
