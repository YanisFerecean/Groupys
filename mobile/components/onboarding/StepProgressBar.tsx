import { View } from 'react-native'

interface StepProgressBarProps {
  current: number
  total: number
}

export default function StepProgressBar({ current, total }: StepProgressBarProps) {
  return (
    <View className="flex-row gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={`h-1.5 flex-1 rounded-full ${
            i < current ? 'bg-primary' : 'bg-surface-container-high'
          }`}
        />
      ))}
    </View>
  )
}
