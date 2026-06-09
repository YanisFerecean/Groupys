import type { ReactNode } from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { Colors } from '@/constants/colors'

interface TrackCardProps {
  title: string
  subtitle?: string
  artworkUrl?: string
  isMine?: boolean
  /** Show the play/pause affordance + scrubber (a 30s preview is available). */
  hasPreview?: boolean
  isPlaying?: boolean
  /** Preview progress, 0..1. */
  progress?: number
  onTogglePreview?: () => void
  /** Action row slot (e.g. Add to library / Open in Apple Music). */
  actions?: ReactNode
}

/**
 * Presentational track card (chat × music plan, ticket 0.3). Artwork, title, subtitle, an
 * optional 30s preview control + scrubber, and an actions slot. No data fetching here.
 */
export function TrackCard({
  title,
  subtitle,
  artworkUrl,
  isMine = false,
  hasPreview = false,
  isPlaying = false,
  progress = 0,
  onTogglePreview,
  actions,
}: TrackCardProps) {
  return (
    <View
      className="w-72 rounded-2xl overflow-hidden"
      style={{ backgroundColor: isMine ? Colors.primaryContainer : Colors.surfaceContainerHigh }}
    >
      <View className="flex-row items-center p-3 gap-3">
        <View>
          {artworkUrl ? (
            <Image source={{ uri: artworkUrl }} style={{ width: 56, height: 56, borderRadius: 10 }} />
          ) : (
            <View
              className="items-center justify-center"
              style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: Colors.surfaceContainerHighest }}
            >
              <Ionicons name="musical-note" size={22} color={Colors.onSurfaceVariant} />
            </View>
          )}
          {hasPreview && onTogglePreview ? (
            <TouchableOpacity
              onPress={onTogglePreview}
              className="absolute items-center justify-center"
              style={{
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 10,
              }}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View className="flex-1">
          <Text
            className="text-[15px] font-semibold"
            numberOfLines={1}
            style={{ color: isMine ? Colors.onPrimary : Colors.onSurface }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              className="text-[13px] mt-0.5"
              numberOfLines={1}
              style={{ color: isMine ? 'rgba(255,255,255,0.85)' : Colors.onSurfaceVariant }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {hasPreview ? (
        <View className="h-1 mx-3 mb-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
              backgroundColor: isMine ? Colors.onPrimary : Colors.primary,
            }}
          />
        </View>
      ) : null}

      {actions ? (
        <View className="flex-row items-center gap-2 px-3 pb-3 pt-1">
          {actions}
        </View>
      ) : null}
    </View>
  )
}
