import type { ArtistRes } from './ArtistRes'

export interface AlbumRes {
  id: number
  title: string
  coverSmall: string
  coverMedium: string
  artist: ArtistRes
}
