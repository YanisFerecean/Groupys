import type { ComponentType } from 'react'

import type { Message } from '@/models/Chat'
import { TrackCardMessage } from '@/components/music/TrackCardMessage'
import { AlbumCardMessage } from '@/components/music/AlbumCardMessage'
import { PlaylistCardMessage } from '@/components/music/PlaylistCardMessage'

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
