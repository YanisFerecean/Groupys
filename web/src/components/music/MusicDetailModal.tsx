"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { TrackPayload } from "@/types/chat";
import { formatMs, parsePositionToMs, toTrackRef } from "@/lib/trackRef";
import { MusicCardArtwork } from "./MusicCardArtwork";

export type ComposeKind = "dedication" | "lyric" | "timestamp";

export interface ComposeResult {
  messageType: string;
  payload: Record<string, unknown>;
  label: string;
}

interface MusicDetailModalProps {
  kind: ComposeKind;
  track: TrackPayload;
  onClose: () => void;
  onSubmit: (result: ComposeResult) => void;
}

const TITLES: Record<ComposeKind, string> = {
  dedication: "Dedicate this song",
  lyric: "Share lyrics",
  timestamp: "Share a moment",
};

/** Second step of music composition: collects the note / lines / timestamp for a chosen track. */
export function MusicDetailModal({ kind, track, onClose, onSubmit }: MusicDetailModalProps) {
  const ref = toTrackRef(track) as unknown as Record<string, unknown>;

  const [note, setNote] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [position, setPosition] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (kind === "dedication") {
      onSubmit({
        messageType: "DEDICATION",
        payload: { type: "DEDICATION", dedication: true, note: note.trim() || undefined, ...ref },
        label: `💝 Dedicated “${track.title}”`,
      });
      return;
    }
    if (kind === "lyric") {
      const lines = lyrics
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 4);
      if (lines.length === 0) {
        setError("Add at least one line.");
        return;
      }
      onSubmit({
        messageType: "LYRIC",
        payload: { type: "LYRIC", track: ref, lines },
        label: `🎤 “${lines[0]}”`,
      });
      return;
    }
    // timestamp
    const ms = parsePositionToMs(position);
    if (ms === null) {
      setError("Enter a time like 1:24.");
      return;
    }
    onSubmit({
      messageType: "TIMESTAMP",
      payload: { type: "TIMESTAMP", track: ref, positionMs: ms },
      label: `⏱ ${track.title} @ ${formatMs(ms)}`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-surface border border-surface-container-high shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-on-surface">{TITLES[kind]}</h3>
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

        {kind === "dedication" && (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)…"
            rows={3}
            maxLength={300}
            className="w-full rounded-2xl bg-surface-container px-4 py-3 text-[15px] text-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant"
          />
        )}

        {kind === "lyric" && (
          <textarea
            value={lyrics}
            onChange={(e) => {
              setLyrics(e.target.value);
              setError("");
            }}
            placeholder={"One line per row\n(up to 4 lines)"}
            rows={4}
            className="w-full rounded-2xl bg-surface-container px-4 py-3 text-[15px] text-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant"
          />
        )}

        {kind === "timestamp" && (
          <input
            value={position}
            onChange={(e) => {
              setPosition(e.target.value);
              setError("");
            }}
            placeholder="e.g. 1:24"
            inputMode="numeric"
            className="w-full rounded-2xl bg-surface-container px-4 py-3 text-[15px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant"
          />
        )}

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
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
