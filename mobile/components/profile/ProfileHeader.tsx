import { Colors } from '@/constants/colors'
import type { ProfileCustomization } from '@/models/ProfileCustomization'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'

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
  return null
}

export interface ProfileHeaderProps {
  profile: ProfileCustomization
  avatarUrl?: string | null
  displayName: string
  username: string
  memberYear?: number | string
  communitiesCount: number
  postsCount: number
  followingCount?: number
  followersCount?: number
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
  followingCount = 0,
  followersCount = 0,
  onEditPress,
  onAvatarPress,
  isUploadingAvatar = false,
}: ProfileHeaderProps) {
  const [avatarError, setAvatarError] = useState(false)
  const [isBioExpanded, setIsBioExpanded] = useState(false)
  const accentColor = profile.accentColor ?? Colors.primary

  const bannerColors = getBannerColors(profile.bannerUrl)
  const isBannerImage = profile.bannerUrl && !bannerColors
  const gradientColors = bannerColors ?? DEFAULT_GRADIENT
  const bio = profile.bio?.trim() ?? ''

  // Bio truncation logic
  const bioPreview = bio.length > 60 ? bio.slice(0, 60) + '...' : bio
  const hasMoreBio = bio.length > 60
  const visibleBio = isBioExpanded || !hasMoreBio ? bio : bioPreview

  const joinedDateFormatted = useMemo(() => {
    if (!memberYear) return ''
    if (typeof memberYear === 'number') return `${memberYear}`
    try {
      const date = new Date(memberYear)
      return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)
    } catch {
      return memberYear
    }
  }, [memberYear])

  return (
    <View>
      {/* Banner */}
      <View className="h-44 w-full overflow-hidden justify-center items-center">
        {profile.bannerUrl?.startsWith('#') ? (
          <View className="absolute inset-0" style={{ backgroundColor: profile.bannerUrl }} />
        ) : isBannerImage ? (
          <Image
            source={{ uri: profile.bannerUrl }}
            style={{ width: '100%', height: '100%', position: 'absolute' }}
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        )}
        {profile.bannerText && (
          <Text
            className="text-white text-[38px] font-black italic tracking-tighter text-center px-8"
            style={{ lineHeight: 42 }}
          >
            {profile.bannerText}
          </Text>
        )}
      </View>

      {/* Profile Info Container */}
      <View className="px-5">
        {/* Avatar aligned left */}
        <View className="-mt-12 mb-4 items-start">
          <TouchableOpacity
            onPress={onAvatarPress}
            activeOpacity={onAvatarPress ? 0.8 : 1}
            disabled={!onAvatarPress || isUploadingAvatar}
          >
            <View
              className="w-[96px] h-[96px] rounded-full overflow-hidden bg-surface-container-high border-4"
              style={{ borderColor: Colors.surface }}
            >
              {avatarUrl && !avatarError ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <View className="w-full h-full items-center justify-center">
                  <Ionicons name="person" size={40} color={Colors.onSurfaceVariant} />
                </View>
              )}
            </View>

            {/* Camera badge overlay - adjusted for left alignment */}
            {onAvatarPress && (
              <View
                className="absolute bottom-1 right-1 w-7 h-7 rounded-full items-center justify-center border-2 border-surface"
                style={{ backgroundColor: accentColor }}
              >
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={12} color="#fff" />
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Name & Username */}
        <View className="flex-row items-center gap-2">
          <Text
            className="text-[28px] font-extrabold tracking-tight text-on-surface"
            style={{ color: profile.nameColor ?? Colors.onSurface }}
          >
            {displayName}
          </Text>
          {profile.isVerified && (
            <Ionicons name="checkmark-circle" size={20} color="#3897f0" />
          )}
        </View>
        {username ? (
          <Text className="text-[17px] font-medium text-on-surface-variant mt-0.5">@{username}</Text>
        ) : null}

        {/* Bio */}
        {bio ? (
          <View className="mt-4">
            <Text
              className="text-[16px] text-on-surface leading-6"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {visibleBio}
              {hasMoreBio && (
                <Text
                  onPress={() => setIsBioExpanded(!isBioExpanded)}
                  className="text-primary font-medium"
                >
                  {' '}{isBioExpanded ? 'Show less' : 'See more'}
                </Text>
              )}
            </Text>
          </View>
        ) : null}

        {/* Metadata section */}
        <View className="mt-4 gap-2.5">
          {profile.jobTitle && (
            <View className="flex-row items-center gap-2.5">
              <Ionicons name="briefcase-outline" size={20} color={Colors.onSurfaceVariant} />
              <Text className="text-[15px] text-on-surface-variant font-medium">{profile.jobTitle}</Text>
            </View>
          )}
          {profile.location && (
            <View className="flex-row items-center gap-2.5">
              <Ionicons name="location-outline" size={20} color={Colors.onSurfaceVariant} />
              <Text className="text-[15px] text-on-surface-variant font-medium">{profile.location}</Text>
            </View>
          )}
          {profile.website && (
            <View className="flex-row items-center gap-2.5">
              <Ionicons name="link-outline" size={20} color={Colors.onSurfaceVariant} />
              <Text className="text-[15px] text-primary font-medium">{profile.website}</Text>
            </View>
          )}
          <View className="flex-row items-center gap-2.5">
            <Ionicons name="calendar-outline" size={20} color={Colors.onSurfaceVariant} />
            <Text className="text-[15px] text-on-surface-variant font-medium">
              Joined {joinedDateFormatted}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.onSurfaceVariant} />
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row items-center gap-4 mt-5 mb-2">
          <TouchableOpacity className="flex-row items-center gap-1.5">
            <Text className="text-[16px] font-bold text-on-surface">{followingCount}</Text>
            <Text className="text-[16px] text-on-surface-variant">Following</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center gap-1.5">
            <Text className="text-[16px] font-bold text-on-surface">{followersCount}</Text>
            <Text className="text-[16px] text-on-surface-variant">Followers</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}
