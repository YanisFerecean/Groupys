"use client";

import { Pause, Play, Radio, X } from "lucide-react";
import { FloatingReaction, RoomState } from "@/hooks/useListenTogether";
import { MusicCardArtwork } from "@/components/music/MusicCardArtwork";

const QUICK_REACTIONS = ["🔥", "❤️", "🎶", "😮", "😂"];

interface ListenTogetherBarProps {
  room: RoomState;
  reactions: FloatingReaction[];
  onToggle: () => void;
  onJoin: () => void;
  onLeave: () => void;
  onReact: (emoji: string) => void;
}

/** Sticky bar for an active Listen Together session, with floating emoji reactions. */
export function ListenTogetherBar({ room, reactions, onToggle, onJoin, onLeave, onReact }: ListenTogetherBarProps) {
  if (!room.active || !room.track) return null;

  return (
    <div className="bg-tertiary/10 border-b border-tertiary/20">
      <div className="flex items-center gap-3 px-4 py-2">
        <Radio className="w-4 h-4 text-tertiary shrink-0" />
        <MusicCardArtwork url={room.track.artworkUrl} alt={room.track.title} size={32} rounded="rounded-md" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-tertiary">
            Listening together{room.isHost ? " · host" : ""}
            {room.full && !room.isHost ? " · 30s preview" : ""}
          </p>
          <p className="text-[12px] text-on-surface truncate">
            {room.track.title}
            {room.track.artist ? ` — ${room.track.artist}` : ""}
          </p>
        </div>

        {room.isHost ? (
          <button
            onClick={onToggle}
            className="h-8 w-8 rounded-full bg-tertiary text-white flex items-center justify-center shrink-0"
            title={room.isPlaying ? "Pause" : "Play"}
          >
            {room.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
        ) : !room.joined ? (
          <button
            onClick={onJoin}
            className="px-3 py-1.5 rounded-full bg-tertiary text-white text-[13px] font-semibold shrink-0 hover:opacity-90"
          >
            Join
          </button>
        ) : (
          <span className="text-[11px] text-tertiary font-medium shrink-0">
            {room.isPlaying ? "Playing" : "Paused"}
          </span>
        )}

        <button
          onClick={onLeave}
          className="h-7 w-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container shrink-0"
          title="Leave"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick reactions + floating reactions (visible once you've joined or are hosting). */}
      {room.joined && (
        <div className="flex items-center gap-1.5 px-4 pb-2">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onReact(emoji)}
              className="h-7 w-7 rounded-full bg-tertiary/15 hover:bg-tertiary/25 flex items-center justify-center text-[15px] leading-none transition-colors"
              title={`React ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <div className="relative flex-1 h-7 overflow-hidden" aria-live="polite">
            {reactions.map((r, i) => (
              <span
                key={r.id}
                className="absolute bottom-0 text-lg animate-[float-up_2.4s_ease-out_forwards]"
                style={{ right: `${(i % 6) * 22 + 4}px` }}
              >
                {r.emoji}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
