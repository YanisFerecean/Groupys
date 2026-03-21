import type { ArtistAlbumRes } from './ArtistAlbumRes'

export interface ArtistTopTrack {
  id: number
  title: string
  preview: string
  duration: number
  rank: number
  album: ArtistAlbumRes
}
