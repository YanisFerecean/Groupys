"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import type { ProfileCustomization } from "@/types/profile";
import { fetchSpotifyCurrentlyPlaying } from "@/lib/spotify";
import { getContrastColor } from "@/lib/utils";
import WidgetCard from "./WidgetCard";

const POLL_INTERVAL = 30_000;

interface CurrentlyListeningWidgetProps {
  track?: ProfileCustomization["currentlyListening"];
  spotifyConnected?: boolean;
  containerColor?: string;
  size?: "small" | "normal";
}

export default function CurrentlyListeningWidget({
  track: savedTrack,
  spotifyConnected,
  containerColor,
  size = "normal",
}: CurrentlyListeningWidgetProps) {
  const { getToken } = useAuth();
  const [liveTrack, setLiveTrack] = useState(savedTrack);

  useEffect(() => {
    if (!spotifyConnected) return;

    async function poll() {
      const token = await getToken();
      if (!token) return;
      try {
        const data = await fetchSpotifyCurrentlyPlaying(token);
        setLiveTrack(data ?? savedTrack);
      } catch {
        // keep showing last known track
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [spotifyConnected, getToken, savedTrack]);

  const track = spotifyConnected ? liveTrack : savedTrack;
  const textColor = containerColor ? getContrastColor(containerColor) : undefined;

  return (
    <WidgetCard
      title="Currently Listening"
      className="h-[260px] overflow-hidden"
      style={containerColor ? { backgroundColor: containerColor } : undefined}
      textColor={textColor}
    >
      {track?.title ? (
        size === "small" ? (
          <div className="flex flex-col gap-3">
            {track.coverUrl && (
              <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-md">
                <Image alt={track.title} fill className="object-cover" src={track.coverUrl} />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{track.title}</p>
              <p className="text-xs truncate" style={textColor ? { color: textColor, opacity: 0.6 } : { color: "var(--color-on-surface-variant)" }}>
                {track.artist}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {track.coverUrl && (
              <div className="relative w-full rounded-xl overflow-hidden shadow-lg" style={{ height: 140 }}>
                <Image
                  alt={track.title}
                  fill
                  className="object-cover"
                  src={track.coverUrl}
                />
              </div>
            )}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base truncate">{track.title}</p>
                <p className="text-sm truncate mt-0.5" style={textColor ? { color: textColor, opacity: 0.6 } : { color: "var(--color-on-surface-variant)" }}>
                  {track.artist}
                </p>
              </div>
              {/* Animated equalizer bars */}
              <div className="flex items-end gap-0.5 h-5 shrink-0">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full"
                    style={{
                      backgroundColor: textColor ?? "var(--profile-accent, var(--color-primary))",
                      animation: `equalize 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                      height: `${8 + (i % 3) * 6}px`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      ) : (
        <p className="text-sm" style={textColor ? { color: textColor, opacity: 0.6 } : { color: "var(--color-on-surface-variant)" }}>
          Nothing playing right now.
        </p>
      )}
    </WidgetCard>
  );
}
