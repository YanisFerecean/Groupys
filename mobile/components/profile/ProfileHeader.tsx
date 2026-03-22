import { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import type { ProfileCustomization } from '@/models/ProfileCustomization'

// Preset gradients matching web app
const PRESET_GRADIENTS: { value: string; colors: [string, string, ...string[]] }[] = [
  {
    value: 'linear-gradient(135deg, #1a1c1d 0%, #2f3132 40%, #5d3f3f 100%)',
    colors: ['#1a1c1d', '#2f3132', '#5d3f3f'],
  },
  {
    value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    colors: ['#0f0c29', '#302b63', '#24243e'],
  },
  {
    value: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
    colors: ['#232526', '#414345'],
  },
  {
    value: 'linear-gradient(135deg, #200122 0%, #6f0000 100%)',
    colors: ['#200122', '#6f0000'],
  },
  {
    value: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    colors: ['#0f2027', '#203a43', '#2c5364'],
  },
  {
    value: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
    colors: ['#141e30', '#243b55'],
  },
]

const DEFAULT_GRADIENT: [string, string, string] = ['#1a1c1d', '#2f3132', '#5d3f3f']

function getBannerColors(bannerUrl?: string): [string, string, ...string[]] | null {
  if (!bannerUrl) return null
  const preset = PRESET_GRADIENTS.find((p) => p.value === bannerUrl)
  if (preset) return preset.colors
  if (bannerUrl.startsWith('linear-gradient') || bannerUrl.startsWith('radial-gradient')) {
    return DEFAULT_GRADIENT
  }
  // If it's a hex color, we don't return colors for LinearGradient, we handle it as a solid view
  return null
}

interface ProfileHeaderProps {
  profile: ProfileCustomization
  avatarUrl?: string | null
  displayName: string
  username: string
  memberYear?: number
  onEditPress: () => void
  onAvatarPress?: () => void
  isUploadingAvatar?: boolean
}

export default function ProfileHeader({
  profile,
  avatarUrl,
  displayName,
  username,
  memberYear,
  onEditPress,
  onAvatarPress,
  isUploadingAvatar = false,
}: ProfileHeaderProps) {
  const [avatarError, setAvatarError] = useState(false)
  const accentColor = profile.accentColor ?? Colors.primary
  const bannerColors = getBannerColors(profile.bannerUrl)
  const isBannerImage = profile.bannerUrl && !bannerColors
  const gradientColors = bannerColors ?? DEFAULT_GRADIENT

  return (
    <View>
      {/* Banner */}
      <View className="h-36 w-full overflow-hidden">
        {profile.bannerUrl?.startsWith('#') ? (
          <View style={{ flex: 1, backgroundColor: profile.bannerUrl }} />
        ) : isBannerImage ? (
          <Image
            source={{ uri: profile.bannerUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        )}
      </View>

      {/* Avatar + info */}
      <View className="px-5">
        {/* Avatar row */}
        <View className="flex-row items-end justify-between -mt-10 mb-3">
          {/* Avatar with camera overlay */}
          <TouchableOpacity
            onPress={onAvatarPress}
            activeOpacity={onAvatarPress ? 0.8 : 1}
            disabled={!onAvatarPress || isUploadingAvatar}
          >
            <View className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-surface bg-surface-container-high">
              {avatarUrl && !avatarError ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <View className="w-full h-full items-center justify-center">
                  <Ionicons name="person" size={32} color={Colors.onSurfaceVariant} />
                </View>
              )}
            </View>

            {/* Camera badge overlay */}
            {onAvatarPress && (
              <View
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full items-center justify-center"
                style={{ backgroundColor: accentColor }}
              >
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={14} color="#fff" />
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Edit button */}
          <TouchableOpacity
            onPress={onEditPress}
            className="flex-row items-center gap-1.5 px-4 py-2 rounded-2xl border"
            style={{ 
              borderColor: accentColor, 
              backgroundColor: 'rgba(0,0,0,0.03)' // Very subtle overlay
            }}
          >
            <Ionicons name="pencil-sharp" size={14} color={accentColor} />
            <Text className="text-sm font-bold" style={{ color: accentColor }}>
              Edit Profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* Name & bio */}
        {memberYear && (
          <Text className="text-xs text-on-surface-variant font-medium mb-1">
            Member since {memberYear}
          </Text>
        )}
        <Text
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: profile.nameColor ?? Colors.onSurface }}
        >
          {displayName}
        </Text>
        {username ? (
          <Text className="text-sm text-on-surface-variant mt-0.5">@{username}</Text>
        ) : null}
        {profile.bio ? (
          <Text className="text-sm text-on-surface-variant mt-2 leading-5">{profile.bio}</Text>
        ) : null}
        {profile.country ? (
          <View className="mt-2 self-start rounded-full px-3 py-1 bg-surface-container-high">
            <Text className="text-xs font-semibold text-on-surface-variant">{profile.country}</Text>
          </View>
        ) : null}

        {/* Stats */}
        <View className="flex-row gap-6 mt-4">
          <View>
            <Text className="text-lg font-bold" style={{ color: accentColor }}>
              —
            </Text>
            <Text className="text-xs uppercase tracking-wide text-on-surface-variant">
              Albums Rated
            </Text>
          </View>
          <View>
            <Text className="text-lg font-bold" style={{ color: accentColor }}>
              —
            </Text>
            <Text className="text-xs uppercase tracking-wide text-on-surface-variant">
              Communities
            </Text>
          </View>
          <View>
            <Text className="text-lg font-bold" style={{ color: accentColor }}>
              —
            </Text>
            <Text className="text-xs uppercase tracking-wide text-on-surface-variant">
              Check-ins
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}
