import type { ProfileCustomization } from "@/types/profile";
import TopAlbumsWidget from "./widgets/TopAlbumWidget";
import CurrentlyListeningWidget from "./widgets/CurrentlyListeningWidget";
import TopSongsWidget from "./widgets/TopSongsWidget";
import TopArtistsWidget from "./widgets/TopArtistsWidget";
import LastRatedAlbumWidget from "./widgets/LastRatedAlbumWidget";

interface ProfileWidgetGridProps {
  profile: ProfileCustomization;
  username: string;
  spotifyConnected?: boolean;
}

export default function ProfileWidgetGrid({ profile, username, spotifyConnected }: ProfileWidgetGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6 md:px-12 py-10">
      <TopAlbumsWidget albums={profile.topAlbums} containerColor={profile.albumsContainerColor} />
      <CurrentlyListeningWidget track={profile.currentlyListening} spotifyConnected={spotifyConnected} />
      <TopSongsWidget songs={profile.topSongs} containerColor={profile.songsContainerColor} />
      <TopArtistsWidget artists={profile.topArtists} containerColor={profile.artistsContainerColor} />
      {profile.showLastRatedAlbum && <LastRatedAlbumWidget username={username} />}
    </div>
  );
}
