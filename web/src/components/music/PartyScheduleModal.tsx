"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { TrackPayload } from "@/types/chat";
import { MusicCardArtwork } from "./MusicCardArtwork";

interface PartyScheduleModalProps {
  track: TrackPayload;
  onClose: () => void;
  onSchedule: (startAt: string) => void;
}

function defaultLocalDateTime(): string {
  // 10 minutes from now, formatted for <input type="datetime-local">.
  const d = new Date(Date.now() + 10 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Picks a start time for a listening party around a chosen track. */
export function PartyScheduleModal({ track, onClose, onSchedule }: PartyScheduleModalProps) {
  const [when, setWhen] = useState(defaultLocalDateTime());
  const [error, setError] = useState("");

  const submit = () => {
    const date = new Date(when);
    if (Number.isNaN(date.getTime())) {
      setError("Pick a valid time.");
      return;
    }
    onSchedule(date.toISOString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-surface border border-surface-container-high shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-on-surface">Schedule a listening party</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-surface-container p-2.5 mb-4">
          <MusicCardArtwork url={track.artworkUrl} alt={track.title} size={44} />
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-on-surface truncate">{track.title}</p>
            <p className="text-[12px] text-on-surface-variant truncate">{track.artist}</p>
          </div>
        </div>

        <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Starts at</label>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => {
            setWhen(e.target.value);
            setError("");
          }}
          className="w-full rounded-2xl bg-surface-container px-4 py-3 text-[15px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {error && <p className="text-[12px] text-error mt-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container font-medium"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="px-5 py-2 rounded-full bg-primary text-on-primary font-semibold hover:opacity-90"
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
