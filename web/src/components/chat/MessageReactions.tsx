import { MessageReaction, TrackPayload } from "@/types/chat";
import { TrackReactionChip } from "@/components/music/TrackReactionChip";

interface MessageReactionsProps {
  reactions: MessageReaction[];
  myUserId?: string;
  isMine: boolean;
  onToggleEmoji?: (emoji: string) => void;
}

interface EmojiGroup {
  emoji: string;
  count: number;
  mine: boolean;
}

/** Chip row beneath a bubble showing grouped emoji reactions (+ track reactions). */
export function MessageReactions({ reactions, myUserId, isMine, onToggleEmoji }: MessageReactionsProps) {
  const emojiGroups = new Map<string, EmojiGroup>();
  const trackReactions = new Map<string, TrackPayload>();

  for (const r of reactions) {
    if (r.type === "track" && r.track) {
      trackReactions.set(r.track.id, r.track);
      continue;
    }
    const emoji = r.emoji;
    if (!emoji) continue;
    const g = emojiGroups.get(emoji) ?? { emoji, count: 0, mine: false };
    g.count += 1;
    if (r.userId === myUserId) g.mine = true;
    emojiGroups.set(emoji, g);
  }

  if (emojiGroups.size === 0 && trackReactions.size === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
      {[...emojiGroups.values()].map((g) => (
        <button
          key={g.emoji}
          type="button"
          onClick={onToggleEmoji ? () => onToggleEmoji(g.emoji) : undefined}
          disabled={!onToggleEmoji}
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] leading-none transition-colors ${
            g.mine
              ? "bg-primary/15 text-primary ring-1 ring-primary/40"
              : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
          } ${onToggleEmoji ? "cursor-pointer" : "cursor-default"}`}
        >
          <span className="text-[13px]">{g.emoji}</span>
          {g.count > 1 && <span className="tabular-nums font-medium">{g.count}</span>}
        </button>
      ))}
      {[...trackReactions.values()].map((track) => (
        <TrackReactionChip key={track.id} track={track} />
      ))}
    </div>
  );
}
