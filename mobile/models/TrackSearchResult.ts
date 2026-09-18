export interface TrackSearchResult {
  id: number
  title: string
  artist: string
  album: string
  coverUrl?: string
  preview?: string
  /** Apple Music catalog song id (string) — present when results come from Apple search. */
  catalogId?: string
}
