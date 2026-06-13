import type { ArtistRes } from './ArtistRes'
import type { AlbumRes } from './AlbumRes'

export interface TrackRes {
  id: number
  title: string
  preview: string
  duration: number
  artist: ArtistRes
  album: AlbumRes
  /** Apple Music catalog song id (string) — present for Apple-sourced results. */
  catalogId?: string
}
