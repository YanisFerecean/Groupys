import { Ionicons } from '@expo/vector-icons'
import { Modal, Text, TouchableOpacity, View } from 'react-native'

import { Colors } from '@/constants/colors'
import { VOICE_BEDS, type VoiceBedOption } from '@/lib/voiceBeds'

interface BeatPickerProps {
  visible: boolean
  onClose: () => void
  onSelect: (bed: VoiceBedOption) => void
}

/** Picks an original bundled bed for a voice note (ticket 4.4). */
export function BeatPicker({ visible, onClose, onSelect }: BeatPickerProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View className="flex-1 bg-surface px-4 pt-4">
        <View className="mb-5 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-bold text-on-surface">Pick a backing beat</Text>
            <Text className="text-[13px] text-on-surface-variant">Original royalty-free beds</Text>
          </View>
          <TouchableOpacity onPress={onClose} className="p-1">
            <Ionicons name="close" size={24} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        <View className="gap-3">
          {VOICE_BEDS.map(bed => (
            <TouchableOpacity
              key={bed.id}
              activeOpacity={0.75}
              onPress={() => onSelect(bed)}
              className="flex-row items-center gap-3 rounded-2xl bg-surface-container p-4"
            >
              <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
                <Ionicons name="musical-notes" size={22} color={Colors.onPrimary} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-on-surface">{bed.title}</Text>
                <Text className="text-[13px] text-on-surface-variant">{bed.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          ))}
        </View>

        <Text className="mt-5 text-[12px] leading-5 text-on-surface-variant">
          Beds are bundled with Groupys and mixed locally. No streaming subscription is required.
        </Text>
      </View>
    </Modal>
  )
}
