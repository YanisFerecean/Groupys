"use client";

import Image from "next/image";
import type { TopAlbum, TopArtist, TopSong } from "../types";

interface MusicReviewStepProps {
  topArtists: TopArtist[];
  topSongs: TopSong[];
  topAlbums: TopAlbum[];
  saving: boolean;
  onBack: () => void;
  onLove: () => void;
  onPickManually: () => void;
}

function Row({ image, title, subtitle }: { image?: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      {image ? (
        <Image src={image} alt="" width={40} height={40} className="rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-surface-container-high shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-on-surface truncate">{title}</p>
        {subtitle && <p className="text-xs text-on-surface-variant truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">{label}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

export default function MusicReviewStep({
  topArtists,
  topSongs,
  topAlbums,
  saving,
  onBack,
  onLove,
  onPickManually,
}: MusicReviewStepProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">
          Here&apos;s your taste
        </h2>
        <p className="text-on-surface-variant text-sm">
          Straight from Apple Music. Keep it, or pick your favourites by hand.
        </p>
      </div>

      <div className="max-h-72 overflow-y-auto space-y-5 pr-1">
        {topArtists.length > 0 && (
          <Section label="Top artists">
            {topArtists.slice(0, 3).map((a, i) => (
              <Row key={`ar-${i}`} image={a.imageUrl} title={a.name} />
            ))}
          </Section>
        )}
        {topSongs.length > 0 && (
          <Section label="Top songs">
            {topSongs.slice(0, 3).map((s, i) => (
              <Row key={`so-${i}`} image={s.coverUrl} title={s.title} subtitle={s.artist} />
            ))}
          </Section>
        )}
        {topAlbums.length > 0 && (
          <Section label="Top albums">
            {topAlbums.slice(0, 3).map((al, i) => (
              <Row key={`al-${i}`} image={al.coverUrl} title={al.title} subtitle={al.artist} />
            ))}
          </Section>
        )}
      </div>

      <div className="h-px bg-outline-variant/30" />
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-on-surface-variant text-sm font-semibold hover:bg-surface-container-high transition-all disabled:opacity-40"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onPickManually}
            disabled={saving}
            className="px-4 py-2 rounded-full text-on-surface-variant text-sm font-semibold hover:bg-surface-container-high transition-all disabled:opacity-40"
          >
            Pick manually
          </button>
          <button
            onClick={onLove}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-full font-bold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50"
          >
            {saving ? "Saving…" : "Love it"}
          </button>
        </div>
      </div>
    </div>
  );
}
