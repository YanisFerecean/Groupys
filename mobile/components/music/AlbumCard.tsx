import type { ReactNode } from 'react'
import { Image, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { Colors } from '@/constants/colors'

interface AlbumCardProps {
  title: string
  subtitle?: string
  artworkUrl?: string
  isMine?: boolean
  /** Optional track count / year line. */
  meta?: string
  actions?: ReactNode
}

/**
 * Presentational album card (chat × music plan, ticket 0.3). Wired with data in ticket 2.2.
 */
export function AlbumCard({ title, subtitle, artworkUrl, isMine = false, meta, actions }: AlbumCardProps) {
  return (
    <View
      className="w-72 rounded-2xl overflow-hidden"
      style={{ backgroundColor: isMine ? Colors.primaryContainer : Colors.surfaceContainerHigh }}
    >
      <View className="flex-row items-center p-3 gap-3">
        {artworkUrl ? (
          <Image source={{ uri: artworkUrl }} style={{ width: 56, height: 56, borderRadius: 8 }} />
        ) : (
          <View
            className="items-center justify-center"
            style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: Colors.surfaceContainerHighest }}
          >
            <Ionicons name="albums" size={22} color={Colors.onSurfaceVariant} />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-[11px] font-bold uppercase" style={{ color: isMine ? 'rgba(255,255,255,0.7)' : Colors.onSurfaceVariant }}>
            Album
          </Text>
          <Text className="text-[15px] font-semibold" numberOfLines={1} style={{ color: isMine ? Colors.onPrimary : Colors.onSurface }}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-[13px]" numberOfLines={1} style={{ color: isMine ? 'rgba(255,255,255,0.85)' : Colors.onSurfaceVariant }}>
              {subtitle}{meta ? ` · ${meta}` : ''}
            </Text>
          ) : null}
        </View>
      </View>
      {actions ? <View className="flex-row items-center gap-2 px-3 pb-3 pt-1">{actions}</View> : null}
    </View>
  )
}
