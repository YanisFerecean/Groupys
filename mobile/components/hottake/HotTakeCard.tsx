import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import {
  fetchCurrentHotTake,
  fetchFriendsHotTakeAnswers,
  fetchMyHotTakeAnswer,
  submitHotTakeAnswer,
} from '@/lib/hot-take-api'
import type { HotTakeAnswerRes, HotTakeRes } from '@/models/HotTake'
import HotTakePicker from '@/components/hottake/HotTakePicker'
import AnswerPicks from '@/components/hottake/AnswerPicks'
import type { HotTakePick } from '@/components/hottake/types'
import { Colors } from '@/constants/colors'

export default function HotTakeCard() {
  const { getToken, isLoaded } = useAuth()
  const getTokenRef = useRef(getToken)
  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const [loading, setLoading] = useState(true)
  const [hotTake, setHotTake] = useState<HotTakeRes | null>(null)
  const [myAnswer, setMyAnswer] = useState<HotTakeAnswerRes | null>(null)
  const [editing, setEditing] = useState(false)
  const [picks, setPicks] = useState<HotTakePick[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [friends, setFriends] = useState<HotTakeAnswerRes[]>([])
  const [showFriends, setShowFriends] = useState(false)

  const load = useCallback(async () => {
    try {
      const current = await fetchCurrentHotTake()
      setHotTake(current)
      if (!current) return
      const token = await getTokenRef.current()
      const mine = await fetchMyHotTakeAnswer(token)
      setMyAnswer(mine)
      if (mine) {
        setFriends(await fetchFriendsHotTakeAnswers(token))
      }
    } catch (err) {
      console.error('Failed to load hot take:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    load()
  }, [isLoaded, load])

  const handleSubmit = useCallback(async () => {
    if (!hotTake || picks.length !== hotTake.answerCount) return
    setSubmitting(true)
    try {
      const token = await getTokenRef.current()
      const answer = await submitHotTakeAnswer(
        hotTake.id,
        picks.map((p) => p.answer),
        picks.map((p) => p.imageUrl),
        picks.map((p) => p.musicType),
        true,
        token,
      )
      setMyAnswer(answer)
      setEditing(false)
      setPicks([])
      setFriends(await fetchFriendsHotTakeAnswers(token))
      setShowFriends(true)
    } catch (err) {
      console.error('Failed to submit hot take answer:', err)
    } finally {
      setSubmitting(false)
    }
  }, [hotTake, picks])

  if (loading || !hotTake) return null

  const answered = Boolean(myAnswer) && !editing
  const canSubmit = picks.length === hotTake.answerCount && !submitting

  return (
    <View className="mx-4 mb-4 overflow-hidden rounded-[28px] bg-surface-container-low">
      {/* Header */}
      <View className="flex-row items-center gap-2 bg-primary px-5 py-3">
        <Ionicons name="flame" size={18} color={Colors.onPrimary} />
        <Text className="flex-1 text-sm font-extrabold uppercase tracking-wider text-on-primary">
          Hot Take{hotTake.weekLabel ? ` · ${hotTake.weekLabel}` : ''}
        </Text>
        {answered ? <Ionicons name="checkmark-circle" size={20} color={Colors.onPrimary} /> : null}
      </View>

      <View className="gap-4 p-5">
        <Text className="text-lg font-bold text-on-surface">{hotTake.question}</Text>

        {answered && myAnswer ? (
          <View className="gap-4">
            <AnswerPicks
              answers={myAnswer.answers}
              imageUrls={myAnswer.imageUrls}
              musicTypes={myAnswer.musicTypes}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setPicks([])
                  setEditing(true)
                }}
                className="flex-row items-center gap-1 self-start rounded-full bg-surface-container-high px-4 py-2"
              >
                <Ionicons name="pencil" size={14} color={Colors.onSurface} />
                <Text className="text-sm font-semibold text-on-surface">Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Friends' picks */}
            <TouchableOpacity
              onPress={() => setShowFriends((v) => !v)}
              className="flex-row items-center gap-1"
            >
              <Text className="text-sm font-semibold text-primary">
                {`Friends' picks${friends.length ? ` (${friends.length})` : ''}`}
              </Text>
              <Ionicons
                name={showFriends ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.primary}
              />
            </TouchableOpacity>
            {showFriends ? (
              friends.length ? (
                <View className="gap-4">
                  {friends.map((friend) => (
                    <View key={friend.id} className="gap-2">
                      <View className="flex-row items-center gap-2">
                        {friend.profileImage ? (
                          <Image
                            source={{ uri: friend.profileImage }}
                            style={{ width: 24, height: 24, borderRadius: 12 }}
                            contentFit="cover"
                          />
                        ) : (
                          <View className="h-6 w-6 rounded-full bg-surface-container-high" />
                        )}
                        <Text className="text-sm font-semibold text-on-surface">
                          {friend.displayName || friend.username}
                        </Text>
                      </View>
                      <AnswerPicks
                        answers={friend.answers}
                        imageUrls={friend.imageUrls}
                        musicTypes={friend.musicTypes}
                        thumbSize={64}
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-sm text-on-surface-variant">
                  None of your friends have answered yet.
                </Text>
              )
            ) : null}
          </View>
        ) : (
          <View className="gap-4">
            <HotTakePicker
              answerType={hotTake.answerType}
              answerCount={hotTake.answerCount}
              onChange={setPicks}
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit}
              className={`flex-row items-center justify-center gap-2 rounded-full py-3 ${
                canSubmit ? 'bg-primary' : 'bg-surface-container-high'
              }`}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <Text
                  className={`text-base font-bold ${
                    canSubmit ? 'text-on-primary' : 'text-on-surface-variant'
                  }`}
                >
                  {hotTake.answerCount > 1
                    ? `Submit my ${hotTake.answerCount} picks`
                    : 'Submit my pick'}
                </Text>
              )}
            </TouchableOpacity>
            {myAnswer ? (
              <TouchableOpacity onPress={() => setEditing(false)} className="self-center">
                <Text className="text-sm font-medium text-on-surface-variant">Cancel</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>
    </View>
  )
}
