import { type ReactNode } from 'react'
import { View } from 'react-native'
import type { HomeTab } from '@/lib/profileRoutes'

type SwipeableTabScreenProps = {
  children: ReactNode
  tab: HomeTab
}

export default function SwipeableTabScreen({ children }: SwipeableTabScreenProps) {
  return <View style={{ flex: 1 }}>{children}</View>
}
