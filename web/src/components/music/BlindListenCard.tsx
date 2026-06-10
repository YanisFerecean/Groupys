"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { BlindListenPayload } from "@/types/chat";
import { fromTrackRef } from "@/lib/trackRef";
import { TrackCard } from "./TrackCard";
import { PreviewButton } from "./PreviewButton";

interface BlindListenCardProps {
  messageId: string;
  payload: BlindListenPayload;
  isMine: boolean;
  onGuess?: (messageId: string, guess: string) => void;
}

/** Guess-the-song game card: hidden track until the recipient guesses, then revealed. */
export function BlindListenCard({ messageId, payload, isMine, onGuess }: BlindListenCardProps) {
  const track = fromTrackRef(payload.track);
  const [guess, setGuess] = useState("");

  // Revealed — show the real track and the guess outcome.
  if (payload.guessed || !payload.hidden) {
    return (
      <div className="w-[290px] max-w-full">
        <TrackCard track={track} label="Blind listen 🙈" />
        {payload.guessText && (
          <p className={`mt-1.5 px-1 text-[12px] ${payload.guessCorrect ? "text-tertiary" : "text-on-surface-variant"}`}>
            {payload.guessCorrect ? "✅ Guessed right" : "❌ Guessed"}: “{payload.guessText}”
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-[290px] max-w-full rounded-2xl bg-surface-container-high border border-surface-container-highest p-3">
      <div className="flex items-center gap-3">
        <div className="relative w-14 h-14 rounded-lg bg-surface-container flex items-center justify-center shrink-0 overflow-hidden">
          <HelpCircle className="w-7 h-7 text-on-surface-variant" />
          {track.previewUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <PreviewButton
                trackId={track.id}
                previewUrl={track.previewUrl}
                className="h-8 w-8 rounded-full flex items-center justify-center bg-white/90 text-black"
              />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Guess the song</p>
          <p className="text-[13px] text-on-surface-variant">
            {isMine ? "Waiting for their guess…" : "Listen, then guess the track"}
          </p>
        </div>
      </div>

      {!isMine && onGuess && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const g = guess.trim();
            if (g) {
              onGuess(messageId, g);
              setGuess("");
            }
          }}
          className="flex gap-2 mt-3"
        >
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Your guess…"
            className="flex-1 rounded-full bg-surface-container px-3 py-1.5 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-full bg-primary text-on-primary text-[13px] font-semibold hover:opacity-90"
          >
            Guess
          </button>
        </form>
      )}
    </div>
  );
}
