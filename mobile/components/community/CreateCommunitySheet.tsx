import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'

import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { Colors } from '@/constants/colors'
import { apiPost, uploadCommunityMedia } from '@/lib/api'
import { communityDetailPath, isHomeTab, type HomeTab } from '@/lib/profileRoutes'
import type { CommunityResDto } from '@/models/CommunityRes'

const TAG_SUGGESTIONS = [
  'Fan Club', 'Discussion', 'Covers', 'Live Shows', 'Vinyl',
  'Lyrics', 'Remixes', 'Setlists', 'News', 'Throwbacks',
]

const STAGE_COUNT = 3
const INPUT_GLASS_TINT = 'rgba(255, 255, 255, 0.78)'
const INPUT_GLASS_BORDER = 'rgba(145, 110, 110, 0.24)'
const EMOJI_MATCH_REGEX = /(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*(?:\u{1F3FB}|\u{1F3FC}|\u{1F3FD}|\u{1F3FE}|\u{1F3FF})?|[\u{1F1E6}-\u{1F1FF}]{2}|[0-9#*]\uFE0F?\u20E3)/gu

type CommunityVisibility = 'PUBLIC' | 'PRIVATE'

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

function CreateCommunityContent() {
  const { getToken } = useAuth()
  const { width } = useWindowDimensions()
  const pagerRef = useRef<ScrollView>(null)
  const {
    artistId,
    artistName,
    homeTab,
  } = useLocalSearchParams<{
    artistId?: string
    artistName?: string
    homeTab?: string
  }>()

  const targetTab = useMemo<HomeTab>(() => {
    if (typeof homeTab === 'string' && isHomeTab(homeTab)) return homeTab
    return '(discover)'
  }, [homeTab])

  const resolvedArtistName = useMemo(() => {
    if (typeof artistName === 'string' && artistName.trim().length > 0) return artistName
    return 'Artist'
  }, [artistName])

  const resolvedArtistId = useMemo(() => {
    const parsed = Number(artistId)
    return Number.isFinite(parsed) ? parsed : null
  }, [artistId])

  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [bannerUri, setBannerUri] = useState<string | null>(null)
  const [iconType, setIconType] = useState<'IMAGE' | 'EMOJI'>('EMOJI')
  const [iconEmoji, setIconEmoji] = useState('')
  const [iconUri, setIconUri] = useState<string | null>(null)
  const [iconTabTrackWidth, setIconTabTrackWidth] = useState(0)
  const [visibility, setVisibility] = useState<CommunityVisibility>('PUBLIC')
  const [submitting, setSubmitting] = useState(false)

  const [stageIndex, setStageIndex] = useState(0)
  const [maxUnlockedStage, setMaxUnlockedStage] = useState(0)

  const [showSuccess, setShowSuccess] = useState(false)
  const successScale = useRef(new Animated.Value(0.8)).current
  const successOpacity = useRef(new Animated.Value(0)).current
  const successRotate = useRef(new Animated.Value(0)).current
  const scrollX = useRef(new Animated.Value(0)).current
  const iconTabAnim = useRef(new Animated.Value(iconType === 'EMOJI' ? 1 : 0)).current

  const pageWidth = Math.max(width, 320)

  const notifyValidationError = useCallback((message: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    Alert.alert('Please fill required fields', message)
  }, [])

  const validateStageOne = useCallback(() => {
    if (!name.trim()) {
      notifyValidationError('Community name is required before you continue.')
      return false
    }
    return true
  }, [name, notifyValidationError])

  const validateStageTwo = useCallback(() => {
    if (!bannerUri) {
      notifyValidationError('Please add a banner image.')
      return false
    }

    if (iconType === 'IMAGE' && !iconUri) {
      notifyValidationError('Please select a community icon image.')
      return false
    }

    if (iconType === 'EMOJI' && !extractFirstEmoji(iconEmoji)) {
      notifyValidationError('Please provide an emoji for the community icon.')
      return false
    }

    return true
  }, [bannerUri, iconEmoji, iconType, iconUri, notifyValidationError])

  const validateStageThree = useCallback(() => {
    if (tags.length === 0) {
      notifyValidationError('Add at least one tag before creating the community.')
      return false
    }
    if (!visibility) {
      notifyValidationError('Please choose visibility (Public or Private).')
      return false
    }
    return true
  }, [notifyValidationError, tags.length, visibility])

  const scrollToStage = useCallback((target: number, animated: boolean) => {
    const clamped = Math.max(0, Math.min(target, STAGE_COUNT - 1))
    pagerRef.current?.scrollTo({ x: clamped * pageWidth, animated })
    if (!animated) {
      scrollX.setValue(clamped * pageWidth)
    }
    setStageIndex(clamped)
  }, [pageWidth, scrollX])

  useEffect(() => {
    scrollToStage(stageIndex, false)
  }, [pageWidth, scrollToStage, stageIndex])

  useEffect(() => {
    Animated.timing(iconTabAnim, {
      toValue: iconType === 'EMOJI' ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start()
  }, [iconTabAnim, iconType])

  const handlePagerMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth)

    if (next > maxUnlockedStage) {
      scrollToStage(maxUnlockedStage, true)
      return
    }

    setStageIndex(Math.max(0, Math.min(next, STAGE_COUNT - 1)))
  }, [maxUnlockedStage, pageWidth, scrollToStage])

  const handleBack = useCallback(() => {
    if (stageIndex === 0) return
    scrollToStage(stageIndex - 1, true)
  }, [scrollToStage, stageIndex])

  const handleNext = useCallback(() => {
    if (stageIndex === 0 && !validateStageOne()) return
    if (stageIndex === 1 && !validateStageTwo()) return

    const next = Math.min(stageIndex + 1, STAGE_COUNT - 1)
    setMaxUnlockedStage((prev) => Math.max(prev, next))
    scrollToStage(next, true)
  }, [scrollToStage, stageIndex, validateStageOne, validateStageTwo])

  const addTag = useCallback((raw: string) => {
    const tag = raw.trim().toLowerCase()
    if (!tag || tags.includes(tag) || tags.length >= 5) return
    setTags((prev) => [...prev, tag])
    setTagInput('')
  }, [tags])

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }, [])

  const toggleSuggestion = useCallback((tag: string) => {
    const normalized = tag.toLowerCase()
    if (tags.includes(normalized)) {
      removeTag(normalized)
    } else if (tags.length < 5) {
      setTags((prev) => [...prev, normalized])
    }
  }, [removeTag, tags])

  const pickImage = useCallback(async (isBanner: boolean) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
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
  }, [])

  const playSuccessAnimation = useCallback((communityId: string) => {
    setShowSuccess(true)
    successScale.setValue(0.7)
    successOpacity.setValue(0)
    successRotate.setValue(0)

    Animated.sequence([
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          speed: 14,
          bounciness: 10,
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(successRotate, {
          toValue: 1,
          duration: 640,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(820),
      Animated.timing(successOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSuccess(false)
      router.replace(communityDetailPath(communityId, targetTab) as any)
    })
  }, [successOpacity, successRotate, successScale, targetTab])

  const handleCreate = useCallback(async () => {
    if (submitting) return

    if (!validateStageOne() || !validateStageTwo() || !validateStageThree()) return

    if (resolvedArtistId === null) {
      notifyValidationError('Unable to determine the artist for this community.')
      return
    }

    setSubmitting(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const token = await getToken()
      if (!token) {
        notifyValidationError('Authentication is required to create this community.')
        return
      }

      let finalBannerUrl: string | null = null
      let finalIconUrl: string | null = null

      if (bannerUri) {
        finalBannerUrl = await uploadCommunityMedia(token, bannerUri, 'image')
      }

      if (iconType === 'IMAGE' && iconUri) {
        finalIconUrl = await uploadCommunityMedia(token, iconUri, 'image')
      }

      const created = await apiPost<CommunityResDto>('/communities', token, {
        name: name.trim(),
        description: '',
        genre: resolvedArtistName,
        country: country.trim() || null,
        imageUrl: null,
        bannerUrl: finalBannerUrl,
        iconType,
        iconEmoji: iconType === 'EMOJI' ? extractFirstEmoji(iconEmoji) || null : null,
        iconUrl: finalIconUrl,
        tags,
        artistId: resolvedArtistId,
        visibility,
      })

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      playSuccessAnimation(created.id)
    } catch (err) {
      console.error('Create community error:', err)
      Alert.alert('Error', 'Failed to create community.')
    } finally {
      setSubmitting(false)
    }
  }, [
    bannerUri,
    country,
    getToken,
    iconEmoji,
    iconType,
    iconUri,
    name,
    notifyValidationError,
    playSuccessAnimation,
    resolvedArtistId,
    resolvedArtistName,
    submitting,
    tags,
    validateStageOne,
    validateStageThree,
    validateStageTwo,
    visibility,
  ])

  const stageTitle = stageIndex === 0
    ? 'Basics'
    : stageIndex === 1
      ? 'Visuals'
      : 'Tags & Visibility'

  const actionLabel = stageIndex === STAGE_COUNT - 1 ? 'Create' : 'Next'
  const actionDisabled = submitting || showSuccess

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <GlassSurface tinted={false} style={{ marginHorizontal: 16, marginTop: 12 }}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-on-surface-variant text-base">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-on-surface font-bold text-base">Create Community</Text>
          <View style={{ width: 42 }} />
        </View>
      </GlassSurface>

      <GlassSurface tinted={false} style={{ marginHorizontal: 16, marginTop: 10 }}>
        <View className="px-4 py-3">
          <Text className="text-on-surface text-base font-bold">{stageTitle}</Text>
        </View>
      </GlassSurface>

      <Animated.ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={handlePagerMomentumEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        contentOffset={{ x: stageIndex * pageWidth, y: 0 }}
        style={{ flex: 1, marginTop: 10 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ width: pageWidth }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 170, gap: 12 }}
        >
          <GlassSurface>
            <View className="px-4 py-3">
              <Text className="text-on-surface text-sm font-semibold mb-2">Community Name</Text>
              <TextInput
                className="text-on-surface text-base py-1"
                placeholder="Community name"
                placeholderTextColor={Colors.onSurfaceVariant}
                value={name}
                onChangeText={(t) => setName(t.slice(0, 60))}
                maxLength={60}
              />
              <Text className="text-xs text-on-surface-variant mt-1">{name.length}/60</Text>
            </View>
          </GlassSurface>

          <GlassSurface>
            <View className="px-4 py-3">
              <Text className="text-on-surface text-sm font-semibold mb-2">Country (optional)</Text>
              <TextInput
                className="text-on-surface text-base py-1"
                placeholder="e.g. United States"
                placeholderTextColor={Colors.onSurfaceVariant}
                value={country}
                onChangeText={setCountry}
              />
            </View>
          </GlassSurface>
        </ScrollView>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ width: pageWidth }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 170, gap: 12 }}
        >
          <GlassSurface isInteractive>
            <TouchableOpacity
              onPress={() => pickImage(true)}
              activeOpacity={0.8}
            >
              <View className="p-4">
                <Text className="text-on-surface text-sm font-semibold mb-3">Banner Image</Text>
                <View className="h-40 rounded-2xl overflow-hidden bg-black/20 items-center justify-center">
                  {bannerUri ? (
                    <>
                      <Image source={{ uri: bannerUri }} className="w-full h-full absolute" resizeMode="cover" />
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
                        <Text className={`font-semibold ${iconType === 'IMAGE' ? 'text-primary' : 'text-on-surface-variant'}`}>
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
                        <Text className={`font-semibold ${iconType === 'EMOJI' ? 'text-primary' : 'text-on-surface-variant'}`}>
                          Emoji
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassSurface>

              {iconType === 'IMAGE' ? (
                <GlassSurface isInteractive style={{ alignSelf: 'center' }}>
                  <TouchableOpacity
                    onPress={() => pickImage(false)}
                    activeOpacity={0.8}
                  >
                    <View className="w-24 h-24 rounded-full overflow-hidden items-center justify-center bg-black/20">
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
                    </View>
                  </TouchableOpacity>
                </GlassSurface>
              ) : (
                <GlassSurface style={{ alignSelf: 'center' }}>
                  <View className="w-24 h-24 rounded-full items-center justify-center">
                    <TextInput
                      className="text-5xl text-center"
                      placeholder="🙂"
                      value={iconEmoji}
                      onChangeText={(t) => setIconEmoji(extractFirstEmoji(t))}
                      autoCorrect={false}
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                  </View>
                </GlassSurface>
              )}
            </View>
          </GlassSurface>
        </ScrollView>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ width: pageWidth }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 170, gap: 12 }}
        >
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
                    maxLength={30}
                  />
                  <GlassSurface isInteractive>
                    <TouchableOpacity
                      onPress={() => addTag(tagInput)}
                      disabled={!tagInput.trim() || tags.length >= 5}
                      activeOpacity={0.8}
                    >
                      <View className="px-3 py-1.5">
                        <Text className={`${tagInput.trim() && tags.length < 5 ? 'text-primary' : 'text-on-surface-variant'} text-sm font-semibold`}>
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
                {TAG_SUGGESTIONS.filter((t) => !tags.includes(t.toLowerCase())).map((tag) => (
                  <GlassSurface key={tag} isInteractive>
                    <TouchableOpacity
                      onPress={() => toggleSuggestion(tag)}
                      disabled={tags.length >= 5}
                      activeOpacity={0.8}
                    >
                      <View className="px-3 py-1.5">
                        <Text className={`text-xs font-semibold ${tags.length >= 5 ? 'text-on-surface-variant/50' : 'text-on-surface-variant'}`}>
                          {tag}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </GlassSurface>
                ))}
              </View>
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
                      <TouchableOpacity
                        onPress={() => setVisibility(option.value)}
                        activeOpacity={0.8}
                      >
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
                          {active ? (
                            <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    </GlassSurface>
                  )
                })}
              </View>
            </View>
          </GlassSurface>
        </ScrollView>
      </Animated.ScrollView>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
        <GlassSurface tinted={false}>
          <View className="px-3 pt-3 pb-2">
            <View className="flex-row items-center justify-center gap-2">
              {Array.from({ length: STAGE_COUNT }).map((_, index) => {
                const active = index === stageIndex
                const complete = index < maxUnlockedStage
                const widthAnim = scrollX.interpolate({
                  inputRange: [
                    (index - 1) * pageWidth,
                    index * pageWidth,
                    (index + 1) * pageWidth,
                  ],
                  outputRange: [10, 24, 10],
                  extrapolate: 'clamp',
                })
                const opacityAnim = scrollX.interpolate({
                  inputRange: [
                    (index - 1) * pageWidth,
                    index * pageWidth,
                    (index + 1) * pageWidth,
                  ],
                  outputRange: [0.72, 1, 0.72],
                  extrapolate: 'clamp',
                })
                const scaleAnim = scrollX.interpolate({
                  inputRange: [
                    (index - 1) * pageWidth,
                    index * pageWidth,
                    (index + 1) * pageWidth,
                  ],
                  outputRange: [1, 1.06, 1],
                  extrapolate: 'clamp',
                })

                return (
                  <Animated.View
                    key={index}
                    style={{
                      width: widthAnim,
                      height: 10,
                      borderRadius: 999,
                      backgroundColor: active || complete ? Colors.primary : 'rgba(145, 110, 110, 0.42)',
                      borderWidth: active || complete ? 0 : 1,
                      borderColor: 'rgba(145, 110, 110, 0.52)',
                      opacity: opacityAnim,
                      transform: [{ scale: scaleAnim }],
                    }}
                  />
                )
              })}
            </View>
          </View>
        </GlassSurface>

        <View className="px-1 pt-2">
          <View className="flex-row gap-2">
            {stageIndex > 0 ? (
              <GlassSurface
                isInteractive
                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'rgba(255,255,255,0.96)' }}
              >
                <TouchableOpacity onPress={handleBack} activeOpacity={0.8}>
                  <View className="py-3 items-center">
                    <Text className="text-on-surface text-base font-semibold">Back</Text>
                  </View>
                </TouchableOpacity>
              </GlassSurface>
            ) : null}

            <GlassSurface
              isInteractive
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'rgba(255,255,255,0.96)' }}
            >
              <TouchableOpacity
                onPress={stageIndex === STAGE_COUNT - 1 ? handleCreate : handleNext}
                disabled={actionDisabled}
                activeOpacity={0.8}
              >
                <View className="py-3 items-center flex-row justify-center gap-2">
                  {submitting && stageIndex === STAGE_COUNT - 1 ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : null}
                  <Text className={`text-base font-bold ${actionDisabled ? 'text-on-surface-variant' : 'text-primary'}`}>
                    {stageIndex === STAGE_COUNT - 1 && submitting ? 'Creating...' : actionLabel}
                  </Text>
                </View>
              </TouchableOpacity>
            </GlassSurface>
          </View>
        </View>
      </View>

      {showSuccess ? (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center px-8">
          <Animated.View
            style={{
              opacity: successOpacity,
              transform: [
                { scale: successScale },
                {
                  rotate: successRotate.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['-8deg', '0deg'],
                  }),
                },
              ],
            }}
          >
            <GlassSurface>
              <View className="items-center px-8 py-7">
                <Ionicons name="checkmark-circle" size={64} color={Colors.primary} />
                <Text className="text-on-surface text-lg font-bold mt-3">Community Created</Text>
                <Text className="text-on-surface-variant text-sm mt-1 text-center">
                  Launching your new community...
                </Text>
              </View>
            </GlassSurface>
          </Animated.View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  )
}

function IOSCreateCommunitySheet() {
  const useGlass = isLiquidGlassAvailable()

  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.75],
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'slide_from_bottom',
        }}
      />
      {useGlass ? (
        <GlassView style={{ flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
          <CreateCommunityContent />
        </GlassView>
      ) : (
        <BlurView tint="systemMaterial" intensity={100} style={{ flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
          <CreateCommunityContent />
        </BlurView>
      )}
    </>
  )
}

function AndroidCreateCommunitySheet() {
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
          <CreateCommunityContent />
        </RNHostView>
      </ModalBottomSheet>
    </Host>
  )
}

export default function CreateCommunitySheet() {
  if (Platform.OS === 'android') {
    return <AndroidCreateCommunitySheet />
  }

  return <IOSCreateCommunitySheet />
}
