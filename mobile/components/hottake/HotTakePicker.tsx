import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { searchAlbums, searchArtists, searchTracks } from '@/lib/musicSearch'
import { searchCommunities } from '@/lib/api'
import { searchUsers } from '@/lib/chat-api'
import { Colors } from '@/constants/colors'
import { answerTypeNoun, isUserType, type HotTakePick } from '@/components/hottake/types'

interface ResultRow {
  key: string
  title: string
  subtitle?: string
  imageUrl: string | null
  pick: HotTakePick
}

interface HotTakePickerProps {
  answerType: string
  answerCount: number
  onChange: (picks: HotTakePick[]) => void
}

export default function HotTakePicker({ answerType, answerCount, onChange }: HotTakePickerProps) {
  const type = answerType.toUpperCase()
  const isFreeText = type === 'FREETEXT'
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const [picks, setPicks] = useState<HotTakePick[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ResultRow[]>([])
  const [searching, setSearching] = useState(false)

  const updatePicks = useCallback(
    (next: HotTakePick[]) => {
      setPicks(next)
      onChange(next)
    },
    [onChange],
  )

  const runSearch = useCallback(
    async (text: string) => {
      if (isFreeText) return
      if (text.trim().length < 2) {
        setResults([])
        return
      }
      setSearching(true)
      try {
        const token = await getTokenRef.current()
        let rows: ResultRow[] = []
        if (type === 'ARTIST') {
          rows = (await searchArtists(text, token, 8)).map((a) => ({
            key: `artist-${a.id}`,
            title: a.name,
            imageUrl: a.imageUrl ?? null,
            pick: { answer: a.name, imageUrl: a.imageUrl ?? null, musicType: 'ARTIST' },
          }))
        } else if (type === 'ALBUM') {
          rows = (await searchAlbums(text, token, 8)).map((a) => ({
            key: `album-${a.id}`,
            title: a.title,
            subtitle: a.artist,
            imageUrl: a.coverUrl ?? null,
            pick: { answer: a.title, imageUrl: a.coverUrl ?? null, musicType: 'ALBUM' },
          }))
        } else if (type === 'SONG') {
          rows = (await searchTracks(text, token, 8)).map((t) => ({
            key: `song-${t.id}`,
            title: t.title,
            subtitle: t.artist,
            imageUrl: t.coverUrl ?? null,
            pick: {
              answer: t.title,
              imageUrl: t.coverUrl ?? null,
              musicType: 'SONG',
              preview: t.preview ?? null,
            },
          }))
        } else if (type === 'USER') {
          rows = (await searchUsers(text, token, 8)).map((u) => ({
            key: `user-${u.id}`,
            title: u.displayName || u.username,
            subtitle: `@${u.username}`,
            imageUrl: u.profileImage ?? null,
            pick: {
              answer: u.displayName || u.username,
              imageUrl: u.profileImage ?? null,
              musicType: 'USER',
            },
          }))
        } else if (type === 'COMMUNITY') {
          rows = (await searchCommunities(text, token)).map((c) => ({
            key: `community-${c.id}`,
            title: c.name,
            imageUrl: c.iconUrl ?? c.imageUrl ?? null,
            pick: {
              answer: c.name,
              imageUrl: c.iconUrl ?? c.imageUrl ?? null,
              musicType: 'COMMUNITY',
            },
          }))
        }
        setResults(rows)
      } catch (err) {
        console.error('Hot take search failed:', err)
        setResults([])
      } finally {
        setSearching(false)
      }
    },
    [isFreeText, type],
  )

  useEffect(() => {
    if (isFreeText) return
    const handle = setTimeout(() => runSearch(query), 300)
    return () => clearTimeout(handle)
  }, [query, runSearch, isFreeText])

  const addPick = useCallback(
    (pick: HotTakePick) => {
      if (picks.length >= answerCount) return
      updatePicks([...picks, pick])
      setQuery('')
      setResults([])
    },
    [answerCount, picks, updatePicks],
  )

  const removePick = useCallback(
    (index: number) => {
      updatePicks(picks.filter((_, i) => i !== index))
    },
    [picks, updatePicks],
  )

  const addFreeText = useCallback(() => {
    const text = query.trim()
    if (!text || picks.length >= answerCount) return
    updatePicks([...picks, { answer: text, imageUrl: null, musicType: null }])
    setQuery('')
  }, [answerCount, picks, query, updatePicks])

  const canAddMore = picks.length < answerCount
  const round = isUserType(type) || type === 'ARTIST'

  return (
    <View className="gap-3">
      {answerCount > 1 ? (
        <Text className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          {`Pick ${Math.min(picks.length + (canAddMore ? 1 : 0), answerCount)} of ${answerCount}`}
        </Text>
      ) : null}

      {picks.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {picks.map((pick, index) => (
            <View
              key={`${pick.answer}-${index}`}
              className="flex-row items-center gap-2 rounded-full bg-surface-container-high py-1 pl-1 pr-2"
            >
              {pick.imageUrl ? (
                <Image
                  source={{ uri: pick.imageUrl }}
                  style={{ width: 28, height: 28, borderRadius: round ? 14 : 6 }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{ width: 28, height: 28, borderRadius: round ? 14 : 6 }}
                  className="bg-surface-container-highest"
                />
              )}
              <Text className="max-w-[140px] text-sm font-medium text-on-surface" numberOfLines={1}>
                {pick.answer}
              </Text>
              <TouchableOpacity onPress={() => removePick(index)} hitSlop={6}>
                <Ionicons name="close-circle" size={18} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      {canAddMore ? (
        <View className="gap-2">
          <View className="flex-row items-center gap-2 rounded-2xl bg-surface-container-high px-3">
            <Ionicons
              name={isFreeText ? 'create-outline' : 'search'}
              size={18}
              color={Colors.onSurfaceVariant}
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={isFreeText ? 'Type your answer…' : `Search ${answerTypeNoun(type)}…`}
              placeholderTextColor={Colors.onSurfaceVariant}
              className="flex-1 py-3 text-base text-on-surface"
              returnKeyType={isFreeText ? 'done' : 'search'}
              onSubmitEditing={isFreeText ? addFreeText : undefined}
            />
            {isFreeText ? (
              <TouchableOpacity onPress={addFreeText} disabled={!query.trim()} hitSlop={6}>
                <Ionicons
                  name="add-circle"
                  size={22}
                  color={query.trim() ? Colors.primary : Colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            ) : searching ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : null}
          </View>

          {!isFreeText && results.length > 0 ? (
            <View className="gap-1 rounded-2xl bg-surface-container-low p-1">
              {results.map((row) => (
                <TouchableOpacity
                  key={row.key}
                  onPress={() => addPick(row.pick)}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-3 rounded-xl px-2 py-2"
                >
                  {row.imageUrl ? (
                    <Image
                      source={{ uri: row.imageUrl }}
                      style={{ width: 40, height: 40, borderRadius: round ? 20 : 8 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={{ width: 40, height: 40, borderRadius: round ? 20 : 8 }}
                      className="bg-surface-container-highest"
                    />
                  )}
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-on-surface" numberOfLines={1}>
                      {row.title}
                    </Text>
                    {row.subtitle ? (
                      <Text className="text-xs text-on-surface-variant" numberOfLines={1}>
                        {row.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
