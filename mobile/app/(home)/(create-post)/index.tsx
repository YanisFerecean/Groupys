import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import * as Haptics from 'expo-haptics'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { SymbolView } from 'expo-symbols'
import { Colors } from '@/constants/colors'
import { apiFetch, createPost } from '@/lib/api'
import { ApiError } from '@/lib/apiRequest'
import { decodeLexicalContent, encodeLexicalContent } from '@/lib/lexicalContent'
import { normalizeMediaUrl } from '@/lib/media'
import type { CommunityResDto } from '@/models/CommunityRes'
import AuthImageWithToken from '@/components/ui/AuthImageWithToken'
import LexicalEditorDOM from '@/components/post/lexical/LexicalEditorDOM'
import SelectCommunityModal from '@/components/community/SelectCommunityModal'
import {
  useCreatePostDraftStore,
  type CreatePostDraftCommunity,
  type CreatePostDraftFile,
  type CreatePostDraftMedia,
} from '@/store/createPostDraftStore'

const MAX_WORDS = 300
const INITIAL_CONTENT = 'Edit this text to start! Type / to use command'
const MAX_VIDEO_UPLOAD_SIZE_MB = 100
const MAX_NON_VIDEO_UPLOAD_SIZE_MB = 25

function getReadableApiMessage(rawMessage: string): string {
  return rawMessage.replace(/^API error\s+\d+:\s*/i, '').trim()
}

function getCreatePostErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : ''
  const normalized = getReadableApiMessage(raw).toLowerCase()

  if (
    normalized.includes('video file exceeds 100 mb limit') ||
    (normalized.includes('video') && normalized.includes('100 mb'))
  ) {
    return `Video files can be up to ${MAX_VIDEO_UPLOAD_SIZE_MB} MB. Choose a smaller video and try again.`
  }

  if (
    normalized.includes('file exceeds 25 mb limit') ||
    (normalized.includes('exceeds') && normalized.includes('25 mb')) ||
    (normalized.includes('file') && normalized.includes('too large'))
  ) {
    return `Attachments other than video must be under ${MAX_NON_VIDEO_UPLOAD_SIZE_MB} MB.`
  }

  if (error instanceof ApiError && error.status === 413) {
    return `Upload too large. Videos can be up to ${MAX_VIDEO_UPLOAD_SIZE_MB} MB; other files must be under ${MAX_NON_VIDEO_UPLOAD_SIZE_MB} MB.`
  }

  if (error instanceof ApiError && error.status >= 500) {
    return 'The server could not publish your post right now. Please try again in a moment.'
  }

  if (raw) {
    return getReadableApiMessage(raw)
  }

  return 'Could not publish your post. Please try again.'
}

export default function CreatePostScreen() {
  const insets = useSafeAreaInsets()
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const params = useLocalSearchParams<{
    selectedCommunityId?: string
    selectedCommunityName?: string
    selectedCommunityIconType?: string
    selectedCommunityIconEmoji?: string
    selectedCommunityIconUrl?: string
    selectedCommunityDescription?: string
  }>()
  const draft = useCreatePostDraftStore((state) => state.draft)
  const saveDraft = useCreatePostDraftStore((state) => state.saveDraft)
  const clearDraft = useCreatePostDraftStore((state) => state.clearDraft)

  const [communities, setCommunities] = useState<CommunityResDto[]>([])
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityResDto | null>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState(INITIAL_CONTENT)
  const [wordCount, setWordCount] = useState(0)
  const [isOverLimit, setIsOverLimit] = useState(false)
  const [media, setMedia] = useState<CreatePostDraftMedia[]>([])
  const [files, setFiles] = useState<CreatePostDraftFile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [showCommunityModal, setShowCommunityModal] = useState(false)
  const [editorResetKey, setEditorResetKey] = useState(0)
  const selectedCommunityRef = useRef<CommunityResDto | null>(null)
  const draftRestoredRef = useRef(false)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  useEffect(() => {
    selectedCommunityRef.current = selectedCommunity
  }, [selectedCommunity])

  useEffect(() => {
    if (!draft || draftRestoredRef.current) return
    setTitle(draft.title)
    setContent(decodeLexicalContent(draft.content))
    setMedia(draft.media)
    setFiles(draft.files)
    setEditorResetKey((prev) => prev + 1)
    if (draft.community) {
      setSelectedCommunity(draft.community as CommunityResDto)
    }
    draftRestoredRef.current = true
  }, [draft])

  useEffect(() => {
    let cancelled = false
    async function fetchCommunities() {
      try {
        const token = await getTokenRef.current()
        const data = await apiFetch<CommunityResDto[]>('/communities/mine', token)
        if (cancelled) return
        setCommunities(data)
        // Only set default if no community was selected from params
        if (!params.selectedCommunityId && !selectedCommunityRef.current && !draft?.community?.id) {
          setSelectedCommunity(data.length > 0 ? data[0] : null)
        }
      } catch (err) {
        console.error('Failed to fetch communities:', err)
      }
    }
    fetchCommunities()
    return () => { cancelled = true }
  }, [])

  // Handle community selection from params (coming back from select-community screen)
  useEffect(() => {
    if (params.selectedCommunityId && communities.length > 0) {
      const selected = communities.find(c => c.id === params.selectedCommunityId)
      if (selected) {
        setSelectedCommunity(selected)
      } else if (params.selectedCommunityName) {
        // Create a community object from params if not found in list
        setSelectedCommunity({
          id: params.selectedCommunityId,
          name: params.selectedCommunityName,
          iconType: params.selectedCommunityIconType as 'EMOJI' | 'IMAGE' | undefined,
          iconEmoji: params.selectedCommunityIconEmoji,
          iconUrl: params.selectedCommunityIconUrl,
          description: params.selectedCommunityDescription,
        } as CommunityResDto)
      }
    }
  }, [params.selectedCommunityId, communities])

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true)
    })
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false)
    })

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setShowCommunityModal(false)
    }, [])
  )

  const handleWordCountChange = useCallback((count: number, overLimit: boolean) => {
    setWordCount(count)
    setIsOverLimit(overLimit)
  }, [])

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
  }, [])

  const resetForm = useCallback(() => {
    setTitle('')
    setContent(INITIAL_CONTENT)
    setWordCount(0)
    setIsOverLimit(false)
    setMedia([])
    setFiles([])
    setEditorResetKey((prev) => prev + 1)
  }, [])

  const toDraftCommunity = useCallback(
    (community: CommunityResDto | null): CreatePostDraftCommunity | null => {
      if (!community) return null
      return {
        id: community.id,
        name: community.name,
        iconType: community.iconType,
        iconEmoji: community.iconEmoji,
        iconUrl: community.iconUrl,
        description: community.description,
      }
    },
    [],
  )

  const contentChanged =
    content.trim().length > 0 && content.trim() !== INITIAL_CONTENT.trim()
  const hasUnsavedChanges =
    Boolean(title.trim()) || media.length > 0 || files.length > 0 || contentChanged

  const saveCurrentDraft = useCallback(() => {
    saveDraft({
      title,
      content,
      media,
      files,
      community: toDraftCommunity(selectedCommunity),
      updatedAt: Date.now(),
    })
  }, [content, files, media, saveDraft, selectedCommunity, title, toDraftCommunity])

  const handleDiscard = useCallback(() => {
    clearDraft()
    resetForm()
    router.back()
  }, [clearDraft, resetForm])

  const handleClosePress = useCallback(() => {
    if (!hasUnsavedChanges) {
      handleDiscard()
      return
    }

    Alert.alert(
      'Unsaved Post',
      'Save this as a draft or reset all changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: handleDiscard },
        {
          text: 'Save Draft',
          onPress: () => {
            saveCurrentDraft()
            router.back()
          },
        },
      ],
    )
  }, [handleDiscard, hasUnsavedChanges, saveCurrentDraft])

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
      const selectedMedia: CreatePostDraftMedia[] = result.assets.map((asset) => ({
        uri: asset.uri,
        type: asset.type,
        mimeType: asset.mimeType,
        name: asset.fileName,
      }))
      setMedia((prev) => [...prev, ...selectedMedia].slice(0, 4))
    }
  }

  const pickFile = async () => {
    const totalAttachments = media.length + files.length
    if (totalAttachments >= 4) {
      alert('Maximum 4 attachments allowed.')
      return
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      multiple: true,
      copyToCacheDirectory: true,
    })
    if (!result.canceled && result.assets) {
      const audioAssets = result.assets.filter((asset) => {
        if (asset.mimeType?.startsWith('audio/')) return true
        const filename = (asset.name ?? asset.uri).toLowerCase()
        return /\.(aac|aif|aiff|amr|caf|flac|m4a|mp3|oga|ogg|opus|wav|wma)$/.test(filename)
      })

      if (audioAssets.length === 0) {
        Alert.alert('Invalid file type', 'Only audio files can be attached from files.')
        return
      }

      if (audioAssets.length < result.assets.length) {
        Alert.alert('Some files were skipped', 'Only audio files are allowed.')
      }

      const remaining = 4 - totalAttachments
      const selectedFiles: CreatePostDraftFile[] = audioAssets
        .slice(0, remaining)
        .map((asset) => ({
          uri: asset.uri,
          name: asset.name ?? asset.uri.split('/').pop() ?? 'attachment',
          mimeType: asset.mimeType,
          size: typeof asset.size === 'number' ? asset.size : undefined,
        }))
      setFiles((prev) => [...prev, ...selectedFiles])
    }
  }

  const handleSubmit = async () => {
    console.log('Submit triggered:', { 
      title: title.trim(), 
      community: selectedCommunity?.id, 
      submitting, 
      isOverLimit,
      contentLength: content?.length 
    })
    
    if (!title.trim()) {
      console.log('Submit blocked: no title')
      return
    }
    if (!selectedCommunity) {
      console.log('Submit blocked: no community selected')
      return
    }
    if (submitting) {
      console.log('Submit blocked: already submitting')
      return
    }
    if (isOverLimit) {
      console.log('Submit blocked: word count over limit')
      return
    }
    
    setSubmitting(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const token = await getToken()
      if (!token) {
        console.log('Submit blocked: no token')
        return
      }

      const allMedia = [
        ...media.map(m => ({
          uri: m.uri,
          type: m.mimeType ?? m.type ?? undefined,
          name: m.name ?? undefined,
        })),
        ...files.map(f => ({
          uri: f.uri,
          type: f.mimeType ?? undefined,
          name: f.name,
        })),
      ]

      console.log('Creating post with:', { 
        communityId: selectedCommunity.id, 
        title: title.trim(),
        contentLength: content?.length,
        mediaCount: allMedia.length 
      })

      const payloadContent = encodeLexicalContent(content)

      await createPost(
        selectedCommunity.id,
        token,
        title.trim(),
        payloadContent,
        allMedia.length ? allMedia : undefined
      )

      console.log('Post created successfully')
      clearDraft()
      resetForm()
      router.navigate('/(home)/(feed)')
    } catch (err) {
      console.error('Create post error:', err)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert('Post not published', getCreatePostErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const isSubmitDisabled = !title.trim() || !selectedCommunity || submitting || isOverLimit

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      
      {/* Minimal Header - Native Liquid Glass style */}
      <View
        className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100"
        style={{ paddingTop: insets.top }}
      >
        {isLiquidGlassAvailable() ? (
          <GlassView isInteractive style={{ borderRadius: 50 }}>
            <TouchableOpacity
              onPress={handleClosePress}
              style={{ padding: 12 }}
              activeOpacity={0.7}
            >
              <SymbolView name="xmark" size={20} tintColor={Colors.primary} />
            </TouchableOpacity>
          </GlassView>
        ) : (
          <TouchableOpacity
            onPress={handleClosePress}
            className="w-11 h-11 rounded-full bg-gray-100 items-center justify-center"
          >
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        )}

      {/* Community Selector Pill - Liquid Glass */}
      {isLiquidGlassAvailable() ? (
        <GlassView isInteractive style={{ borderRadius: 50 }}>
          <TouchableOpacity
            onPress={() => setShowCommunityModal(true)}
            style={{ paddingHorizontal: 16, paddingVertical: 10 }}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              {selectedCommunity?.iconType === 'EMOJI' && selectedCommunity.iconEmoji ? (
                <Text className="text-base mr-1.5">{selectedCommunity.iconEmoji}</Text>
              ) : selectedCommunity?.iconUrl ? (
                <View className="w-5 h-5 rounded-full overflow-hidden mr-1.5">
                  <AuthImageWithToken
                    uri={normalizeMediaUrl(selectedCommunity.iconUrl)!}
                    style={{ width: 20, height: 20 }}
                  />
                </View>
              ) : (
                <SymbolView name="globe" size={16} tintColor={Colors.primary} style={{ marginRight: 6 }} />
              )}
              <Text className="text-sm font-medium text-gray-800 mr-1.5">
                {selectedCommunity ? selectedCommunity.name : 'Select'}
              </Text>
              <SymbolView name="chevron.down" size={12} tintColor="#6b7280" />
            </View>
          </TouchableOpacity>
        </GlassView>
      ) : (
        <TouchableOpacity
          onPress={() => setShowCommunityModal(true)}
          className="flex-row items-center bg-gray-100 px-4 py-2.5 rounded-full"
        >
          {selectedCommunity?.iconType === 'EMOJI' && selectedCommunity.iconEmoji ? (
            <Text className="text-base mr-1.5">{selectedCommunity.iconEmoji}</Text>
          ) : selectedCommunity?.iconUrl ? (
            <View className="w-5 h-5 rounded-full overflow-hidden mr-1.5">
              <AuthImageWithToken
                uri={normalizeMediaUrl(selectedCommunity.iconUrl)!}
                style={{ width: 20, height: 20 }}
              />
            </View>
          ) : (
            <Ionicons name="globe-outline" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
          )}
          <Text className="text-sm font-medium text-gray-800 mr-1.5">
            {selectedCommunity ? selectedCommunity.name : 'Select'}
          </Text>
          <Ionicons name="chevron-down" size={12} color="#6b7280" />
        </TouchableOpacity>
      )}

        {submitting ? (
          <View className="w-11 h-11 items-center justify-center">
            <ActivityIndicator size="small" color="#22c55e" />
          </View>
        ) : isLiquidGlassAvailable() ? (
          <GlassView 
            isInteractive 
            style={{ borderRadius: 50 }}
          >
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitDisabled}
              style={{ padding: 12 }}
              activeOpacity={0.7}
            >
              <SymbolView 
                name="paperplane.fill" 
                size={20} 
                tintColor={isSubmitDisabled ? '#9ca3af' : '#22c55e'} 
              />
            </TouchableOpacity>
          </GlassView>
        ) : (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitDisabled}
            className={`w-11 h-11 rounded-full items-center justify-center ${
              isSubmitDisabled ? 'bg-gray-200' : 'bg-green-100'
            }`}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={isSubmitDisabled ? '#9ca3af' : '#22c55e'} 
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Full Screen Content Area */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerStyle={{ flexGrow: 1 }}
        >
      {/* Title - Notion style, large and bold */}
      <View className="px-6 pt-6 pb-2">
        <TextInput
          className="text-3xl font-bold text-gray-900 py-2"
          placeholder="Title"
          placeholderTextColor="#d1d5db"
          value={title}
          onChangeText={setTitle}
          editable={!submitting}
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        />
        <View className="h-px bg-gray-100 mt-4" />
      </View>

      {/* Full-screen Lexical Editor */}
      <View className="flex-1 min-h-[400px] px-6">
        <LexicalEditorDOM
          key={editorResetKey}
          initialContent={content}
          onChange={handleContentChange}
          onWordCountChange={handleWordCountChange}
          placeholder="Type '/' to use command"
          maxWords={MAX_WORDS}
          editable={!submitting}
        />
      </View>

      {/* Media preview - inline style like Notion */}
      {media.length > 0 && (
        <View className="px-6 py-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {media.map((m, idx) => {
              const mediaType = m.mimeType ?? m.type ?? ''
              return (
                <View key={idx} className="mr-3 relative">
                  {mediaType.startsWith('video') ? (
                    <View className="w-72 h-48 bg-gray-50 rounded-xl items-center justify-center border border-gray-100">
                      <View className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center">
                        <Ionicons name="videocam" size={28} color="#2563eb" />
                      </View>
                    </View>
                  ) : (
                    <Image
                      source={{ uri: m.uri }}
                      className="w-72 h-48 rounded-xl"
                      resizeMode="cover"
                    />
                  )}
                  <TouchableOpacity
                    onPress={() => setMedia(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 items-center justify-center"
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )
            })}
          </ScrollView>
        </View>
      )}

      {/* File attachments */}
      {files.length > 0 && (
        <View className="px-6 py-4 gap-2">
          {files.map((f, idx) => (
            <View key={idx} className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 gap-3 border border-gray-100">
              <View className="w-10 h-10 rounded-lg bg-blue-50 items-center justify-center">
                <Ionicons name="document-outline" size={20} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-900 font-medium" numberOfLines={1}>{f.name}</Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  {f.size ? `${(f.size / 1024).toFixed(0)} KB` : ''}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                className="p-1"
              >
                <Ionicons name="close-circle" size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      </ScrollView>

      {/* Floating Action Bar - bottom toolbar */}
      <View
        className="flex-row items-center justify-between px-4 py-3 bg-white border-t border-gray-100"
        style={{
          paddingBottom: keyboardVisible ? 0 : (insets.bottom > 0 ? insets.bottom : 16),
        }}
      >
          <View className="flex-row gap-2">
            <TouchableOpacity 
              onPress={() => pickMedia('images')} 
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Ionicons name="image-outline" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => pickMedia('videos')} 
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Ionicons name="videocam-outline" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={pickFile} 
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Ionicons name="document-attach-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>

      {/* Word count */}
      <Text className={`text-sm ${isOverLimit ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
        {wordCount}/{MAX_WORDS}
      </Text>
    </View>
  </KeyboardAvoidingView>

  {/* Community Selection Modal */}
  <SelectCommunityModal
    visible={showCommunityModal}
    onClose={() => setShowCommunityModal(false)}
    selectedCommunityId={selectedCommunity?.id}
  />
</View>
  )
}
