import { createContext, useContext } from 'react'

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
}

export const ChatActionsContext = createContext<ChatActions>({})

export function useChatActions(): ChatActions {
  return useContext(ChatActionsContext)
}
