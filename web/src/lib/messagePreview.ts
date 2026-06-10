import { Message, ReplyStub } from "@/types/chat";

/** Short emoji marker for a non-text message type (used in previews/quotes). */
const TYPE_ICON: Record<string, string> = {
  IMAGE: "📷",
  VOICE: "🎙",
  TRACK: "🎵",
  ALBUM: "💿",
  PLAYLIST: "🎶",
  COLLAB_PLAYLIST: "🎶",
  DEDICATION: "💝",
  LYRIC: "🎤",
  TIMESTAMP: "⏱",
  BLIND_LISTEN: "🙈",
  TASTE_HANDSHAKE: "🤝",
  STICKER: "🌟",
  LINK_PREVIEW: "🔗",
  NOW_PLAYING_SHARE: "🎧",
};

/** Default human label for a non-text message type when no better text exists. */
const TYPE_LABEL: Record<string, string> = {
  IMAGE: "Photo",
  VOICE: "Voice message",
  TRACK: "Shared a song",
  ALBUM: "Shared an album",
  PLAYLIST: "Shared a playlist",
  COLLAB_PLAYLIST: "Collaborative playlist",
  DEDICATION: "Song dedication",
  LYRIC: "Shared lyrics",
  TIMESTAMP: "Shared a moment",
  BLIND_LISTEN: "Guess the song",
  TASTE_HANDSHAKE: "Music taste match",
  STICKER: "Sticker",
  LINK_PREVIEW: "Shared a link",
  NOW_PLAYING_SHARE: "Now playing",
};

/**
 * Builds a compact single-line preview for a message or reply stub: an emoji
 * marker plus its label/content. Used by reply quotes, the conversation list,
 * and search results so non-text messages read sensibly.
 */
export function messagePreview(input: Pick<Message, "messageType" | "content"> | ReplyStub): string {
  const type = (input.messageType || "TEXT").toUpperCase();
  if ("isDeleted" in input && (input as Message).isDeleted) return "Message deleted";

  if (type === "TEXT" || type === "SYSTEM") {
    const text = "snippet" in input ? input.snippet : input.content;
    return (text || "").trim() || "Message";
  }

  const icon = TYPE_ICON[type] ?? "";
  const snippet = "snippet" in input ? input.snippet : input.content;
  const label = (snippet || "").trim() || TYPE_LABEL[type] || "Message";
  return icon ? `${icon} ${label}` : label;
}
