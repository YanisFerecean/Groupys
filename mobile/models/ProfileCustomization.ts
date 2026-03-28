export interface TopSong {
  id?: number
  title: string
  artist: string
  coverUrl?: string
  previewUrl?: string
}

export interface TopArtist {
  id?: number
  name: string
  genre?: string
  imageUrl?: string
}

export interface TopAlbum {
  id?: number
  title: string
  artist: string
  coverUrl?: string
}

export interface ProfileCustomization {
  id?: string
  displayName?: string
  bio?: string
  country?: string
  tags?: string[]
  spotifyConnected?: boolean
  bannerUrl?: string
  bannerText?: string
  accentColor?: string
  nameColor?: string
  topSongs?: TopSong[]
  topArtists?: TopArtist[]
  topAlbums?: TopAlbum[]
  syncTopSongsWithSpotify?: boolean
  syncTopArtistsWithSpotify?: boolean
  syncTopAlbumsWithSpotify?: boolean
  currentlyListening?: { id?: number; title: string; artist: string; coverUrl?: string }
  albumsContainerColor?: string
  songsContainerColor?: string
  artistsContainerColor?: string
  widgetSizes?: Partial<Record<string, 'small' | 'normal'>>
  widgetOrder?: string[]
  hiddenWidgets?: string[]
  isVerified?: boolean
  website?: string
  jobTitle?: string
  location?: string
  followersCount?: number
  followingCount?: number
}
