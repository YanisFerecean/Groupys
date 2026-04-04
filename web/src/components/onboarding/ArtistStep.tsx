"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import type { ArtistSearchResult } from "@/lib/api";
import { searchArtists } from "@/lib/api";

interface ArtistStepProps {
  selected: ArtistSearchResult[];
  onToggle: (artist: ArtistSearchResult) => void;
}

function ArtistCard({
  artist,
  isSelected,
  onToggle,
}: {
  artist: ArtistSearchResult;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const imageUrl = artist.images[0]?.url;

  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 p-3 rounded-2xl w-full text-left transition-all duration-200 border ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-transparent bg-surface-container hover:bg-surface-container-high"
      }`}
    >
      {/* Artist image */}
      <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={artist.name}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <span className="text-xl font-bold text-on-surface-variant">
            {artist.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-on-surface truncate">{artist.name}</p>
        {artist.primaryGenre && (
          <span className="inline-block mt-0.5 bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">
            {artist.primaryGenre.name}
          </span>
        )}
      </div>

      {/* Selection indicator */}
      <div
        className={`ml-auto flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          isSelected
            ? "bg-primary border-primary"
            : "border-outline-variant"
        }`}
      >
        {isSelected && (
          <span
            className="material-symbols-outlined text-on-primary"
            style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}
          >
            check
          </span>
        )}
      </div>
    </button>
  );
}

export default function ArtistStep({ selected, onToggle }: ArtistStepProps) {
  const { getToken } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArtistSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length === 0) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const token = await getTokenRef.current();
        const data = await searchArtists(query.trim(), token, 8);
        setResults(data);
      } catch {
        setSearchError("Search failed. Try again.");
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const selectedIds = new Set(selected.map((a) => a.id));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">
          Who do you love?
        </h2>
        <p className="text-on-surface-variant text-sm">
          Search for artists and pick at least one favourite.
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <span
          className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60"
          style={{ fontSize: 20 }}
        >
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artists…"
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-surface-container-high text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm font-medium"
          autoFocus
        />
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((a) => (
            <button
              key={a.id}
              onClick={() => onToggle(a)}
              className="flex items-center gap-1.5 pl-2 pr-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold hover:bg-primary/20 transition-colors"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}
              >
                close
              </span>
              {a.name}
            </button>
          ))}
        </div>
      )}

      {/* Results area */}
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {isSearching && (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[72px] bg-surface-container-high rounded-2xl animate-pulse" />
            ))}
          </>
        )}

        {!isSearching && searchError && (
          <p className="text-sm text-error text-center py-4">{searchError}</p>
        )}

        {!isSearching && !searchError && query.trim().length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-on-surface-variant/40">
            <span className="material-symbols-outlined" style={{ fontSize: 48 }}>
              search
            </span>
            <p className="text-sm font-medium">Search for artists you love</p>
          </div>
        )}

        {!isSearching && !searchError && query.trim().length > 0 && results.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center py-6">No artists found for &quot;{query}&quot;</p>
        )}

        {!isSearching && results.map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            isSelected={selectedIds.has(artist.id)}
            onToggle={() => onToggle(artist)}
          />
        ))}
      </div>
    </div>
  );
}
