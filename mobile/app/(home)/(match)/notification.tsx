import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'

export default function MatchNotificationScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-5"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text className="font-bold text-on-surface">Vibe Match</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="flex-1 items-center justify-center px-8">
        {/* Avatar */}
        <View className="mb-6 h-28 w-28 items-center justify-center rounded-full border-4 border-outline-variant">
          <Image
            source="https://picsum.photos/seed/amara/200/200"
            style={{ width: 100, height: 100, borderRadius: 50 }}
            contentFit="cover"
          />
        </View>

        {/* Hearts */}
        <View className="mb-2 flex-row items-center gap-1">
          <Ionicons name="heart" size={16} color={Colors.primary} />
          <Ionicons name="heart" size={12} color={Colors.secondaryContainer} />
        </View>

        <Text className="text-xs font-bold uppercase tracking-widest text-primary">
          IT&apos;S A VIBE MATCH!
        </Text>

        <Text className="mt-4 text-center text-3xl font-extrabold tracking-tight text-on-surface">
          Say hello to
        </Text>
        <Text className="text-3xl font-extrabold tracking-tight text-primary">
          Amara
        </Text>

        <Text className="mt-4 text-center text-sm text-on-surface-variant">
          You both have &ldquo;Late Night Jazz&rdquo; and &ldquo;Desert Psych&rdquo; on repeat today.
        </Text>

        {/* Stats */}
        <View className="mt-8 flex-row gap-10">
          <View className="items-center">
            <Ionicons name="pulse" size={20} color={Colors.primary} />
            <Text className="mt-1 text-xs text-on-surface-variant">
              COMPATIBILITY
            </Text>
            <Text className="text-lg font-bold text-on-surface">94%</Text>
          </View>
          <View className="items-center">
            <Ionicons name="location" size={20} color={Colors.primary} />
            <Text className="mt-1 text-xs text-on-surface-variant">
              PROXIMITY
            </Text>
            <Text className="text-lg font-bold text-on-surface">2.4 mi</Text>
          </View>
        </View>

        {/* CTAs */}
        <View className="mt-10 w-full gap-3">
          <TouchableOpacity
            className="items-center rounded-2xl bg-primary py-4"
            onPress={() => router.push('/(home)/(match)/chat')}
          >
            <Text className="text-base font-semibold text-white">
              Say Hello!
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="items-center rounded-2xl bg-surface-container-high py-4"
            onPress={() => router.back()}
          >
            <Text className="text-base font-semibold text-on-surface">
              View Match Now!
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}
