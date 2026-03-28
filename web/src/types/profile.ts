export interface ProfileCustomization {
  displayName?: string;
  bio?: string;
  country?: string;
  bannerUrl?: string;
  accentColor?: string;
  nameColor?: string;
  profileImage?: string;
  topSongs?: { title: string; artist: string; coverUrl?: string }[];
  topArtists?: { name: string; genre?: string; imageUrl?: string }[];
  topAlbums?: {
    title: string;
    artist: string;
    coverUrl?: string;
  }[];
  currentlyListening?: {
    title: string;
    artist: string;
    coverUrl?: string;
  };
  albumsContainerColor?: string;
  songsContainerColor?: string;
  artistsContainerColor?: string;
  lastRatedAlbumContainerColor?: string;
  widgetSizes?: Partial<Record<string, "small" | "normal">>;
  spotifySynced?: Partial<Record<string, boolean>>;
  tags?: string[];
  showLastRatedAlbum?: boolean;
  widgetOrder?: string[];
}
