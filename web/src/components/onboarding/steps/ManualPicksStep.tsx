"use client";

import Image from "next/image";
import MusicSearchInput, {
  type AlbumResult,
  type ArtistResult,
  type TrackResult,
} from "@/components/profile/MusicSearchInput";
import type { TopAlbum, TopArtist, TopSong } from "../types";

interface ManualPicksStepProps {
  artists: TopArtist[];
  songs: TopSong[];
  albums: TopAlbum[];
  onChangeArtists: (next: TopArtist[]) => void;
  onChangeSongs: (next: TopSong[]) => void;
  onChangeAlbums: (next: TopAlbum[]) => void;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
}

const MAX = 3;

function Chip({ image, label, onRemove }: { image?: string; label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-surface-container-high pl-1.5 pr-2.5 py-1.5">
      {image && <Image src={image} alt="" width={24} height={24} className="rounded-full object-cover" />}
      <span className="text-xs font-semibold text-on-surface max-w-32 truncate">{label}</span>
      <button onClick={onRemove} aria-label="Remove" className="text-on-surface-variant hover:text-on-surface">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
      </button>
    </div>
  );
}

export default function ManualPicksStep({
  artists,
  songs,
  albums,
  onChangeArtists,
  onChangeSongs,
  onChangeAlbums,
  saving,
  onBack,
  onSave,
}: ManualPicksStepProps) {
  const hasPicks = artists.length > 0 || songs.length > 0 || albums.length > 0;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">
          Pick your favourites
        </h2>
        <p className="text-on-surface-variant text-sm">
          Add up to three artists, songs and albums you love.
        </p>
      </div>

      <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
        {/* Artists */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Artists</p>
          {artists.length < MAX && (
            <MusicSearchInput
              type="artist"
              placeholder="Search artists"
              onSelect={(r: ArtistResult) => {
                if (artists.some((a) => a.id === r.id)) return;
                onChangeArtists([...artists, { id: r.id, name: r.name, imageUrl: r.imageUrl }]);
              }}
            />
          )}
          {artists.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {artists.map((a, i) => (
                <Chip key={a.id ?? i} image={a.imageUrl} label={a.name} onRemove={() => onChangeArtists(artists.filter((_, j) => j !== i))} />
              ))}
            </div>
          )}
        </div>

        {/* Songs */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Songs</p>
          {songs.length < MAX && (
            <MusicSearchInput
              type="track"
              placeholder="Search songs"
              onSelect={(r: TrackResult) =>
                onChangeSongs([...songs, { title: r.title, artist: r.artist, coverUrl: r.coverUrl }])
              }
            />
          )}
          {songs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {songs.map((s, i) => (
                <Chip key={i} image={s.coverUrl} label={s.title} onRemove={() => onChangeSongs(songs.filter((_, j) => j !== i))} />
              ))}
            </div>
          )}
        </div>

        {/* Albums */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Albums</p>
          {albums.length < MAX && (
            <MusicSearchInput
              type="album"
              placeholder="Search albums"
              onSelect={(r: AlbumResult) =>
                onChangeAlbums([...albums, { id: r.id, title: r.title, artist: r.artist, coverUrl: r.coverUrl }])
              }
            />
          )}
          {albums.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {albums.map((al, i) => (
                <Chip key={al.id ?? i} image={al.coverUrl} label={al.title} onRemove={() => onChangeAlbums(albums.filter((_, j) => j !== i))} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-outline-variant/30" />
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-on-surface-variant text-sm font-semibold hover:bg-surface-container-high transition-all disabled:opacity-40"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
          Back
        </button>
        <button
          onClick={onSave}
          disabled={saving || !hasPicks}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-full font-bold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-40"
        >
          {saving ? "Saving…" : "Continue"}
          {!saving && <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>}
        </button>
      </div>
    </div>
  );
}
