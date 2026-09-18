import { createContext, useContext } from 'react'
import type { TrackPayload } from '@/models/ChatPayloads'

/**
 * Actions a message-card renderer can trigger on the host chat screen (ticket 5.1+).
 * Renderers are context-light by design, so screen-level capabilities (sending a track,
 * opening the picker, viewing the partner profile) are exposed here.
 */
export interface ChatActions {
  /** Open the track picker, optionally seeded with a search query. */
  openTrackPicker?: (initialQuery?: string) => void
  /** Open the conversation partner's profile. */
  openPartnerProfile?: () => void
  /** Submit a blind-listen guess for a message (ticket 4.6). */
  revealBlindListen?: (messageId: string, guess: string) => void
  /** Append a public-preview track to the thread's collaborative playlist (ticket 6.1). */
  addToCollabPlaylist?: (track: TrackPayload) => void
  /** Whether a track is already in the thread's collaborative playlist (ticket 6.1). */
  isInCollabPlaylist?: (trackId: string) => boolean
}

export const ChatActionsContext = createContext<ChatActions>({})

export function useChatActions(): ChatActions {
  return useContext(ChatActionsContext)
}
