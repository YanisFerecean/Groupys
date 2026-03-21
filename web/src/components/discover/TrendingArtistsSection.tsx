"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import SectionHeader from "@/components/discover/SectionHeader";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

interface ChartArtist {
  id: number;
  name: string;
  images: string[];
  listeners: number;
  playcount: number;
  summary: string;
}

function formatCount(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function ArtistBubble({ artist }: { artist: ChartArtist }) {
  const imageUrl =
    artist.images.find((img) => img.includes("300x300")) ||
    artist.images[artist.images.length - 1];

  return (
    <button className="flex flex-col items-center gap-2 group">
      <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden bg-surface-container-high group-hover:ring-2 group-hover:ring-primary/30 transition-all">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={artist.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-surface-container to-surface-container-highest" />
        )}
      </div>
      <p className="text-sm font-bold text-on-surface text-center truncate max-w-[7rem]">
        {artist.name}
      </p>
      <p className="text-xs text-on-surface-variant/60">
        {formatCount(artist.listeners)} listeners
      </p>
    </button>
  );
}

function ArtistSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 animate-pulse">
      <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-surface-container-highest" />
      <div className="w-16 h-3.5 rounded bg-surface-container-highest" />
      <div className="w-12 h-2.5 rounded bg-surface-container-high" />
    </div>
  );
}

export default function TrendingArtistsSection() {
  const { getToken } = useAuth();
  const [artists, setArtists] = useState<ChartArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/charts/artists/global`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data: ChartArtist[] = await res.json();
        if (!cancelled) setArtists(data.slice(0, 6));
      } catch (err) {
        console.error("Failed to fetch top artists:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const toggleExpand = useCallback(() => setExpanded((p) => !p), []);

  const visible = expanded ? artists : artists.slice(0, 3);

  return (
    <section className="mb-12 lg:mb-16">
      <SectionHeader
        title="Trending Now"
        actionText={
          !loading && artists.length > 3
            ? expanded
              ? "Show Less"
              : "View All"
            : undefined
        }
        onAction={toggleExpand}
      />

      <div className="flex flex-wrap gap-6 lg:gap-8">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <ArtistSkeleton key={i} />)
          : visible.map((artist) => (
              <ArtistBubble key={artist.id} artist={artist} />
            ))}
      </div>
    </section>
  );
}
