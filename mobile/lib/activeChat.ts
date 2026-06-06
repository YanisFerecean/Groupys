/**
 * Tracks the conversation the user is currently viewing, so incoming-message banners can be
 * suppressed for the open chat (you don't want a banner for the screen you're already on).
 * Set by the chat screen on focus/blur; read by ChatProvider's MESSAGE_NEW handler.
 */
let activeConversationId: string | null = null

export function setActiveConversationId(id: string | null): void {
  activeConversationId = id
}

export function getActiveConversationId(): string | null {
  return activeConversationId
}
