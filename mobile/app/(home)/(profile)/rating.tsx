import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { SymbolView } from 'expo-symbols'
import { Ionicons } from '@expo/vector-icons'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { BlurView } from 'expo-blur'
import { Stack, useLocalSearchParams, router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useAuth, useUser } from '@clerk/expo'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import {
  deleteAlbumRating,
  fetchAlbumRatings,
  upsertAlbumRating,
  type AlbumRatingRes,
} from '@/lib/api'

// Backend uses integer 1–10. UI uses 0.5 steps on a 1–5 scale.
function to5Star(backendScore: number): number {
  return backendScore / 2
}
function to10Scale(displayScore: number): number {
  return Math.round(displayScore * 2)
}

const SCORE_LABELS: Record<number, string> = {
  1: 'Dreadful', 2: 'Terrible', 3: 'Bad', 4: 'Poor', 5: 'Average',
  6: 'Fine', 7: 'Good', 8: 'Great', 9: 'Excellent', 10: 'Masterpiece',
}

function scoreColor(backendScore: number): string {
  if (backendScore >= 8) return Colors.tertiary
  if (backendScore >= 6) return Colors.primary
  if (backendScore >= 4) return Colors.secondary
  return '#ef4444'
}

// ─── Star display (read-only) ────────────────────────────────────────────────

function StarRow({
  displayScore,
  size = 14,
}: {
  displayScore: number
  size?: number
}) {
  const color = displayScore > 0 ? scoreColor(to10Scale(displayScore)) : Colors.outlineVariant
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => {
        const val = i + 1
        const filled = displayScore >= val
        const half = !filled && displayScore >= val - 0.5
        return (
          <SymbolView
            key={i}
            name={filled ? 'star.fill' : half ? 'star.leadinghalf.filled' : 'star'}
            size={size}
            tintColor={color}
          />
        )
      })}
    </View>
  )
}

// ─── Interactive star picker with swipe ──────────────────────────────────────

function InteractiveStarPicker({
  displayScore,
  onChange,
}: {
  displayScore: number
  onChange: (score: number) => void
}) {
  const containerRef = useRef<View>(null)
  const containerX = useRef(0)
  const containerWidth = useRef(0)
  const lastFiredScore = useRef(-1)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const handlePosition = useRef((pageX: number, isRelease = false) => {
    if (containerWidth.current === 0) return
    const relX = pageX - containerX.current
    const ratio = Math.max(0, Math.min(1, relX / containerWidth.current))
    const halfStars = Math.round(ratio * 5 * 2) / 2
    const newScore = Math.max(0.5, Math.min(5, halfStars))
    if (newScore !== lastFiredScore.current) {
      lastFiredScore.current = newScore
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      onChangeRef.current(newScore)
    }
    if (isRelease) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
  })

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => handlePosition.current(evt.nativeEvent.pageX),
      onPanResponderMove: (evt) => handlePosition.current(evt.nativeEvent.pageX),
      onPanResponderRelease: (evt) => handlePosition.current(evt.nativeEvent.pageX, true),
    }),
  )

  const filledColor = displayScore > 0 ? Colors.primary : Colors.outlineVariant
  const outlineColor = Colors.outlineVariant

  return (
    <View
      ref={containerRef}
      onLayout={() => {
        containerRef.current?.measure((_x, _y, width, _height, pageX) => {
          containerX.current = pageX
          containerWidth.current = width
        })
      }}
      {...panResponder.current.panHandlers}
      style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const val = i + 1
        const filled = displayScore >= val
        const half = !filled && displayScore >= val - 0.5
        return (
          <SymbolView
            key={i}
            name={filled ? 'star.fill' : half ? 'star.leadinghalf.filled' : 'star'}
            size={44}
            tintColor={filled || half ? filledColor : outlineColor}
          />
        )
      })}
    </View>
  )
}

// ─── Community rating row ─────────────────────────────────────────────────────

function RatingRow({ rating, isOwn }: { rating: AlbumRatingRes; isOwn: boolean }) {
  const date = new Date(rating.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const initial = ((rating.displayName ?? rating.username)[0] ?? '?').toUpperCase()
  const display5 = to5Star(rating.score)

  return (
    <View
      style={{
        borderRadius: 16,
        padding: 16,
        gap: 10,
        backgroundColor: isOwn ? 'rgba(186,0,43,0.06)' : Colors.surfaceContainerLow,
        borderWidth: 1,
        borderColor: isOwn ? 'rgba(186,0,43,0.25)' : Colors.outlineVariant,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {/* Left: User info */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {rating.profileImage ? (
            <Image
              source={{ uri: rating.profileImage }}
              style={{ width: 36, height: 36, borderRadius: 18 }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isOwn ? Colors.primary : Colors.surfaceContainerHighest,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: 'DMSans_700Bold',
                  color: isOwn ? 'white' : Colors.onSurfaceVariant,
                }}
              >
                {initial}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: Colors.onSurface }}
                numberOfLines={1}
              >
                {rating.displayName ?? rating.username}
              </Text>
              {isOwn && (
                <View
                  style={{
                    backgroundColor: 'rgba(186,0,43,0.12)',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: Colors.primary }}>
                    YOU
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: Colors.onSurfaceVariant, marginTop: 2 }}>
              {date}
            </Text>
          </View>
        </View>

        {/* Right: Rating display */}
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <StarRow displayScore={display5} size={13} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
            <Text
              style={{ fontSize: 16, fontFamily: 'DMSans_800ExtraBold', color: scoreColor(rating.score), fontVariant: ['tabular-nums'] }}
            >
              {display5.toFixed(1)}
            </Text>
            <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: Colors.outline }}>
              /5
            </Text>
          </View>
        </View>
      </View>
      {rating.review ? (
        <Text style={{ fontSize: 14, fontFamily: 'DMSans_400Regular', color: Colors.onSurfaceVariant, lineHeight: 20 }}>
          {rating.review}
        </Text>
      ) : null}
    </View>
  )
}

// ─── Rating content ──────────────────────────────────────────────────────────

function RatingContent() {
  const { albumId, albumTitle, albumCoverUrl, artistName, currentUserId, initialScore } =
    useLocalSearchParams<{
      albumId: string
      albumTitle: string
      albumCoverUrl: string
      artistName: string
      currentUserId: string
      initialScore?: string
    }>()

  const insets = useSafeAreaInsets()
  const { getToken } = useAuth()
  const { user } = useUser()
  const getTokenRef = useRef(getToken)

  const initialBackendScore = Number(initialScore)
  const hasInitialScore = Number.isFinite(initialBackendScore) && initialBackendScore > 0
  const initialDisplayScore = hasInitialScore ? to5Star(initialBackendScore) : 0

  const [activeTab, setActiveTab] = useState<'rate' | 'community'>('rate')
  const [displayScore, setDisplayScore] = useState(initialDisplayScore)
  const [review, setReview] = useState('')
  const [ratings, setRatings] = useState<AlbumRatingRes[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const currentUsername = (user?.username ?? '').trim().toLowerCase()
  const isCurrentUsersRating = useCallback((rating: AlbumRatingRes) => {
    if (currentUserId && rating.userId === currentUserId) {
      return true
    }
    if (!currentUsername || !rating.username) {
      return false
    }
    return rating.username.trim().toLowerCase() === currentUsername
  }, [currentUserId, currentUsername])

  const { myRating, otherRatings } = useMemo(() => {
    let own: AlbumRatingRes | null = null
    const others: AlbumRatingRes[] = []

    for (const rating of ratings) {
      if (!own && isCurrentUsersRating(rating)) {
        own = rating
      } else {
        others.push(rating)
      }
    }

    return { myRating: own, otherRatings: others }
  }, [isCurrentUsersRating, ratings])

  useEffect(() => {
    if (!albumId) return

    setActiveTab('rate')
    setDisplayScore(initialDisplayScore)
    setReview('')
    setRatings([])
    setError(null)

    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const token = await getTokenRef.current()
        const data = await fetchAlbumRatings(Number(albumId), token)
        if (cancelled) return
        setRatings(data)
        const mine = data.find(isCurrentUsersRating) ?? null
        if (mine) {
          setDisplayScore(to5Star(mine.score))
          setReview(mine.review ?? '')
        }
      } catch {
        // non-critical
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [albumId, initialDisplayScore, isCurrentUsersRating])

  const refreshRatings = async () => {
    if (!albumId) return
    const token = await getTokenRef.current()
    const updated = await fetchAlbumRatings(Number(albumId), token)
    setRatings(updated)
  }

  const handleSubmit = async () => {
    if (!albumId || displayScore === 0) return
    const backendScore = to10Scale(displayScore)
    setError(null)
    setSubmitting(true)
    try {
      const token = await getTokenRef.current()
      await upsertAlbumRating(
        {
          albumId: Number(albumId),
          albumTitle: albumTitle ?? '',
          albumCoverUrl: albumCoverUrl || null,
          artistName: artistName || null,
          score: backendScore,
          review: review.trim() || null,
        },
        token,
      )
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      await refreshRatings()
      router.back()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = () => {
    if (!myRating || !albumId) return
    Alert.alert('Delete Rating', 'Are you sure you want to delete your rating?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSubmitting(true)
          try {
            const token = await getTokenRef.current()
            await deleteAlbumRating(myRating.id, token)
            setDisplayScore(0)
            setReview('')
            await refreshRatings()
            router.back()
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete')
          } finally {
            setSubmitting(false)
          }
        },
      },
    ])
  }

  const communityCount = ratings.length
  const backendScore = to10Scale(displayScore)

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 36, paddingBottom: Math.max(insets.bottom, 20) + 16 }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        {albumCoverUrl ? (
          <Image
            source={{ uri: albumCoverUrl }}
            style={{ width: 80, height: 80, borderRadius: 16 }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{ width: 80, height: 80, borderRadius: 16, backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}
          >
            <SymbolView name="music.note" size={32} tintColor={Colors.onSurfaceVariant} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{ fontSize: 20, fontFamily: 'DMSans_700Bold', color: Colors.onSurface }}
            numberOfLines={1}
          >
            {albumTitle}
          </Text>
          <Text
            style={{ fontSize: 14, fontFamily: 'DMSans_400Regular', color: Colors.onSurfaceVariant, marginTop: 2 }}
            numberOfLines={1}
          >
            {artistName}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: Colors.outlineVariant, marginBottom: 20 }} />

      {/* Tab bar */}
      <View
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: Colors.outlineVariant,
          marginBottom: 20,
        }}
      >
        {[
          { key: 'rate' as const, label: 'Your Rating', icon: 'star' },
          { key: 'community' as const, label: 'Community', icon: 'people' },
        ].map(({ key, label, icon }) => {
          const isActive = activeTab === key
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 12,
                gap: 4,
                borderBottomWidth: isActive ? 2 : 0,
                borderBottomColor: Colors.primary,
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={icon as any}
                size={22}
                color={isActive ? Colors.primary : Colors.onSurfaceVariant}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: isActive ? 'DMSans_600SemiBold' : 'DMSans_500Medium',
                  color: isActive ? Colors.primary : Colors.onSurfaceVariant,
                }}
              >
                {key === 'community' && communityCount > 0
                  ? `${label} (${communityCount})`
                  : label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {activeTab === 'rate' ? (
        <View style={{ gap: 16 }}>
          {/* Star picker card */}
          <View
            style={{
              borderRadius: 20,
              padding: 16,
              gap: 12,
              backgroundColor: Colors.surfaceContainerLow,
              borderWidth: 1,
              borderColor: Colors.outlineVariant,
            }}
          >
            <InteractiveStarPicker displayScore={displayScore} onChange={setDisplayScore} />

            {displayScore > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text
                  style={{ fontSize: 36, fontFamily: 'DMSans_800ExtraBold', color: scoreColor(backendScore), fontVariant: ['tabular-nums'] }}
                >
                  {displayScore.toFixed(1)}
                </Text>
                <Text style={{ fontSize: 14, fontFamily: 'DMSans_400Regular', color: Colors.onSurfaceVariant }}>
                  /5 · {SCORE_LABELS[backendScore]}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 14, fontFamily: 'DMSans_400Regular', color: Colors.onSurfaceVariant }}>
                Swipe across the stars to rate
              </Text>
            )}
          </View>

          {/* Review */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontFamily: 'DMSans_500Medium', color: Colors.onSurfaceVariant }}>
              Review (optional)
            </Text>
            <TextInput
              value={review}
              onChangeText={setReview}
              placeholder="Share your thoughts..."
              placeholderTextColor={Colors.outline}
              multiline
              maxLength={2000}
              style={{
                borderRadius: 16,
                backgroundColor: Colors.surfaceContainer,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 14,
                fontFamily: 'DMSans_400Regular',
                minHeight: 80,
                textAlignVertical: 'top',
                color: Colors.onSurface,
                borderWidth: 1,
                borderColor: Colors.outlineVariant,
              }}
            />
            {review.length > 0 && (
              <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: Colors.onSurfaceVariant, textAlign: 'right' }}>
                {review.length}/2000
              </Text>
            )}
          </View>

          {/* Error */}
          {error && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
              }}
            >
              <SymbolView name="exclamationmark.circle.fill" size={16} tintColor="#ef4444" />
              <Text style={{ color: '#ef4444', fontSize: 13, fontFamily: 'DMSans_400Regular', flex: 1 }}>
                {error}
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, paddingBottom: 8 }}>
            {/* Submit button */}
            <TouchableOpacity
              onPress={() => void handleSubmit()}
              disabled={submitting || displayScore === 0}
              style={{
                flex: 1,
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: 'center',
                backgroundColor: displayScore === 0 ? Colors.surfaceContainerHigh : Colors.primary,
                opacity: submitting ? 0.6 : 1,
              }}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: 'DMSans_700Bold',
                    color: displayScore === 0 ? Colors.onSurfaceVariant : Colors.onPrimary,
                  }}
                >
                  {myRating ? 'Update Rating' : 'Submit Rating'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Delete button */}
            {myRating && (
              <TouchableOpacity
                onPress={handleDelete}
                disabled={submitting}
                style={{
                  borderRadius: 16,
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#ef4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 15, fontFamily: 'DMSans_600SemiBold', color: '#ef4444' }}>
                  Delete
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        // Community tab
        <View style={{ gap: 12, paddingBottom: 8 }}>
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : ratings.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: Colors.surfaceContainerHigh,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SymbolView name="star.fill" size={28} tintColor={Colors.onSurfaceVariant} />
              </View>
              <Text style={{ fontSize: 15, fontFamily: 'DMSans_500Medium', color: Colors.onSurface }}>
                No ratings yet
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: Colors.outline }}>
                Be the first to rate this album!
              </Text>
            </View>
          ) : (
            <>
              {myRating && <RatingRow rating={myRating} isOwn />}
              {otherRatings.map((r) => (
                <RatingRow key={r.id} rating={r} isOwn={false} />
              ))}
            </>
          )}
        </View>
      )}
    </ScrollView>
  )
}

// ─── iOS Form Sheet ──────────────────────────────────────────────────────────

function IOSRatingSheet() {
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
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
            <RatingContent />
          </KeyboardAvoidingView>
        </GlassView>
      ) : (
        <BlurView tint="systemMaterial" intensity={100} style={{ flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
            <RatingContent />
          </KeyboardAvoidingView>
        </BlurView>
      )}
    </>
  )
}

// ─── Android Modal Bottom Sheet ──────────────────────────────────────────────

function AndroidRatingSheet() {
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
          <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
            <RatingContent />
          </KeyboardAvoidingView>
        </RNHostView>
      </ModalBottomSheet>
    </Host>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function AlbumRatingSheet() {
  if (Platform.OS === 'android') {
    return <AndroidRatingSheet />
  }

  return <IOSRatingSheet />
}
