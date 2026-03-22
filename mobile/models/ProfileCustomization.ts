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
  displayName?: string
  bio?: string
  country?: string
  bannerUrl?: string
  accentColor?: string
  nameColor?: string
  topSongs?: TopSong[]
  topArtists?: TopArtist[]
  topAlbums?: TopAlbum[]
  currentlyListening?: { id?: number; title: string; artist: string; coverUrl?: string }
  albumsContainerColor?: string
  songsContainerColor?: string
  artistsContainerColor?: string
}
