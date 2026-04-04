export interface ProfileCustomization {
  displayName?: string;
  bio?: string;
  country?: string;
  bannerUrl?: string;
  accentColor?: string;
  nameColor?: string;
  profileImage?: string;
  topSongs?: { title: string; artist: string; coverUrl?: string; preview?: string }[];
  topArtists?: { id?: string; name: string; genre?: string; imageUrl?: string }[];
  topAlbums?: {
    id?: string;
    title: string;
    artist: string;
    coverUrl?: string;
  }[];
  currentlyListening?: {
    title: string;
    artist: string;
    coverUrl?: string;
    preview?: string;
  };
  albumsContainerColor?: string;
  songsContainerColor?: string;
  artistsContainerColor?: string;
  lastRatedAlbumContainerColor?: string;
  currentlyListeningContainerColor?: string;
  widgetSizes?: Partial<Record<string, "small" | "normal">>;
  hiddenWidgets?: string[];
  spotifySynced?: Partial<Record<string, boolean>>;
  tags?: string[];
  showLastRatedAlbum?: boolean;
  showHotTake?: boolean;
  hotTakeContainerColor?: string;
  widgetOrder?: string[];
}
