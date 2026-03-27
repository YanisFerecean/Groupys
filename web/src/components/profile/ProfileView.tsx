"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useProfileCustomization } from "@/hooks/useProfileCustomization";
import { useUser, useAuth } from "@clerk/nextjs";
import { fetchMyAlbumRatings } from "@/lib/api";
import ProfileHeader from "./ProfileHeader";
import ProfileWidgetGrid from "./ProfileWidgetGrid";
import ProfileEditDrawer from "./ProfileEditDrawer";

function useSpotifyCallback() {
  const searchParams = useSearchParams();
  const spotifyParam = searchParams.get("spotify");
  return spotifyParam === "connected"
    ? "connected"
    : spotifyParam === "error"
      ? "error"
      : null;
}

export default function ProfileView() {
  const {
    profile,
    updateProfile,
    updateUsername,
    updateProfileImage,
    removeProfileImage,
    isLoaded,
    isSaving,
    spotifyConnected,
    setSpotifyConnected,
  } = useProfileCustomization();
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const spotifyCallback = useSpotifyCallback();
  const [albumsRatedCount, setAlbumsRatedCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const ratings = await fetchMyAlbumRatings(token);
        setAlbumsRatedCount(ratings.length);
      } catch {
        // silently fail
      }
    })();
  }, [getToken]);

  // Open the editor drawer when arriving from Spotify OAuth callback
  const [isEditing, setIsEditing] = useState(spotifyCallback === "connected");

  // Mark spotify as connected & clean up URL param
  useEffect(() => {
    if (!spotifyCallback) return;
    if (spotifyCallback === "connected") {
      setSpotifyConnected(true);
    }
    router.replace("/profile", { scroll: false });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user || !isLoaded) return null;

  const clerkName = user.fullName ?? user.username ?? "Music Fan";
  const memberYear = new Date(user.createdAt!).getFullYear();

  return (
    <div
      style={
        profile.accentColor
          ? ({ "--profile-accent": profile.accentColor } as React.CSSProperties)
          : undefined
      }
    >
      <ProfileHeader
        profile={profile}
        avatarUrl={user.imageUrl}
        clerkName={clerkName}
        username={user.username ?? ""}
        memberYear={memberYear}
        albumsRatedCount={albumsRatedCount}
        onEditClick={() => setIsEditing(true)}
      />

      <ProfileWidgetGrid
        profile={profile}
        username={user.username ?? ""}
        spotifyConnected={spotifyConnected}
        onReorder={(newOrder) => updateProfile({ ...profile, widgetOrder: newOrder })}
      />

      <ProfileEditDrawer
        open={isEditing}
        onOpenChange={setIsEditing}
        profile={profile}
        currentUsername={user.username ?? ""}
        currentAvatarUrl={user.imageUrl}
        onSave={updateProfile}
        onUpdateUsername={updateUsername}
        onUpdateProfileImage={updateProfileImage}
        onRemoveProfileImage={removeProfileImage}
        isSaving={isSaving}
        spotifyConnected={spotifyConnected}
      />
    </div>
  );
}
