import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import { musicalAffinities } from '@/constants/mockData'

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { signOut } = useAuth()

  const [invisible, setInvisible] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const [showTopArtists, setShowTopArtists] = useState(true)
  const [showMutual, setShowMutual] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)

    try {
      await signOut()
      router.replace('/(auth)/landing')
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: insets.top + 8 }}
        >
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={Colors.onSurface} />
            </TouchableOpacity>
            <Text className="text-2xl font-extrabold text-on-surface">
              Settings
            </Text>
          </View>
          <Text className="text-sm font-bold tracking-wider text-on-surface">
            Groupys
          </Text>
        </View>

        {/* Discoverability */}
        <View className="px-5 pt-8">
          <Text className="text-xl font-bold text-on-surface">
            Discoverability
          </Text>
          <Text className="mt-1 text-sm text-on-surface-variant">
            Control how others find your curator profile.
          </Text>

          <View className="mt-5 rounded-2xl bg-surface-container-lowest p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-surface-container-high">
                <Ionicons name="eye-off" size={22} color={Colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-on-surface">
                  Go Invisible
                </Text>
                <Text className="text-xs text-on-surface-variant">
                  Hide from discovery and matching
                </Text>
              </View>
              <Switch
                value={invisible}
                onValueChange={setInvisible}
                trackColor={{ true: Colors.primary }}
              />
            </View>
          </View>

          <View className="mt-3 rounded-2xl bg-surface-container-lowest p-4 gap-4">
            <ToggleRow
              icon="time"
              label="Show Listening History"
              value={showHistory}
              onToggle={setShowHistory}
            />
            <ToggleRow
              icon="star"
              label="Show Top Artists"
              value={showTopArtists}
              onToggle={setShowTopArtists}
            />
            <ToggleRow
              icon="people"
              label="Show Mutual Connections"
              value={showMutual}
              onToggle={setShowMutual}
            />
          </View>
        </View>



        {/* Musical Affinities */}
        <View className="px-5 pt-10">
          <Text className="mb-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            MUSICAL AFFINITIES
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {musicalAffinities.map((tag) => (
              <View
                key={tag.name}
                className={`rounded-full px-5 py-2.5 ${
                  tag.active
                    ? 'bg-primary'
                    : 'bg-surface-container-high'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    tag.active ? 'text-white' : 'text-on-surface'
                  }`}
                >
                  {tag.name}
                </Text>
              </View>
            ))}
            <TouchableOpacity className="rounded-full border border-outline-variant px-5 py-2.5">
              <Text className="text-sm font-medium text-primary">
                + Add Interest
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out */}
        <View className="px-5 pt-10">
          <TouchableOpacity
            className={`items-center rounded-2xl bg-red-50 py-4 ${isSigningOut ? 'opacity-70' : ''}`}
            onPress={handleSignOut}
            disabled={isSigningOut}
          >
            <View className="flex-row items-center gap-2">
              {isSigningOut ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Ionicons name="log-out-outline" size={20} color={Colors.primary} />
              )}
              <Text className="font-semibold text-primary">
                {isSigningOut ? 'Signing Out...' : 'Sign Out of Groupys'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

function ToggleRow({
  icon,
  label,
  value,
  onToggle,
}: {
  icon: string
  label: string
  value: boolean
  onToggle: (v: boolean) => void
}) {
  return (
    <View className="flex-row items-center gap-3">
      <Ionicons name={icon as any} size={20} color={Colors.onSurfaceVariant} />
      <Text className="flex-1 text-on-surface">{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: Colors.primary }}
      />
    </View>
  )
}
