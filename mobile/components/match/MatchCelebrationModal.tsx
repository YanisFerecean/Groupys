import { Modal, View, Text, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Colors } from '@/constants/colors'
import { useMatchStore } from '@/store/matchStore'

export default function MatchCelebrationModal() {
  const router = useRouter()
  const { pendingMatchModal, setPendingMatchModal } = useMatchStore()

  if (!pendingMatchModal) return null

  const handleStartChatting = () => {
    setPendingMatchModal(null)
    if (pendingMatchModal.conversationId) {
      router.push(`/(home)/(match)/chat/${pendingMatchModal.conversationId}`)
    }
  }

  const handleKeepSwiping = () => {
    setPendingMatchModal(null)
  }

  return (
    <Modal
      visible
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center bg-black/70 px-6">
        <View className="w-full rounded-3xl bg-surface px-6 py-8 items-center gap-6">
          {/* Match icon */}
          <View className="h-16 w-16 rounded-full bg-primary items-center justify-center">
            <Ionicons name="heart" size={32} color={Colors.onPrimary} />
          </View>

          <View className="items-center gap-2">
            <Text className="text-3xl font-extrabold tracking-tighter text-primary">
              It&apos;s a Match!
            </Text>
            <Text className="text-base text-on-surface-variant text-center">
              You and {pendingMatchModal.otherDisplayName ?? pendingMatchModal.otherUsername} both liked each other.
            </Text>
          </View>

          {/* Profile images side by side */}
          <View className="flex-row gap-4 items-center">
            {pendingMatchModal.otherProfileImage ? (
              <Image
                source={{ uri: pendingMatchModal.otherProfileImage }}
                style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: Colors.primary }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: Colors.primary }}
                className="bg-surface-container-high items-center justify-center"
              >
                <Ionicons name="person" size={36} color={Colors.onSurfaceVariant} />
              </View>
            )}
          </View>

          {/* CTA buttons */}
          <View className="w-full gap-3">
            <Pressable
              onPress={handleStartChatting}
              className="w-full rounded-full bg-primary py-4 items-center"
            >
              <Text className="text-on-primary font-bold text-base">Start Chatting</Text>
            </Pressable>
            <Pressable
              onPress={handleKeepSwiping}
              className="w-full rounded-full bg-surface-container-high py-4 items-center"
            >
              <Text className="text-on-surface font-semibold text-base">Keep Swiping</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}
