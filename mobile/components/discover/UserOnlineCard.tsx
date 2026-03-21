import { useRef } from 'react'
import { Animated, Image, Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import type { DiscoverUser } from '@/constants/mockData'
import { Colors } from '@/constants/colors'

export default function UserOnlineCard({ user }: { user: DiscoverUser }) {
  const scale = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 4 }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start()
  }

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={{
          width: 136,
          height: 190,
          borderRadius: 20,
          backgroundColor: `${Colors.primary}0f`,
          borderWidth: 1,
          borderColor: `${Colors.outlineVariant}60`,
          padding: 14,
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }],
        }}
      >
        {/* Avatar + online dot */}
        <View style={{ position: 'relative', alignSelf: 'center' }}>
          <Image
            source={{ uri: user.image }}
            style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' }}
            resizeMode="cover"
          />
          <View
            style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: '#22c55e',
              borderWidth: 2.5,
              borderColor: Colors.surfaceContainerLow,
            }}
          />
        </View>

        {/* Name */}
        <Text
          style={{ color: Colors.onSurface, fontWeight: '800', fontSize: 14, textAlign: 'center', letterSpacing: -0.3 }}
          numberOfLines={1}
        >
          {user.name}
        </Text>

        {/* Now listening */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
          <Ionicons name="musical-note" size={11} color={Colors.primary} />
          <Text style={{ color: Colors.onSurfaceVariant, fontSize: 11, fontWeight: '500' }} numberOfLines={1}>
            {user.nowListening}
          </Text>
        </View>

        {/* Genre pills */}
        <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
          {user.genres.slice(0, 2).map((g) => (
            <View
              key={g}
              style={{
                backgroundColor: `${Colors.primary}22`,
                borderRadius: 99,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={{ color: Colors.primary, fontSize: 10, fontWeight: '700' }}>{g}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </Pressable>
  )
}
