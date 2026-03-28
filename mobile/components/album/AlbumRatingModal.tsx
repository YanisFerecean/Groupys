import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useAuth } from '@clerk/expo'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import type { TopAlbum } from '@/models/ProfileCustomization'
import GlassModalBackdrop from '@/components/ui/GlassModalBackdrop'
import {
  deleteAlbumRating,
  fetchAlbumRatings,
  upsertAlbumRating,
  type AlbumRatingRes,
} from '@/lib/api'

const SCORE_LABELS = [
  '', 'Terrible', 'Bad', 'Poor', 'Below Average',
  'Average', 'Fine', 'Good', 'Great', 'Excellent', 'Masterpiece',
]

function scoreColor(score: number): string {
  if (score >= 8) return Colors.tertiary
  if (score >= 6) return Colors.primary
  if (score >= 4) return Colors.secondary
  return '#ef4444'
}

interface AlbumRatingModalProps {
  visible: boolean
  onClose: () => void
  album: TopAlbum | null
  currentUserId?: string
  onRatingChange?: (albumId: number, score: number | null) => void
}

export default function AlbumRatingModal({
  visible,
  onClose,
  album,
  currentUserId,
  onRatingChange,
}: AlbumRatingModalProps) {
  const { height: screenHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)

  const [activeTab, setActiveTab] = useState<'rate' | 'community'>('rate')
  const [score, setScore] = useState(0)
  const [review, setReview] = useState('')
  const [ratings, setRatings] = useState<AlbumRatingRes[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const myRating = currentUserId ? (ratings.find((r) => r.userId === currentUserId) ?? null) : null

  useEffect(() => {
    if (!visible || !album?.id) return

    setActiveTab('rate')
    setScore(0)
    setReview('')
    setRatings([])
    setError(null)

    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const token = await getTokenRef.current()
        const data = await fetchAlbumRatings(album.id!, token)
        if (cancelled) return
        setRatings(data)
        const mine = currentUserId ? data.find((r) => r.userId === currentUserId) : null
        if (mine) {
          setScore(mine.score)
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
  }, [visible, album?.id, currentUserId])

  const handleStarPress = (star: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setScore(star)
  }

  const refreshRatings = async () => {
    if (!album?.id) return
    const token = await getTokenRef.current()
    const updated = await fetchAlbumRatings(album.id, token)
    setRatings(updated)
  }

  const handleSubmit = async () => {
    if (!album?.id || score === 0) return
    setError(null)
    setSubmitting(true)
    try {
      const token = await getTokenRef.current()
      await upsertAlbumRating(
        {
          albumId: album.id,
          albumTitle: album.title,
          albumCoverUrl: album.coverUrl ?? null,
          artistName: album.artist ?? null,
          score,
          review: review.trim() || null,
        },
        token,
      )
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      await refreshRatings()
      onRatingChange?.(album.id, score)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = () => {
    if (!myRating || !album?.id) return
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
            setScore(0)
            setReview('')
            await refreshRatings()
            onRatingChange?.(album.id!, null)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete')
          } finally {
            setSubmitting(false)
          }
        },
      },
    ])
  }

  const otherRatings = ratings.filter((r) => r.userId !== currentUserId)
  const communityCount = ratings.length

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <GlassModalBackdrop onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ maxHeight: screenHeight * 0.88 }}
        >
          <View
            className="rounded-t-[32px] bg-surface-container-lowest"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            {/* Drag handle */}
            <View className="items-center pt-3 pb-1">
              <View className="h-1.5 w-12 rounded-full bg-surface-container-highest" />
            </View>

            {/* Header */}
            <View className="flex-row items-center px-5 py-3 gap-3">
              {album?.coverUrl ? (
                <Image
                  source={{ uri: album.coverUrl }}
                  style={{ width: 56, height: 56, borderRadius: 12 }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{ width: 56, height: 56, borderRadius: 12 }}
                  className="bg-surface-container-high items-center justify-center"
                >
                  <Ionicons name="musical-notes" size={24} color={Colors.onSurfaceVariant} />
                </View>
              )}
              <View className="flex-1 min-w-0">
                <Text className="text-base font-bold text-on-surface" numberOfLines={1}>
                  {album?.title}
                </Text>
                <Text className="text-sm text-on-surface-variant" numberOfLines={1}>
                  {album?.artist}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="h-9 w-9 rounded-full bg-surface-container items-center justify-center"
              >
                <Ionicons name="close" size={18} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Tab bar */}
            <View className="flex-row mx-5 mb-4 rounded-2xl bg-surface-container p-1 gap-1">
              {(['rate', 'community'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  className="flex-1 rounded-xl py-2 items-center"
                  style={{
                    backgroundColor:
                      activeTab === tab ? Colors.surfaceContainerLowest : 'transparent',
                  }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{
                      color: activeTab === tab ? Colors.onSurface : Colors.onSurfaceVariant,
                    }}
                  >
                    {tab === 'rate'
                      ? 'Your Rating'
                      : `Community${communityCount > 0 ? ` (${communityCount})` : ''}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
            >
              {activeTab === 'rate' ? (
                <View className="gap-4">
                  {/* Star picker */}
                  <View className="gap-2">
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
                        <TouchableOpacity
                          key={star}
                          onPress={() => handleStarPress(star)}
                          style={{ padding: 6 }}
                          hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={star <= score ? 'star' : 'star-outline'}
                            size={26}
                            color={star <= score ? scoreColor(score) : Colors.onSurfaceVariant}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                    {score > 0 ? (
                      <View className="flex-row items-baseline gap-2">
                        <Text
                          className="text-2xl font-extrabold tabular-nums"
                          style={{ color: scoreColor(score) }}
                        >
                          {score}
                        </Text>
                        <Text className="text-sm text-on-surface-variant">
                          /10 · {SCORE_LABELS[score]}
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-sm text-on-surface-variant">Tap a star to rate</Text>
                    )}
                  </View>

                  {/* Review */}
                  <View className="gap-1.5">
                    <Text className="text-sm font-medium text-on-surface-variant">
                      Review (optional)
                    </Text>
                    <TextInput
                      value={review}
                      onChangeText={setReview}
                      placeholder="Share your thoughts…"
                      placeholderTextColor={Colors.outline}
                      multiline
                      maxLength={2000}
                      className="rounded-2xl bg-surface-container px-4 py-3 text-sm"
                      style={{
                        minHeight: 80,
                        textAlignVertical: 'top',
                        color: Colors.onSurface,
                      }}
                    />
                    {review.length > 0 && (
                      <Text className="text-xs text-on-surface-variant text-right">
                        {review.length}/2000
                      </Text>
                    )}
                  </View>

                  {/* Error */}
                  {error && (
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="alert-circle" size={16} color="#ef4444" />
                      <Text style={{ color: '#ef4444' }} className="text-sm flex-1">
                        {error}
                      </Text>
                    </View>
                  )}

                  {/* Buttons */}
                  <View className="flex-row gap-3 pb-2">
                    <TouchableOpacity
                      onPress={() => void handleSubmit()}
                      disabled={submitting || score === 0}
                      className="flex-1 rounded-2xl py-3.5 items-center"
                      style={{
                        backgroundColor:
                          score === 0 ? Colors.surfaceContainerHigh : Colors.primary,
                        opacity: submitting ? 0.6 : 1,
                      }}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color={Colors.onPrimary} />
                      ) : (
                        <Text
                          className="font-bold text-sm"
                          style={{
                            color: score === 0 ? Colors.onSurfaceVariant : Colors.onPrimary,
                          }}
                        >
                          {myRating ? 'Update Rating' : 'Submit Rating'}
                        </Text>
                      )}
                    </TouchableOpacity>
                    {myRating && (
                      <TouchableOpacity
                        onPress={handleDelete}
                        disabled={submitting}
                        className="rounded-2xl px-5 py-3.5 items-center border"
                        style={{ borderColor: Colors.outlineVariant }}
                      >
                        <Text className="font-semibold text-sm text-on-surface-variant">
                          Delete
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                // Community tab
                <View className="gap-3 pb-2">
                  {loading ? (
                    <View className="py-10 items-center">
                      <ActivityIndicator size="small" color={Colors.primary} />
                    </View>
                  ) : ratings.length === 0 ? (
                    <View className="py-10 items-center gap-2">
                      <Ionicons name="star-outline" size={32} color={Colors.onSurfaceVariant} />
                      <Text className="text-on-surface-variant text-sm">
                        No ratings yet — be the first!
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
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

function RatingRow({ rating, isOwn }: { rating: AlbumRatingRes; isOwn: boolean }) {
  const date = new Date(rating.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const initial = ((rating.displayName ?? rating.username)[0] ?? '?').toUpperCase()

  return (
    <View
      className="rounded-2xl p-4 gap-2"
      style={{
        backgroundColor: isOwn ? 'rgba(186,0,43,0.05)' : Colors.surfaceContainerLow,
        borderWidth: 1,
        borderColor: isOwn ? 'rgba(186,0,43,0.15)' : Colors.outlineVariant,
      }}
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2 flex-1 min-w-0">
          {rating.profileImage ? (
            <Image
              source={{ uri: rating.profileImage }}
              style={{ width: 32, height: 32, borderRadius: 16 }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{ width: 32, height: 32, borderRadius: 16 }}
              className="bg-surface-container-highest items-center justify-center"
            >
              <Text className="text-xs font-bold text-on-surface-variant">{initial}</Text>
            </View>
          )}
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-semibold text-on-surface" numberOfLines={1}>
              {rating.displayName ?? rating.username}
            </Text>
            <Text className="text-xs text-on-surface-variant">{date}</Text>
          </View>
        </View>
        <View className="flex-row items-baseline gap-0.5 shrink-0">
          <Text
            className="text-xl font-extrabold tabular-nums"
            style={{ color: scoreColor(rating.score) }}
          >
            {rating.score}
          </Text>
          <Text className="text-sm" style={{ color: Colors.outline }}>
            /10
          </Text>
        </View>
      </View>
      {rating.review ? (
        <Text className="text-sm text-on-surface-variant leading-relaxed">{rating.review}</Text>
      ) : null}
    </View>
  )
}
