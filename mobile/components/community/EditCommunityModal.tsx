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
import { apiPut, mediaUrl, uploadCommunityMedia } from '@/lib/api'
import { Colors } from '@/constants/colors'
import type { CommunityResDto } from '@/models/CommunityRes'
import AuthImageWithToken from '../ui/AuthImageWithToken'

interface Props {
  visible: boolean
  onClose: () => void
  onUpdated: (community: CommunityResDto) => void
  community: CommunityResDto
}

export default function EditCommunityModal({
  visible,
  onClose,
  onUpdated,
  community,
}: Props) {
  const { getToken } = useAuth()
  
  const [description, setDescription] = useState(community.description || '')
  const [genre, setGenre] = useState(community.genre || '')
  const [country, setCountry] = useState(community.country || '')
  
  const [bannerUri, setBannerUri] = useState<string | null>(community.bannerUrl ? mediaUrl(community.bannerUrl.replace(/^\/api\/posts\/media\//, '')) : null)
  const [iconType, setIconType] = useState<'IMAGE' | 'EMOJI'>(community.iconType === 'EMOJI' ? 'EMOJI' : 'IMAGE')
  const [iconEmoji, setIconEmoji] = useState(community.iconEmoji || '🌟')
  const [iconUri, setIconUri] = useState<string | null>(community.iconUrl ? mediaUrl(community.iconUrl.replace(/^\/api\/posts\/media\//, '')) : null)
  
  const [newBannerFile, setNewBannerFile] = useState<string | null>(null)
  const [newIconFile, setNewIconFile] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)

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

  const handleUpdate = async () => {
    if (submitting) return
    setSubmitting(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const token = await getToken()
      if (!token) return

      let finalBannerUrl = community.bannerUrl
      let finalIconUrl = community.iconUrl

      if (newBannerFile) {
        finalBannerUrl = await uploadCommunityMedia(token, newBannerFile, 'image')
      }
      if (iconType === 'IMAGE' && newIconFile) {
        finalIconUrl = await uploadCommunityMedia(token, newIconFile, 'image')
      }

      const updated = await apiPut<CommunityResDto>(`/communities/${community.id}`, token, {
        description: description.trim() || null,
        genre: genre.trim() || null,
        country: country.trim() || null,
        imageUrl: community.imageUrl, // keep old if needed or map to banner
        bannerUrl: finalBannerUrl,
        iconType: iconType,
        iconEmoji: iconEmoji.trim() || null,
        iconUrl: finalIconUrl,
      })
      
      onUpdated(updated)
      onClose()
    } catch (err) {
      console.error('Update community error:', err)
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
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-surface-container-high">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-on-surface-variant text-base">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-on-surface font-bold text-base">Edit Community</Text>
          <TouchableOpacity onPress={handleUpdate} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text className="text-primary font-bold text-base">Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-6" keyboardShouldPersistTaps="handled">
          <Text className="text-on-surface font-semibold text-sm mb-2">Banner Image</Text>
          <TouchableOpacity 
            onPress={() => pickImage(true)}
            className="w-full h-32 bg-surface-container-high rounded-xl items-center justify-center mb-6 overflow-hidden relative"
          >
            {bannerUri ? (
              <>
                {newBannerFile ? (
                   <Image source={{ uri: bannerUri }} className="w-full h-full absolute" resizeMode="cover" />
                ) : (
                   <AuthImageWithToken uri={bannerUri} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                )}
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
                  {newIconFile ? (
                     <Image source={{ uri: iconUri }} className="w-full h-full absolute" resizeMode="cover" />
                  ) : (
                     <AuthImageWithToken uri={iconUri} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                  )}
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

          <Text className="text-on-surface font-semibold text-sm mb-2">Description</Text>
          <TextInput
            className="bg-surface-container-low rounded-xl px-4 py-3 text-base text-on-surface mb-4"
            placeholder="What is this community about?"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text className="text-on-surface font-semibold text-sm mb-2">Genre / Topic</Text>
          <TextInput
            className="bg-surface-container-low rounded-xl px-4 py-3 text-base text-on-surface mb-4"
            placeholder="e.g. Pop Music, Synthesizers"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={genre}
            onChangeText={setGenre}
          />

          <Text className="text-on-surface font-semibold text-sm mb-2">Country</Text>
          <TextInput
            className="bg-surface-container-low rounded-xl px-4 py-3 text-base text-on-surface mb-10"
            placeholder="e.g. Worldwide, United States"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={country}
            onChangeText={setCountry}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}
