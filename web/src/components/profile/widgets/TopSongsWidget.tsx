"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import type { ProfileCustomization } from "@/types/profile";
import { getContrastColor } from "@/lib/utils";
import WidgetCard from "./WidgetCard";

interface TopSongsWidgetProps {
  songs?: ProfileCustomization["topSongs"];
  containerColor?: string;
  size?: "small" | "normal";
}

export default function TopSongsWidget({ songs, containerColor, size = "normal" }: TopSongsWidgetProps) {
  const textColor = containerColor ? getContrastColor(containerColor) : undefined;
  const coverSize = 48;
  const visibleSongs = songs?.slice(0, size === "small" ? 1 : 3) ?? [];

  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleSongClick = (index: number, previewUrl?: string) => {
    // If clicking the same song that's playing, pause it
    if (playingIndex === index) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingIndex(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // If no preview URL, just toggle off
    if (!previewUrl) {
      setPlayingIndex(null);
      return;
    }

    // Play the new song
    const audio = new Audio(previewUrl);
    audioRef.current = audio;

    audio.addEventListener("ended", () => {
      setPlayingIndex(null);
      audioRef.current = null;
    });

    audio.addEventListener("error", () => {
      setPlayingIndex(null);
      audioRef.current = null;
    });

    audio.play().then(() => {
      setPlayingIndex(index);
    }).catch(() => {
      setPlayingIndex(null);
      audioRef.current = null;
    });
  };

  const isPlaying = (index: number) => playingIndex === index;

  return (
    <WidgetCard
      title={size === "small" ? "Top Song" : "Top Songs"}
      className="h-[260px] overflow-hidden"
      style={containerColor ? { backgroundColor: containerColor } : undefined}
      textColor={textColor}
    >
      {visibleSongs.length > 0 ? (
        size === "small" ? (
          <div className="flex flex-col gap-3">
            <div
              className={`relative w-full aspect-square cursor-pointer group ${visibleSongs[0].preview ? "hover:opacity-90" : ""}`}
              onClick={() => handleSongClick(0, visibleSongs[0].preview)}
            >
              {visibleSongs[0].coverUrl ? (
                <Image
                  src={visibleSongs[0].coverUrl}
                  alt={visibleSongs[0].title}
                  fill
                  className="rounded-xl object-cover shadow-md"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-surface-container-high flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant/40 text-4xl">music_note</span>
                </div>
              )}
              <span className="absolute top-2 left-2 text-xs font-bold w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center">
                1
              </span>
              {/* Play/Pause overlay */}
              {visibleSongs[0].preview && (
                <div className={`absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl transition-opacity ${isPlaying(0) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  <span className="material-symbols-outlined text-white text-4xl">
                    {isPlaying(0) ? "pause" : "play_arrow"}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{visibleSongs[0].title}</p>
              <p className="text-xs truncate" style={textColor ? { color: textColor, opacity: 0.6 } : { color: "var(--color-on-surface-variant)" }}>
                {visibleSongs[0].artist}
              </p>
            </div>
          </div>
        ) : (
          <ol className="space-y-3">
            {visibleSongs.map((song, i) => (
              <li
                key={i}
                className={`flex items-center gap-3 ${song.preview ? "cursor-pointer group" : ""}`}
                onClick={() => handleSongClick(i, song.preview)}
              >
                <span
                  className="text-xs font-bold w-5 text-center shrink-0"
                  style={{ color: textColor ?? "var(--profile-accent, var(--color-primary))" }}
                >
                  {i + 1}
                </span>
                <div className={`relative shrink-0 ${song.preview ? "group-hover:opacity-80" : ""}`}>
                  {song.coverUrl ? (
                    <Image
                      src={song.coverUrl}
                      alt={song.title}
                      width={coverSize}
                      height={coverSize}
                      className="rounded object-cover"
                    />
                  ) : (
                    <div className="rounded bg-surface-container-high flex items-center justify-center" style={{ width: coverSize, height: coverSize }}>
                      <span className="material-symbols-outlined text-on-surface-variant text-lg">music_note</span>
                    </div>
                  )}
                  {/* Play/Pause overlay */}
                  {song.preview && (
                    <div className={`absolute inset-0 flex items-center justify-center bg-black/40 rounded transition-opacity ${isPlaying(i) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                      <span className="material-symbols-outlined text-white text-lg">
                        {isPlaying(i) ? "pause" : "play_arrow"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{song.title}</p>
                  <p className="text-xs truncate" style={textColor ? { color: textColor, opacity: 0.6 } : { color: "var(--color-on-surface-variant)" }}>
                    {song.artist}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )
      ) : (
        <p className="text-sm" style={textColor ? { color: textColor, opacity: 0.6 } : { color: "var(--color-on-surface-variant)" }}>
          No top songs set. Edit your profile to add some.
        </p>
      )}
    </WidgetCard>
  );
}
