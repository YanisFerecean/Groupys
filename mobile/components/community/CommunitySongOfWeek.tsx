import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Image, Text, TouchableOpacity, View } from 'react-native'

import { TrackPicker } from '@/components/music/TrackPicker'
import { Colors } from '@/constants/colors'
import { useAuthToken } from '@/hooks/useAuthToken'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'
import {
  fetchSongOfWeek,
  submitSongOfWeekCandidate,
  toggleSongOfWeekVote,
} from '@/lib/api'
import type { TrackPayload } from '@/models/ChatPayloads'
import type { SongOfWeekCandidate, SongOfWeekPoll } from '@/models/SongOfWeek'

interface CommunitySongOfWeekProps {
  communityId: string
  isMember: boolean
}

function CandidateRow({
  candidate,
  isMember,
  isPlaying,
  onPreview,
  onVote,
}: {
  candidate: SongOfWeekCandidate
  isMember: boolean
  isPlaying: boolean
  onPreview: () => void
  onVote: () => void
}) {
  return (
    <View className="flex-row items-center gap-3 py-2.5">
      {candidate.track.artworkUrl ? (
        <Image source={{ uri: candidate.track.artworkUrl }} style={{ width: 48, height: 48, borderRadius: 8 }} />
      ) : (
        <View className="h-12 w-12 items-center justify-center rounded-lg bg-surface-container-high">
          <Ionicons name="musical-note" size={19} color={Colors.onSurfaceVariant} />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-sm font-semibold text-on-surface" numberOfLines={1}>{candidate.track.title}</Text>
        <Text className="text-xs text-on-surface-variant" numberOfLines={1}>{candidate.track.artist}</Text>
      </View>
      <TouchableOpacity onPress={onPreview} className="h-9 w-9 items-center justify-center rounded-full bg-surface-container-high">
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color={Colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onVote}
        disabled={!isMember}
        className={`flex-row items-center gap-1 rounded-full px-3 py-2 ${candidate.votedByMe ? 'bg-primary' : 'bg-surface-container-high'}`}
        style={{ opacity: isMember ? 1 : 0.55 }}
      >
        <Ionicons name={candidate.votedByMe ? 'heart' : 'heart-outline'} size={15} color={candidate.votedByMe ? Colors.onPrimary : Colors.primary} />
        <Text className={`text-xs font-bold ${candidate.votedByMe ? 'text-on-primary' : 'text-primary'}`}>
          {candidate.voteCount}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

/** Weekly candidate list, reaction-style voting, and pinned winner recap (ticket 6.4). */
export function CommunitySongOfWeek({ communityId, isMember }: CommunitySongOfWeekProps) {
  const { refreshToken } = useAuthToken()
  const preview = usePreviewPlayer()
  const [poll, setPoll] = useState<SongOfWeekPoll | null>(null)
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const token = await refreshToken()
      if (!token) return
      setPoll(await fetchSongOfWeek(communityId, token))
    } catch (error) {
      console.error('Failed to load Song of the Week:', error)
    } finally {
      setLoading(false)
    }
  }, [communityId, refreshToken])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async (track: TrackPayload) => {
    setPickerOpen(false)
    try {
      const token = await refreshToken()
      if (!token) return
      setPoll(await submitSongOfWeekCandidate(communityId, token, track))
    } catch {
      Alert.alert('Song of the Week', 'Could not submit this track.')
    }
  }

  const vote = async (candidateId: string) => {
    try {
      const token = await refreshToken()
      if (!token) return
      setPoll(await toggleSongOfWeekVote(communityId, candidateId, token))
    } catch {
      Alert.alert('Song of the Week', 'Could not update your vote.')
    }
  }

  if (loading) {
    return <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
  }
  if (!poll) return null

  return (
    <View className="mx-5 mt-5 rounded-3xl bg-surface-container p-4">
      <View className="mb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-xs font-bold uppercase text-primary">Song of the Week</Text>
          <Text className="text-base font-bold text-on-surface">Vote for this week&apos;s track</Text>
        </View>
        {isMember ? (
          <TouchableOpacity onPress={() => setPickerOpen(true)} className="rounded-full bg-primary px-3 py-2">
            <Text className="text-xs font-bold text-on-primary">Add track</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {poll.pinnedWinner ? (
        <View className="mb-3 rounded-2xl bg-primary/10 p-3">
          <View className="flex-row items-center gap-1">
            <Ionicons name="pin" size={14} color={Colors.primary} />
            <Text className="text-xs font-bold uppercase text-primary">Pinned winner</Text>
          </View>
          <Text className="mt-1 text-sm font-bold text-on-surface">
            {poll.pinnedWinner.track.title} · {poll.pinnedWinner.track.artist}
          </Text>
          {poll.recap ? <Text className="mt-0.5 text-xs text-on-surface-variant">{poll.recap}</Text> : null}
        </View>
      ) : null}

      {poll.candidates.length === 0 ? (
        <Text className="py-4 text-center text-sm text-on-surface-variant">
          {isMember ? 'Be the first to nominate a track.' : 'No tracks nominated yet.'}
        </Text>
      ) : (
        poll.candidates.map(candidate => {
          const previewId = `song-week:${candidate.id}`
          return (
            <CandidateRow
              key={candidate.id}
              candidate={candidate}
              isMember={isMember}
              isPlaying={preview.isActive(previewId) && preview.isPlaying}
              onPreview={() => preview.toggle(previewId, candidate.track.previewUrl!)}
              onVote={() => void vote(candidate.id)}
            />
          )
        })
      )}

      {!isMember ? (
        <Text className="mt-2 text-center text-xs text-on-surface-variant">Join the community to nominate and vote.</Text>
      ) : null}

      <TrackPicker visible={pickerOpen} previewOnly onClose={() => setPickerOpen(false)} onSelect={submit} />
    </View>
  )
}
