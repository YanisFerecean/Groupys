import { ReactNode } from "react";
import { Message } from "@/types/chat";
import { ImageMessage } from "./ImageMessage";
import { VoiceMessage } from "./VoiceMessage";

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

    // Music card renderers are registered in their own phases.

    default:
      // Unknown / not-yet-supported type: fall back to the text label so the
      // message is never blank (e.g. an IMAGE before its renderer ships shows
      // its "Photo" label rather than an empty bubble).
      return { node: <TextContent message={message} />, bare: false };
  }
}
