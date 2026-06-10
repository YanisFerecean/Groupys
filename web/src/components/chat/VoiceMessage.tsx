"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Message, isVoicePayload } from "@/types/chat";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { audioPlayer } from "@/lib/audioPlayer";
import { Waveform } from "./Waveform";

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Renders a VOICE message: play/pause, scrubbable waveform and duration. */
export function VoiceMessage({ message, isMine }: { message: Message; isMine: boolean }) {
  const src = resolveMediaUrl(message.mediaUrl);
  const payload = isVoicePayload(message.payload) ? message.payload : null;
  const peaks = payload?.peaks ?? [];
  const durationSec = (payload?.durationMs ?? 0) / 1000;
  const bedTitle = payload?.bed?.title;

  const [playing, setPlaying] = useState(false);
  const [posSec, setPosSec] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekRatioRef = useRef(0);

  useEffect(
    () => () => {
      if (audioRef.current && audioPlayer.isPlaying(audioRef.current)) audioPlayer.stop();
    },
    []
  );

  if (!src) {
    return <p className="text-[13px] italic text-on-surface-variant">Voice message unavailable</p>;
  }

  const progress = durationSec ? Math.min(1, posSec / durationSec) : 0;

  const startPlayback = (fromRatio: number) => {
    const audio = audioPlayer.play(src, () => {
      setPlaying(false);
      audioRef.current = null;
    });
    audioRef.current = audio;
    const seekTo = fromRatio * durationSec;
    audio.addEventListener(
      "loadedmetadata",
      () => {
        if (seekTo > 0 && Number.isFinite(audio.duration)) {
          audio.currentTime = Math.min(seekTo, audio.duration);
        }
      },
      { once: true }
    );
    audio.addEventListener("timeupdate", () => setPosSec(audio.currentTime));
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => {
        setPlaying(false);
        audioRef.current = null;
      });
  };

  const toggle = () => {
    if (playing) {
      audioPlayer.stop();
      return;
    }
    const fromRatio = progress >= 0.999 ? 0 : durationSec ? posSec / durationSec : seekRatioRef.current;
    if (fromRatio === 0) setPosSec(0);
    startPlayback(fromRatio);
  };

  const seek = (ratio: number) => {
    const sec = ratio * durationSec;
    setPosSec(sec);
    if (audioRef.current && audioPlayer.isPlaying(audioRef.current)) {
      audioRef.current.currentTime = sec;
    } else {
      seekRatioRef.current = ratio;
    }
  };

  const timeLabel = playing || posSec > 0 ? fmt(posSec) : fmt(durationSec);

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 min-w-[220px] max-w-[320px] ${
        isMine ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface shadow-sm"
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
          isMine ? "bg-on-primary/20 text-on-primary" : "bg-primary/15 text-primary"
        }`}
        title={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <Waveform
          peaks={peaks}
          progress={progress}
          onSeek={seek}
          height={26}
          filledClass={isMine ? "bg-on-primary" : "bg-primary"}
          trackClass={isMine ? "bg-on-primary/35" : "bg-on-surface-variant/30"}
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] tabular-nums opacity-80">{timeLabel}</span>
          {bedTitle && <span className="text-[10px] opacity-70 truncate ml-2">🎚 {bedTitle}</span>}
        </div>
      </div>
    </div>
  );
}
