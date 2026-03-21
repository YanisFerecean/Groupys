import type { ArtistRes } from './ArtistRes'
import type { AlbumRes } from './AlbumRes'
import type { TrackRes } from './TrackRes'

export interface SearchResult {
  artists: ArtistRes[]
  albums: AlbumRes[]
  tracks: TrackRes[]
}
