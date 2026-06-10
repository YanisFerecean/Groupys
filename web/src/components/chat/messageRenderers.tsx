import { ReactNode } from "react";
import {
  Message,
  isAlbumPayload,
  isDedicationPayload,
  isLyricPayload,
  isPlaylistPayload,
  isTimestampPayload,
  isTrackPayload,
} from "@/types/chat";
import { ImageMessage } from "./ImageMessage";
import { VoiceMessage } from "./VoiceMessage";
import { TrackCard } from "@/components/music/TrackCard";
import { AlbumCard } from "@/components/music/AlbumCard";
import { PlaylistCard } from "@/components/music/PlaylistCard";
import { DedicationCard } from "@/components/music/DedicationCard";
import { LyricCard } from "@/components/music/LyricCard";
import { TimestampCard } from "@/components/music/TimestampCard";

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

interface RenderCtx {
  isMine: boolean;
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

    case "VOICE":
      return { node: <VoiceMessage message={message} isMine={ctx.isMine} />, bare: true };

    case "TRACK":
      if (isTrackPayload(message.payload)) {
        return { node: <TrackCard track={message.payload} />, bare: true };
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
  }

  // Unknown / not-yet-supported / malformed-payload type: fall back to the text
  // label so the message is never blank.
  return { node: <TextContent message={message} />, bare: false };
}
