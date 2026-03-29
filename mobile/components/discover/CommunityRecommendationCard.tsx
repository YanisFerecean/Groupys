import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useAuth } from '@clerk/expo'
import { useEffect, useRef, useState } from 'react'
import { Colors } from '@/constants/colors'
import { mediaUrl } from '@/lib/api'
import type { SuggestedCommunity } from '@/models/SuggestedCommunity'

function resolveMediaUrl(raw: string | null): string | null {
  if (!raw) return null
  // Strip legacy /api/posts/media/ prefix if present, then build full URL
  return mediaUrl(raw.replace(/^\/api\/posts\/media\//, ''))
}

interface AuthedImageProps {
  uri: string
  style?: object
}

function AuthedImage({ uri, style }: AuthedImageProps) {
  const { getToken } = useAuth()
  const [headers, setHeaders] = useState<Record<string, string> | undefined>(undefined)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    getToken().then((t) => {
      if (mounted.current && t) setHeaders({ Authorization: `Bearer ${t}` })
    })
    return () => { mounted.current = false }
  }, [getToken])

  if (!headers) return null

  return (
    <Image
      source={{ uri, headers }}
      style={[{ width: '100%', height: '100%' }, style]}
      contentFit="cover"
    />
  )
}

interface Props {
  community: SuggestedCommunity
  onJoin: () => void
  onDismiss: () => void
  onPress: () => void
}

export default function CommunityRecommendationCard({ community, onJoin, onDismiss, onPress }: Props) {
  const { width: screenWidth } = useWindowDimensions()
  const cardWidth = screenWidth * 0.72

  const handleJoin = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onJoin()
  }

  const handleDismiss = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onDismiss()
  }

  const bannerSrc = resolveMediaUrl(community.bannerUrl || community.imageUrl)
  // Profile images are Clerk CDN URLs — already absolute, no auth needed
  const creatorSrc = community.creatorProfileImage || null
  const creatorName = community.creatorDisplayName || community.creatorUsername

  const tags = [
    ...community.matchedGenres.slice(0, 2).map((g) => g.name),
    ...community.matchedArtists.slice(0, 1).map((a) => a.name),
  ].slice(0, 3)

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={{ width: cardWidth, borderRadius: 20, overflow: 'hidden' }}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.93}>
        {/* Banner */}
        <View style={{ height: 200, backgroundColor: Colors.surfaceContainerHigh }}>
          {bannerSrc && <AuthedImage uri={bannerSrc} />}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.78)']}
            locations={[0.3, 1]}
            style={{ position: 'absolute', inset: 0 }}
          />

          {/* Dismiss */}
          <TouchableOpacity
            onPress={handleDismiss}
            style={{
              position: 'absolute', top: 10, right: 10,
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: 'rgba(0,0,0,0.4)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={14} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>

          {/* Name + meta on banner */}
          <View style={{ position: 'absolute', bottom: 12, left: 14, right: 14, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {community.iconEmoji ? (
                <Text style={{ fontSize: 16 }}>{community.iconEmoji}</Text>
              ) : null}
              <Text
                style={{ color: '#fff', fontSize: 16, fontWeight: '800', flex: 1 }}
                numberOfLines={1}
              >
                {community.name}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="people" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' }}>
                  {community.memberCount.toLocaleString()}
                </Text>
              </View>
              {community.countryMatch && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="location" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' }}>
                    Near you
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Bottom strip */}
        <View style={{
          backgroundColor: Colors.surfaceContainerLow,
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 14,
          gap: 10,
        }}>
          {/* Creator row */}
          {creatorName && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              {creatorSrc ? (
                <Image
                  source={{ uri: creatorSrc }}
                  style={{ width: 20, height: 20, borderRadius: 10 }}
                  contentFit="cover"
                />
              ) : (
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: Colors.surfaceContainerHighest,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: Colors.onSurfaceVariant }}>
                    {creatorName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={{ fontSize: 12, color: Colors.onSurfaceVariant, fontWeight: '500' }} numberOfLines={1}>
                by {creatorName}
              </Text>
            </View>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
              {tags.map((tag) => (
                <View
                  key={tag}
                  style={{
                    backgroundColor: 'rgba(186,0,43,0.1)',
                    paddingHorizontal: 8, paddingVertical: 3,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '700' }}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Join CTA */}
          <TouchableOpacity
            onPress={handleJoin}
            style={{
              backgroundColor: Colors.primary,
              borderRadius: 50,
              paddingVertical: 11,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: Colors.onPrimary, fontWeight: '800', fontSize: 14 }}>
              Join
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}
