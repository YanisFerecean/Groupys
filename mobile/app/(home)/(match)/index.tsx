import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MatchCard from '@/components/match/MatchCard'
import InsightRow from '@/components/match/InsightRow'
import ActionButtons from '@/components/match/ActionButtons'
import { Colors } from '@/constants/colors'
import { matchProfiles } from '@/constants/mockData'

export default function MatchScreen() {
  const insets = useSafeAreaInsets()
  const [currentIndex, setCurrentIndex] = useState(0)
  const profile = matchProfiles[currentIndex]

  function handleSkip() {
    setCurrentIndex((i) => (i + 1) % matchProfiles.length)
  }

  function handleVibe() {
    setCurrentIndex((i) => (i + 1) % matchProfiles.length)
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Text className="text-4xl font-extrabold tracking-tighter text-primary">
            Match
          </Text>
          <TouchableOpacity>
            <Ionicons name="search" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Match Card */}
        <View className="px-5 pt-4">
          <MatchCard profile={profile} />
        </View>

        {/* Insights */}
        <View className="px-5 pt-5">
          <InsightRow
            similarArtists={profile.similarArtists}
            sharedGenres={profile.sharedGenres}
          />
        </View>

        {/* Action Buttons */}
        <View className="pt-6">
          <ActionButtons onSkip={handleSkip} onVibe={handleVibe} />
        </View>
      </ScrollView>
    </View>
  )
}
