import { ReactNode } from "react";
import {
  Message,
  isAlbumPayload,
  isBlindListenPayload,
  isCollabPlaylistPayload,
  isDedicationPayload,
  isLinkPreviewPayload,
  isLyricPayload,
  isPlaylistPayload,
  isStickerPayload,
  isTasteHandshakePayload,
  isTimestampPayload,
  isTrackPayload,
  TrackPayload,
} from "@/types/chat";
import { ImageMessage } from "./ImageMessage";
import { VideoMessage } from "./VideoMessage";
import { VoiceMessage } from "./VoiceMessage";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { StickerMessage } from "./StickerMessage";
import { UnsupportedMessage } from "./UnsupportedMessage";
import { TrackCard } from "@/components/music/TrackCard";
import { AlbumCard } from "@/components/music/AlbumCard";
import { PlaylistCard } from "@/components/music/PlaylistCard";
import { DedicationCard } from "@/components/music/DedicationCard";
import { LyricCard } from "@/components/music/LyricCard";
import { TimestampCard } from "@/components/music/TimestampCard";
import { BlindListenCard } from "@/components/music/BlindListenCard";
import { CollabPlaylistCard } from "@/components/music/CollabPlaylistCard";
import { TasteHandshakeCard } from "@/components/music/TasteHandshakeCard";

/**
 * Result of rendering a message's *content* (the bit inside the bubble column).
 *
 * `bare` distinguishes rich cards (images, voice notes, music cards — which draw
 * their own surface) from plain text, which the bubble wraps in a coloured pill.
 * New card types register a `case` here; `MessageBubble` stays untouched.
 */
export interface RenderResult {
  node: ReactNode;
  bare: boolean;
}

/** Callbacks interactive cards (blind-listen, collab playlist, track cards…) can invoke. */
export interface MessageCardHandlers {
  onBlindGuess?: (messageId: string, guess: string) => void;
  /** Opens the collab playlist panel (view/remove tracks) — mobile's "View added songs". */
  onCollabOpen?: () => void;
  /** Adds a public-preview track to the conversation's collaborative playlist. */
  onCollabAddTrack?: (track: TrackPayload) => void;
  /** Whether a track is already in the thread's collaborative playlist. */
  isInCollabPlaylist?: (trackId: string) => boolean;
}

interface RenderCtx extends MessageCardHandlers {
  isMine: boolean;
}

/** Message types that plain-text search/preview treat as text bubbles. */
const TEXT_TYPES = new Set(["TEXT", "SYSTEM"]);

export function isTextType(messageType: string | undefined | null): boolean {
  if (!messageType) return true;
  return TEXT_TYPES.has(messageType.toUpperCase());
}

function TextContent({ message }: { message: Message }) {
  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{message.content}</p>
  );
}

/** Renders the type-specific body of a message. Card renderers are added per-feature. */
export function renderMessageContent(message: Message, ctx: RenderCtx): RenderResult {
  const type = (message.messageType || "TEXT").toUpperCase();

  switch (type) {
    case "TEXT":
    case "SYSTEM":
      return { node: <TextContent message={message} />, bare: false };

    case "IMAGE":
      return { node: <ImageMessage message={message} />, bare: true };

    case "VIDEO":
      return { node: <VideoMessage message={message} />, bare: true };

    case "VOICE":
      return { node: <VoiceMessage message={message} isMine={ctx.isMine} />, bare: true };

    case "STICKER":
      if (isStickerPayload(message.payload)) {
        return { node: <StickerMessage payload={message.payload} />, bare: true };
      }
      break;

    case "LINK_PREVIEW":
      if (isLinkPreviewPayload(message.payload)) {
        return { node: <LinkPreviewCard payload={message.payload} isMine={ctx.isMine} />, bare: true };
      }
      break;

    case "TRACK":
      if (isTrackPayload(message.payload)) {
        const track = message.payload;
        const inPlaylist = ctx.isInCollabPlaylist?.(track.id) ?? false;
        return {
          node: (
            <TrackCard
              track={track}
              onAddToPlaylist={
                ctx.onCollabAddTrack && track.previewUrl ? () => ctx.onCollabAddTrack!(track) : undefined
              }
              inPlaylist={inPlaylist}
            />
          ),
          bare: true,
        };
      }
      break;

    case "ALBUM":
      if (isAlbumPayload(message.payload)) {
        return { node: <AlbumCard album={message.payload} />, bare: true };
      }
      break;

    case "PLAYLIST":
      if (isPlaylistPayload(message.payload)) {
        return {
          node: (
            <PlaylistCard
              title={message.payload.title}
              curator={message.payload.curator}
              artworkUrl={message.payload.artworkUrl}
              trackCount={message.payload.trackCount}
              appleMusicUrl={message.payload.appleMusicUrl}
              previews={message.payload.previews}
            />
          ),
          bare: true,
        };
      }
      break;

    case "DEDICATION":
      if (isDedicationPayload(message.payload)) {
        return { node: <DedicationCard payload={message.payload} />, bare: true };
      }
      break;

    case "LYRIC":
      if (isLyricPayload(message.payload)) {
        return { node: <LyricCard payload={message.payload} />, bare: true };
      }
      break;

    case "TIMESTAMP":
      if (isTimestampPayload(message.payload)) {
        return { node: <TimestampCard payload={message.payload} />, bare: true };
      }
      break;

    case "BLIND_LISTEN":
      if (isBlindListenPayload(message.payload)) {
        return {
          node: (
            <BlindListenCard
              messageId={message.id}
              payload={message.payload}
              isMine={ctx.isMine}
              onGuess={ctx.onBlindGuess}
            />
          ),
          bare: true,
        };
      }
      break;

    case "COLLAB_PLAYLIST":
      if (isCollabPlaylistPayload(message.payload)) {
        return {
          node: <CollabPlaylistCard payload={message.payload} onOpen={ctx.onCollabOpen} />,
          bare: true,
        };
      }
      break;

    case "TASTE_HANDSHAKE":
      if (isTasteHandshakePayload(message.payload)) {
        return { node: <TasteHandshakeCard payload={message.payload} />, bare: true };
      }
      break;
  }

  // Unknown / not-yet-supported / malformed-payload type: show the sender's fallback label
  // plus an "open in the app" hint, so the message is never blank.
  return { node: <UnsupportedMessage message={message} isMine={ctx.isMine} />, bare: false };
}
