import { Ionicons } from '@expo/vector-icons'
import { useAuth, useUser } from '@clerk/expo'
import { useEffect, useRef, useState } from 'react'
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
import * as DocumentPicker from 'expo-document-picker'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { apiFetch, createPost, mediaUrl } from '@/lib/api'
import { Colors } from '@/constants/colors'
import type { CommunityResDto } from '@/models/CommunityRes'
import AuthImageWithToken from '@/components/ui/AuthImageWithToken'
import MarkdownEditor, { type MarkdownEditorRef, type FormatType } from '@/components/post/MarkdownEditor'
import { Ionicons as IoniconType } from '@expo/vector-icons'

interface ToolbarButton {
  format: FormatType
  label?: string
  icon?: keyof typeof IoniconType.glyphMap
  textStyle?: object
}

const FORMAT_BUTTONS: ToolbarButton[] = [
  { format: 'bold',          label: 'B',  textStyle: { fontWeight: '800' } },
  { format: 'italic',        label: 'I',  textStyle: { fontStyle: 'italic' } },
  { format: 'underline',     label: 'U',  textStyle: { textDecorationLine: 'underline' } },
  { format: 'strikethrough', label: 'S',  textStyle: { textDecorationLine: 'line-through' } },
  { format: 'link',          icon: 'link-outline' },
  { format: 'ordered-list',  icon: 'list-outline' },
  { format: 'blockquote',    icon: 'chatbox-outline' },
]

export default function CreatePostScreen() {
  const insets = useSafeAreaInsets()
  const { getToken } = useAuth()
  
  const [communities, setCommunities] = useState<CommunityResDto[]>([])
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityResDto | null>(null)
  const [showCommunitySelector, setShowCommunitySelector] = useState(false)
  
  const editorRef = useRef<MarkdownEditorRef>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset[]>([])
  const [files, setFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingCommunities, setLoadingCommunities] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchCommunities() {
      try {
        const token = await getToken()
        const data = await apiFetch<CommunityResDto[]>('/communities/mine', token)
        if (cancelled) return
        setCommunities(data)
        setSelectedCommunity((prev) => prev || (data.length > 0 ? data[0] : null))
      } catch (err) {
        console.error('Failed to fetch communities:', err)
      } finally {
        if (!cancelled) setLoadingCommunities(false)
      }
    }
    fetchCommunities()
    return () => { cancelled = true }
  }, [])


  const pickMedia = async (type: 'images' | 'videos') => {
    if (media.length >= 4) {
      alert('Maximum 4 attachments allowed.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [type],
      quality: 0.8,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 4 - media.length,
    })
    if (!result.canceled && result.assets) {
      setMedia(prev => [...prev, ...result.assets].slice(0, 4))
    }
  }

  const pickFile = async () => {
    const totalAttachments = media.length + files.length
    if (totalAttachments >= 4) {
      alert('Maximum 4 attachments allowed.')
      return
    }
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    })
    if (!result.canceled && result.assets) {
      const remaining = 4 - totalAttachments
      setFiles(prev => [...prev, ...result.assets.slice(0, remaining)])
    }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !selectedCommunity || submitting) return
    setSubmitting(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const token = await getToken()
      if (!token) return

      const allMedia = [
        ...media.map(m => ({ uri: m.uri, type: m.type as any })),
        ...files.map(f => ({ uri: f.uri, type: f.mimeType ?? 'application/octet-stream' })),
      ]
      await createPost(
        selectedCommunity.id,
        token,
        title.trim(),
        content.trim(),
        allMedia.length ? allMedia : undefined
      )
      
      // Navigate back or to the community/feed
      router.replace('/(home)/(feed)')
    } catch (err) {
      console.error('Create post error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="close" size={28} color={Colors.onSurface} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!title.trim() || !selectedCommunity || submitting}
          className={`px-6 py-2 rounded-full ${title.trim() && selectedCommunity ? 'bg-primary' : 'bg-surface-container-high'}`}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text
              className={`text-sm font-bold ${
                title.trim() && selectedCommunity ? 'text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              Post
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Community Selector Area */}
      <View className="flex-row items-center px-4 py-2">
        <TouchableOpacity 
          onPress={() => setShowCommunitySelector(true)}
          className="flex-row items-center bg-surface-container-high px-3 py-1.5 rounded-full"
        >
          {selectedCommunity?.iconType === 'EMOJI' && selectedCommunity.iconEmoji ? (
            <View className="w-6 h-6 rounded-full bg-surface-container-highest items-center justify-center mr-2">
              <Text className="text-xs">{selectedCommunity.iconEmoji}</Text>
            </View>
          ) : selectedCommunity?.iconUrl ? (
            <AuthImageWithToken 
              uri={mediaUrl(selectedCommunity.iconUrl.replace(/^\/api\/posts\/media\//, ''))} 
              style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }} 
            />
          ) : (
            <View className="w-6 h-6 rounded-full bg-primary items-center justify-center mr-2">
              <Ionicons name="planet" size={14} color="#fff" />
            </View>
          )}
          <Text className="text-on-surface font-bold text-sm mr-1">
            {selectedCommunity ? selectedCommunity.name : 'Select Community'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {/* Community Selector Modal */}
      <Modal
        visible={showCommunitySelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCommunitySelector(false)}
      >
        <View className="flex-1 justify-end">
          <TouchableOpacity 
            className="flex-1" 
            activeOpacity={1} 
            onPress={() => setShowCommunitySelector(false)} 
          />
          <View 
            className="bg-surface rounded-t-3xl overflow-hidden shadow-2xl" 
            style={{ height: '70%', paddingBottom: insets.bottom }}
          >
            <View className="px-5 py-4 border-b border-surface-container-high flex-row items-center justify-between bg-surface-container-low">
              <Text className="text-on-surface font-bold text-lg">Select Community</Text>
              <TouchableOpacity onPress={() => setShowCommunitySelector(false)}>
                <Ionicons name="close" size={24} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              {communities.length === 0 ? (
                <View className="items-center py-12 px-10">
                  <Ionicons name="people-outline" size={48} color={Colors.onSurfaceVariant} />
                  <Text className="text-on-surface font-bold text-lg mt-4 text-center">
                    No communities found
                  </Text>
                  <Text className="text-on-surface-variant text-sm mt-1 text-center">
                    You haven&apos;t joined any communities yet.
                  </Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setShowCommunitySelector(false)
                      router.push('/(home)/(discover)')
                    }}
                    className="mt-6 bg-primary px-8 py-3 rounded-full"
                  >
                    <Text className="text-on-primary font-bold">Discover Communities</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="py-2">
                  {communities.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => {
                        setSelectedCommunity(c)
                        setShowCommunitySelector(false)
                      }}
                      className={`flex-row items-center px-5 py-4 ${selectedCommunity?.id === c.id ? 'bg-primary/5' : ''}`}
                    >
                      {c.iconType === 'EMOJI' && c.iconEmoji ? (
                        <View className="w-10 h-10 rounded-full bg-surface-container-highest items-center justify-center mr-4">
                          <Text className="text-xl">{c.iconEmoji}</Text>
                        </View>
                      ) : c.iconUrl ? (
                        <AuthImageWithToken 
                          uri={mediaUrl(c.iconUrl.replace(/^\/api\/posts\/media\//, ''))} 
                          style={{ width: 40, height: 40, borderRadius: 20, marginRight: 16 }} 
                        />
                      ) : (
                        <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-4">
                          <Ionicons name="planet" size={22} color={Colors.primary} />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className={`font-bold text-base ${selectedCommunity?.id === c.id ? 'text-primary' : 'text-on-surface'}`}>
                          {c.name}
                        </Text>
                        {c.description ? (
                          <Text className="text-on-surface-variant text-xs" numberOfLines={1}>
                            {c.description}
                          </Text>
                        ) : null}
                      </View>
                      {selectedCommunity?.id === c.id && (
                        <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Scrollable Content */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
      >
        <ScrollView className="flex-1 px-4 mt-2" keyboardShouldPersistTaps="handled">
          <TextInput
            className="text-2xl font-bold text-on-surface py-2"
            placeholder="Title"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={title}
            onChangeText={setTitle}
            editable={!submitting}
          />

          <MarkdownEditor
            ref={editorRef}
            value={content}
            onChangeText={setContent}
            placeholder="Post text (optional)"
            editable={!submitting}
            minHeight={200}
          />

          {/* Media preview */}
          {media.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {media.map((m, idx) => (
                <View key={idx} className="mr-2 relative" style={{ width: media.length > 1 ? 280 : 350 }}>
                  {m.type?.startsWith('video') ? (
                    <View className="w-full h-48 bg-surface-container-high rounded-xl items-center justify-center">
                      <Ionicons name="videocam" size={48} color={Colors.onSurfaceVariant} />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: m.uri }}
                      className="w-full rounded-xl"
                      style={{ height: 250 }}
                      resizeMode="cover"
                    />
                  )}
                  <TouchableOpacity
                    onPress={() => setMedia(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 items-center justify-center"
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : null}
          {/* File attachments */}
          {files.length > 0 ? (
            <View className="mb-4 gap-2">
              {files.map((f, idx) => (
                <View key={idx} className="flex-row items-center bg-surface-container-high rounded-xl px-3 py-2.5 gap-3">
                  <Ionicons name="document-outline" size={20} color={Colors.primary} />
                  <Text className="flex-1 text-sm text-on-surface" numberOfLines={1}>{f.name}</Text>
                  <Text className="text-xs text-on-surface-variant">
                    {f.size ? `${(f.size / 1024).toFixed(0)} KB` : ''}
                  </Text>
                  <TouchableOpacity onPress={() => setFiles(prev => prev.filter((_, i) => i !== idx))}>
                    <Ionicons name="close-circle" size={20} color={Colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>

        {/* Toolbar */}
        <View
          className="bg-surface border-t border-surface-container-high flex-row items-center px-2 py-1"
          style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }}
        >
          {/* Left: media */}
          <TouchableOpacity onPress={() => pickMedia('images')} className="p-2.5">
            <Ionicons name="image-outline" size={22} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => pickMedia('videos')} className="p-2.5">
            <Ionicons name="play-circle-outline" size={22} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickFile} className="p-2.5">
            <Ionicons name="attach-outline" size={22} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>

          <View className="flex-1" />

          {/* Divider */}
          <View className="w-px h-5 bg-surface-container-high mx-1" />

          {/* Right: formatting */}
          {FORMAT_BUTTONS.map((btn) => (
            <TouchableOpacity
              key={btn.format}
              onPress={() => editorRef.current?.format(btn.format)}
              disabled={submitting}
              className="p-2"
              activeOpacity={0.6}
            >
              {btn.icon ? (
                <Ionicons name={btn.icon} size={20} color={Colors.onSurfaceVariant} />
              ) : (
                <Text style={[{ fontSize: 16, color: Colors.onSurfaceVariant }, btn.textStyle]}>
                  {btn.label}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}
