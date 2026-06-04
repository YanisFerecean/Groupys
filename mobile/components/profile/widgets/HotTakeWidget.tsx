import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import {
  fetchCurrentHotTake,
  fetchMyHotTakeAnswer,
  fetchUserHotTakeAnswer,
  submitHotTakeAnswer,
} from '@/lib/hot-take-api'
import type { HotTakeAnswerRes, HotTakeRes } from '@/models/HotTake'
import HotTakePicker from '@/components/hottake/HotTakePicker'
import AnswerPicks from '@/components/hottake/AnswerPicks'
import type { HotTakePick } from '@/components/hottake/types'
import { Colors } from '@/constants/colors'

interface HotTakeWidgetProps {
  username: string
  isOwnProfile: boolean
  containerColor?: string
  textColor?: string
}

export default function HotTakeWidget({
  username,
  isOwnProfile,
  containerColor,
  textColor,
}: HotTakeWidgetProps) {
  const { getToken, isLoaded } = useAuth()
  const getTokenRef = useRef(getToken)
  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const [loading, setLoading] = useState(true)
  const [hotTake, setHotTake] = useState<HotTakeRes | null>(null)
  const [answer, setAnswer] = useState<HotTakeAnswerRes | null>(null)
  const [iAnswered, setIAnswered] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [picks, setPicks] = useState<HotTakePick[]>([])
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      const current = await fetchCurrentHotTake()
      setHotTake(current)
      if (!current) return
      const token = await getTokenRef.current()
      const userAnswer = await fetchUserHotTakeAnswer(username, token)
      setAnswer(userAnswer)
      if (isOwnProfile) {
        setIAnswered(Boolean(userAnswer))
      } else {
        const mine = await fetchMyHotTakeAnswer(token)
        setIAnswered(Boolean(mine))
      }
    } catch (err) {
      console.error('Failed to load hot take widget:', err)
    } finally {
      setLoading(false)
    }
  }, [isOwnProfile, username])

  useEffect(() => {
    if (!isLoaded) return
    load()
  }, [isLoaded, load])

  const handleSubmit = useCallback(async () => {
    if (!hotTake || picks.length !== hotTake.answerCount) return
    setSubmitting(true)
    try {
      const token = await getTokenRef.current()
      const saved = await submitHotTakeAnswer(
        hotTake.id,
        picks.map((p) => p.answer),
        picks.map((p) => p.imageUrl),
        picks.map((p) => p.musicType),
        true,
        token,
      )
      setIAnswered(true)
      if (isOwnProfile) setAnswer(saved)
      setModalOpen(false)
      setPicks([])
    } catch (err) {
      console.error('Failed to submit hot take answer:', err)
    } finally {
      setSubmitting(false)
    }
  }, [hotTake, isOwnProfile, picks])

  if (loading || !hotTake) return null

  const locked = !isOwnProfile && Boolean(answer) && !iAnswered
  const bg = containerColor ?? 'rgba(0,0,0,0.02)'

  return (
    <View className="rounded-[28px] p-5 gap-3" style={{ backgroundColor: bg }}>
      <View className="flex-row items-center gap-2">
        <Ionicons name="flame" size={16} color={Colors.primary} />
        <Text
          className="text-sm font-extrabold uppercase tracking-widest text-on-surface"
          style={{ color: textColor ?? undefined }}
        >
          Hot Take
        </Text>
        {answer && isOwnProfile ? (
          <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
        ) : null}
      </View>

      <Text className="text-base font-bold text-on-surface" style={{ color: textColor ?? undefined }}>
        {hotTake.question}
      </Text>

      {answer ? (
        <View className="relative">
          <AnswerPicks
            answers={answer.answers}
            imageUrls={answer.imageUrls}
            musicTypes={answer.musicTypes}
            thumbSize={88}
          />
          {locked ? (
            <TouchableOpacity
              onPress={() => setModalOpen(true)}
              activeOpacity={0.9}
              className="absolute inset-0 items-center justify-center rounded-2xl bg-surface/85"
            >
              <Ionicons name="lock-closed" size={22} color={Colors.onSurfaceVariant} />
              <Text className="mt-1 text-sm font-semibold text-on-surface-variant">
                Answer to reveal
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : isOwnProfile ? (
        <TouchableOpacity
          onPress={() => setModalOpen(true)}
          className="flex-row items-center justify-center gap-2 rounded-full bg-primary py-3"
        >
          <Text className="text-base font-bold text-on-primary">Answer now</Text>
        </TouchableOpacity>
      ) : (
        <Text className="text-sm italic text-on-surface-variant">No answer yet</Text>
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="gap-4 rounded-t-[28px] bg-surface p-5 pb-10">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Ionicons name="flame" size={18} color={Colors.primary} />
                <Text className="text-sm font-extrabold uppercase tracking-wider text-primary">
                  Hot Take{hotTake.weekLabel ? ` · ${hotTake.weekLabel}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <Text className="text-lg font-bold text-on-surface">{hotTake.question}</Text>
            <HotTakePicker
              answerType={hotTake.answerType}
              answerCount={hotTake.answerCount}
              onChange={setPicks}
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={picks.length !== hotTake.answerCount || submitting}
              className={`flex-row items-center justify-center gap-2 rounded-full py-3 ${
                picks.length === hotTake.answerCount && !submitting
                  ? 'bg-primary'
                  : 'bg-surface-container-high'
              }`}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <Text
                  className={`text-base font-bold ${
                    picks.length === hotTake.answerCount
                      ? 'text-on-primary'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {hotTake.answerCount > 1
                    ? `Submit my ${hotTake.answerCount} picks`
                    : 'Submit my pick'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
