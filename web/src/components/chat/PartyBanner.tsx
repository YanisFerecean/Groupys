"use client";

import { CalendarClock, X } from "lucide-react";
import { PartyState } from "@/hooks/useListeningParty";

interface PartyBannerProps {
  party: PartyState | null;
  onJoin: () => void;
  onDismiss: () => void;
}

/** Banner for an upcoming or live scheduled listening party. */
export function PartyBanner({ party, onJoin, onDismiss }: PartyBannerProps) {
  if (!party) return null;
  const live = party.status === "live";
  const when = new Date(party.startAt);
  const whenLabel = Number.isNaN(when.getTime()) ? "" : when.toLocaleString();

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 border-b border-primary/20">
      <CalendarClock className="w-4 h-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-primary">
          {live ? "Listening party — live now" : "Listening party scheduled"}
        </p>
        <p className="text-[12px] text-on-surface truncate">
          {party.track ? `${party.track.title} — ${party.track.artist}` : "Tap to join"}
          {!live && whenLabel ? ` · ${whenLabel}` : ""}
        </p>
      </div>
      <button
        onClick={onJoin}
        className="px-3 py-1.5 rounded-full bg-primary text-on-primary text-[13px] font-semibold shrink-0 hover:opacity-90"
      >
        Join
      </button>
      <button
        onClick={onDismiss}
        className="h-7 w-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container shrink-0"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
