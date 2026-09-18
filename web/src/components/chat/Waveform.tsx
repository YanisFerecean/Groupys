"use client";

import { useRef } from "react";

interface WaveformProps {
  /** Normalized amplitudes in [0, 1]. */
  peaks: number[];
  /** Portion played, 0–1, used to colour the filled bars. */
  progress?: number;
  /** Called with a 0–1 ratio when the user clicks to seek. */
  onSeek?: (ratio: number) => void;
  height?: number;
  filledClass?: string;
  trackClass?: string;
}

/** Compact bar-style waveform, optionally scrubbable. Shared by the voice recorder and player. */
export function Waveform({
  peaks,
  progress = 0,
  onSeek,
  height = 28,
  filledClass = "bg-current",
  trackClass = "bg-current/30",
}: WaveformProps) {
  const ref = useRef<HTMLDivElement>(null);
  const bars = peaks.length > 0 ? peaks : new Array(24).fill(0.15);

  const handleClick = (e: React.MouseEvent) => {
    if (!onSeek || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(ratio);
  };

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={`flex items-center gap-[2px] ${onSeek ? "cursor-pointer" : ""}`}
      style={{ height }}
    >
      {bars.map((p, i) => {
        const filled = bars.length > 0 && i / bars.length <= progress;
        const h = Math.max(3, Math.min(1, p) * height);
        return (
          <span
            key={i}
            className={`w-[3px] rounded-full ${filled ? filledClass : trackClass}`}
            style={{ height: h }}
          />
        );
      })}
    </div>
  );
}

/** Reduces an arbitrary-length peak array to at most `max` averaged buckets (backend caps at 128). */
export function compactPeaks(peaks: number[], max = 64): number[] {
  if (peaks.length <= max) return peaks.map((p) => Math.min(1, Math.max(0, p)));
  const out: number[] = [];
  const size = peaks.length / max;
  for (let i = 0; i < max; i++) {
    const start = Math.floor(i * size);
    const end = Math.floor((i + 1) * size);
    let sum = 0;
    let n = 0;
    for (let j = start; j < end; j++) {
      sum += peaks[j];
      n++;
    }
    out.push(n > 0 ? Math.min(1, Math.max(0, sum / n)) : 0);
  }
  return out;
}
