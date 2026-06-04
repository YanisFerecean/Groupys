import { useEffect, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useAuth } from '@clerk/expo'
import { searchTracks } from '@/lib/musicSearch'
import PreviewPlayButton from '@/components/hottake/PreviewPlayButton'
import { isUserType } from '@/components/hottake/types'

interface AnswerPicksProps {
  answers: string[]
  imageUrls: (string | null)[]
  musicTypes: (string | null)[]
  presetPreviews?: (string | null | undefined)[]
  thumbSize?: number
}

export default function AnswerPicks({
  answers,
  imageUrls,
  musicTypes,
  presetPreviews,
  thumbSize = 96,
}: AnswerPicksProps) {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const [previews, setPreviews] = useState<Record<number, string>>({})

  useEffect(() => {
    let cancelled = false
    const resolve = async () => {
      const token = await getTokenRef.current()
      for (let i = 0; i < answers.length; i++) {
        if (musicTypes[i]?.toUpperCase() !== 'SONG') continue
        const preset = presetPreviews?.[i]
        if (preset) {
          setPreviews((prev) => ({ ...prev, [i]: preset }))
          continue
        }
        try {
          const results = await searchTracks(answers[i], token, 5)
          const match =
            results.find((r) => r.title.toLowerCase() === answers[i].toLowerCase()) ?? results[0]
          if (match?.preview && !cancelled) {
            setPreviews((prev) => ({ ...prev, [i]: match.preview as string }))
          }
        } catch {
          // ignore preview resolution failures
        }
      }
    }
    void resolve()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers.join('|'), musicTypes.join('|')])

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12 }}
    >
      {answers.map((answer, index) => {
        const round = isUserType(musicTypes[index]) || musicTypes[index]?.toUpperCase() === 'ARTIST'
        const radius = round ? thumbSize / 2 : 16
        const preview = previews[index]
        const image = imageUrls[index]
        return (
          <View key={`${answer}-${index}`} style={{ width: thumbSize }}>
            <View
              style={{ width: thumbSize, height: thumbSize, borderRadius: radius }}
              className="overflow-hidden bg-surface-container-high relative"
            >
              {image ? (
                <Image source={{ uri: image }} style={{ flex: 1 }} contentFit="cover" />
              ) : null}
              {preview ? <PreviewPlayButton url={preview} size={32} /> : null}
            </View>
            <Text
              className="mt-2 text-center text-xs font-semibold text-on-surface"
              numberOfLines={1}
            >
              {answer}
            </Text>
          </View>
        )
      })}
    </ScrollView>
  )
}
