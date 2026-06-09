import type { ComponentType } from 'react'

import type { Message } from '@/models/Chat'
import { TrackCardMessage } from '@/components/music/TrackCardMessage'
import { AlbumCardMessage } from '@/components/music/AlbumCardMessage'
import { PlaylistCardMessage } from '@/components/music/PlaylistCardMessage'
import { TasteHandshakeMessage } from '@/components/music/TasteHandshakeMessage'
import { DedicationCardMessage } from '@/components/music/DedicationCardMessage'
import { LyricCardMessage } from '@/components/music/LyricCardMessage'
import { TimestampCardMessage } from '@/components/music/TimestampCardMessage'
import { BlindListenCardMessage } from '@/components/music/BlindListenCardMessage'
import { ImageMessage } from '@/components/chat/ImageMessage'
import { LinkPreviewMessage } from '@/components/chat/LinkPreviewMessage'
import { VoiceMessage } from '@/components/chat/VoiceMessage'

export interface MessageRendererProps {
  message: Message
  isMine: boolean
}

/**
 * Renderer registry (chat × music plan, ticket 0.3). Maps a structured `messageType` to the
 * component that renders its card. `TEXT` keeps its existing path in MessageBubble; unknown
 * types fall back to the "unsupported message" bubble. New card types register here.
 */
export const messageRenderers: Record<string, ComponentType<MessageRendererProps>> = {
  TRACK: TrackCardMessage,
  ALBUM: AlbumCardMessage,
  PLAYLIST: PlaylistCardMessage,
  TASTE_HANDSHAKE: TasteHandshakeMessage,
  DEDICATION: DedicationCardMessage,
  LYRIC: LyricCardMessage,
  TIMESTAMP: TimestampCardMessage,
  BLIND_LISTEN: BlindListenCardMessage,
  IMAGE: ImageMessage,
  LINK_PREVIEW: LinkPreviewMessage,
  VOICE: VoiceMessage,
}

/** Returns the card renderer for a message type, or undefined for TEXT/unknown types. */
export function getMessageRenderer(
  messageType: string | undefined | null,
): ComponentType<MessageRendererProps> | undefined {
  if (!messageType) return undefined
  return messageRenderers[messageType.toUpperCase()]
}

const TEXT_TYPES = new Set(['TEXT', 'SYSTEM'])

export function isTextType(messageType: string | undefined | null): boolean {
  if (!messageType) return true
  return TEXT_TYPES.has(messageType.toUpperCase())
}
