import { Ionicons } from '@expo/vector-icons'
import { useAuth, useUser } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import { deleteMyAccount } from '@/lib/api'

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { signOut, getToken } = useAuth()
  const { user } = useUser()

  const [invisible, setInvisible] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const [showTopArtists, setShowTopArtists] = useState(true)
  const [showMutual, setShowMutual] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)

    try {
      await signOut()
      router.replace('/(auth)/landing')
    } finally {
      setIsSigningOut(false)
    }
  }

  async function handleDeleteAccount() {
    setIsDeletingAccount(true)

    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Missing auth token')
      }

      await deleteMyAccount(token)

      let authAccountDeleted = false
      if (user?.deleteSelfEnabled) {
        try {
          await user.delete()
          authAccountDeleted = true
        } catch (error) {
          console.error('Failed to delete Clerk auth account:', error)
        }
      }

      try {
        await signOut()
      } catch (error) {
        console.warn('Sign-out after account deletion failed:', error)
      }

      router.replace('/(auth)/landing')

      if (!authAccountDeleted && user?.deleteSelfEnabled) {
        Alert.alert(
          'Account data deleted',
          'Your Groupys data is deleted, but we could not fully remove your sign-in account. Please try again later.',
        )
      }
    } catch (error) {
      console.error('Failed to delete account:', error)
      Alert.alert('Delete account failed', 'We could not delete your account. Please try again.')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'This will permanently delete your Groupys account and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            void handleDeleteAccount()
          },
        },
      ],
    )
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
          <Text className="text-2xl font-extrabold tracking-wider" style={{ color: Colors.primary }}>
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



        {/* Sign Out */}
        <View className="px-5 pt-10">
          <TouchableOpacity
            className={`items-center rounded-2xl bg-red-50 py-4 ${isSigningOut ? 'opacity-70' : ''}`}
            onPress={handleSignOut}
            disabled={isSigningOut || isDeletingAccount}
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

          <TouchableOpacity
            className={`mt-3 items-center rounded-2xl border border-red-200 bg-white py-4 ${isDeletingAccount ? 'opacity-70' : ''}`}
            onPress={confirmDeleteAccount}
            disabled={isSigningOut || isDeletingAccount}
          >
            <View className="flex-row items-center gap-2">
              {isDeletingAccount ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Ionicons name="trash-outline" size={20} color={Colors.primary} />
              )}
              <Text className="font-semibold text-primary">
                {isDeletingAccount ? 'Deleting Account...' : 'Delete Account Permanently'}
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
