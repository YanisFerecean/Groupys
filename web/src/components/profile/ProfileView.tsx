"use client";

import { useState } from "react";
import { useProfileCustomization } from "@/hooks/useProfileCustomization";
import { useUser } from "@clerk/nextjs";
import ProfileHeader from "./ProfileHeader";
import ProfileWidgetGrid from "./ProfileWidgetGrid";
import ProfileEditDrawer from "./ProfileEditDrawer";

export default function ProfileView() {
  const {
    profile,
    updateProfile,
    updateUsername,
    updateProfileImage,
    removeProfileImage,
    isLoaded,
    isSaving,
  } = useProfileCustomization();
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);

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

      <ProfileWidgetGrid profile={profile} />

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
      />
    </div>
  );
}
