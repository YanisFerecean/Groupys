"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useProfileCustomization } from "@/hooks/useProfileCustomization";
import { useUser } from "@clerk/nextjs";
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
  const router = useRouter();
  const spotifyCallback = useSpotifyCallback();

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
        onEditClick={() => setIsEditing(true)}
      />

      <ProfileWidgetGrid profile={profile} spotifyConnected={spotifyConnected} />

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
