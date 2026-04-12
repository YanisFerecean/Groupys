import { useState } from 'react'
import { Alert, Platform, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'

import {
  connectMusic,
  disconnectMusic,
  getMusicDeveloperToken,
  getMusicErrorMessage,
} from '@/lib/api'
import {
  APPLE_MUSIC_CONNECT_ENABLED,
  APPLE_MUSIC_SIMULATOR_MOCK_ENABLED,
  getAppleMusicDevBuildMessage,
  getCapabilityStatus,
  getMusicUserToken,
  isAppleMusicNativeBridgeAvailable,
  requestAuthorization,
} from '@/lib/appleMusicAuth'

const AppleMusicIcon = ({ size, color }: { size: number; color: string }) => (
  <MaterialCommunityIcons name="apple" size={size} color={color} />
)

interface MusicConnectButtonProps {
  connected: boolean
  onConnect: () => void
  onDisconnect: () => void
}

export function MusicConnectButton({ connected, onConnect, onDisconnect }: MusicConnectButtonProps) {
  const { getToken } = useAuth()
  const [isBusy, setIsBusy] = useState(false)
  const useGlass = isLiquidGlassAvailable()

  const handleConnect = async () => {
    if (!APPLE_MUSIC_CONNECT_ENABLED) {
      Alert.alert('Apple Music', 'Apple Music connect is disabled in this build.')
      return
    }

    if (Platform.OS !== 'ios') {
      Alert.alert('Apple Music', 'Apple Music connect is currently available on iOS only. You can still curate music manually on Android.')
      return
    }

    if (!isAppleMusicNativeBridgeAvailable()) {
      Alert.alert('Apple Music', getAppleMusicDevBuildMessage())
      return
    }

    setIsBusy(true)
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Missing auth session. Please sign in again.')
      }

      // Simulator fallback for local development when real MusicKit auth is unavailable.
      if (__DEV__ && APPLE_MUSIC_SIMULATOR_MOCK_ENABLED) {
        await connectMusic(token, 'simulator_mock_user_token')
        onConnect()
        Alert.alert('Apple Music', 'Connected using simulator mock mode.')
        return
      }

      const developerTokenRes = await getMusicDeveloperToken(token)
      const authStatus = await requestAuthorization()

      if (authStatus !== 'authorized') {
        throw new Error('Apple Music permission was not granted.')
      }

      const capabilityStatus = await getCapabilityStatus()
      if (!capabilityStatus.musicCatalogPlayback) {
        throw new Error('This Apple account cannot access Music catalog playback.')
      }

      const musicUserToken = await getMusicUserToken(developerTokenRes.token)
      await connectMusic(token, musicUserToken)
      onConnect()
    } catch (error) {
      const message = getMusicErrorMessage(error, 'Failed to connect Apple Music.')
      Alert.alert('Apple Music', message)
    } finally {
      setIsBusy(false)
    }
  }

  const handleDisconnect = async () => {
    setIsBusy(true)
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Missing auth session. Please sign in again.')
      }

      await disconnectMusic(token)
      onDisconnect()
    } catch (error) {
      const message = getMusicErrorMessage(error, 'Failed to disconnect Apple Music.')
      Alert.alert('Apple Music', message)
    } finally {
      setIsBusy(false)
    }
  }

  const ctaDisabled = isBusy || !APPLE_MUSIC_CONNECT_ENABLED || Platform.OS !== 'ios'

  return (
    <View className="bg-surface-container rounded-xl p-4 flex-row items-center justify-between">
      <View className="flex-row items-center gap-3 flex-1 pr-3">
        <AppleMusicIcon size={28} color="#FA243C" />
        <View className="flex-1">
          <Text className="text-base font-semibold text-on-surface">Apple Music</Text>
          {!APPLE_MUSIC_CONNECT_ENABLED ? (
            <Text className="text-xs text-on-surface-variant mt-0.5">Disabled in this build</Text>
          ) : __DEV__ && APPLE_MUSIC_SIMULATOR_MOCK_ENABLED ? (
            <Text className="text-xs text-on-surface-variant mt-0.5">Simulator mock mode enabled</Text>
          ) : Platform.OS !== 'ios' ? (
            <Text className="text-xs text-on-surface-variant mt-0.5">iOS only right now</Text>
          ) : null}
        </View>
      </View>

      {connected ? (
        useGlass ? (
          <GlassView
            isInteractive
            style={{ borderRadius: 999, overflow: 'hidden' }}
          >
            <TouchableOpacity
              onPress={handleDisconnect}
              disabled={isBusy}
              className="px-3 py-1.5 rounded-full flex-row items-center gap-1"
              style={{ opacity: isBusy ? 0.6 : 1 }}
            >
              <Ionicons name="close-circle" size={16} color="#000" />
              <Text className="text-sm font-bold text-black">Disconnect</Text>
            </TouchableOpacity>
          </GlassView>
        ) : (
          <TouchableOpacity
            onPress={handleDisconnect}
            disabled={isBusy}
            className="bg-surface-container-high px-3 py-1.5 rounded-full flex-row items-center gap-1"
            style={{ opacity: isBusy ? 0.6 : 1 }}
          >
            <Ionicons name="close-circle" size={16} color="#000" />
            <Text className="text-sm font-bold text-black">Disconnect</Text>
          </TouchableOpacity>
        )
      ) : (
        useGlass ? (
          <GlassView
            isInteractive
            style={{ borderRadius: 999, overflow: 'hidden' }}
          >
            <TouchableOpacity
              onPress={handleConnect}
              disabled={ctaDisabled}
              className="px-4 py-2 rounded-full"
              style={{ opacity: ctaDisabled ? 0.5 : 1 }}
            >
              <Text className="text-sm font-bold text-black">{isBusy ? 'Connecting…' : 'Connect'}</Text>
            </TouchableOpacity>
          </GlassView>
        ) : (
          <TouchableOpacity
            onPress={handleConnect}
            disabled={ctaDisabled}
            className="bg-surface-container-high px-4 py-2 rounded-full"
            style={{ opacity: ctaDisabled ? 0.5 : 1 }}
          >
            <Text className="text-sm font-bold text-black">{isBusy ? 'Connecting…' : 'Connect'}</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  )
}
