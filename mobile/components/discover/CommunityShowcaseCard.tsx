import { useRef } from 'react'
import { Animated, Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { SymbolView } from 'expo-symbols'
import { Link, type Href } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { communityResToCard } from '@/lib/communityUtils'
import { toAbsoluteUrl } from '@/lib/media'
import { formatCount } from '@/lib/timeAgo'
import type { CommunityResDto } from '@/models/CommunityRes'

interface Props {
  community: CommunityResDto
  href: Href
  replace?: boolean
  withAppleZoom?: boolean
}

function MetaPill({ icon, label }: { icon: string; label: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
      }}
    >
      <SymbolView name={icon} size={12} tintColor="rgba(255,255,255,0.9)" />
      <Text
        numberOfLines={1}
        style={{
          fontSize: 12,
          fontFamily: 'DMSans_500Medium',
          color: 'rgba(255,255,255,0.95)',
        }}
      >
        {label}
      </Text>
    </View>
  )
}

export default function CommunityShowcaseCard({
  community,
  href,
  replace = false,
  withAppleZoom = true,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current
  const communityCard = communityResToCard(community)
  const bannerUri = communityCard.bannerUrl ?? toAbsoluteUrl(community.imageUrl)
  const hasIconImage = community.iconType === 'IMAGE' && !!communityCard.iconUrl
  const hasIconEmoji = community.iconType === 'EMOJI' && !!community.iconEmoji
  const genreLabel = community.genre?.trim() || 'All genres'
  const description = community.description?.trim() || 'Join the conversation with fans of this artist.'
  const locationLabel = community.country?.trim()
  const tagLabel = community.tags?.find((tag) => tag.trim().length > 0)

  const handlePressIn = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start()
  }

  const card = (
    <Animated.View
      style={{
        width: '100%',
        aspectRatio: 1,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: communityCard.color,
        transform: [{ scale }],
      }}
    >
      {bannerUri ? (
        <Image
          source={{ uri: bannerUri }}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          contentFit="cover"
        />
      ) : (
        <LinearGradient
          colors={[communityCard.color, '#111827']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />
      )}

      <LinearGradient
        colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.82)']}
        locations={[0.35, 1]}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />

      <View style={{ position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View
          style={{
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: 'rgba(255,255,255,0.16)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.22)',
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontSize: 12,
              fontFamily: 'DMSans_600SemiBold',
              color: 'rgba(255,255,255,0.95)',
              textTransform: 'capitalize',
            }}
          >
            {genreLabel}
          </Text>
        </View>

        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.16)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.22)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {hasIconImage ? (
            <Image
              source={{ uri: communityCard.iconUrl }}
              style={{ width: 22, height: 22, borderRadius: 6 }}
              contentFit="cover"
            />
          ) : hasIconEmoji ? (
            <Text style={{ fontSize: 18 }}>{community.iconEmoji}</Text>
          ) : (
            <SymbolView name="person.2.fill" size={18} tintColor="white" />
          )}
        </View>
      </View>

      <View style={{ position: 'absolute', right: 16, left: 16, bottom: 16 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 28,
            lineHeight: 30,
            fontFamily: 'DMSans_700Bold',
            color: 'white',
            letterSpacing: -0.6,
          }}
        >
          {community.name}
        </Text>

        <Text
          numberOfLines={2}
          style={{
            marginTop: 6,
            fontSize: 13,
            lineHeight: 18,
            fontFamily: 'DMSans_400Regular',
            color: 'rgba(255,255,255,0.88)',
          }}
        >
          {description}
        </Text>

        <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <MetaPill icon="person.2.fill" label={`${formatCount(community.memberCount)} members`} />
          {locationLabel ? <MetaPill icon="mappin.and.ellipse" label={locationLabel} /> : null}
          {tagLabel ? <MetaPill icon="number" label={tagLabel} /> : null}
        </View>
      </View>
    </Animated.View>
  )

  const cardContent = withAppleZoom ? <Link.AppleZoom>{card}</Link.AppleZoom> : card

  return (
    <Link href={href} replace={replace} asChild>
      <Pressable
        className="w-full"
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {cardContent}
      </Pressable>
    </Link>
  )
}
