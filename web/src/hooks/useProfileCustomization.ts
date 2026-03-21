"use client";

import { useUser, useReverification } from "@clerk/nextjs";
import { useState, useCallback, useEffect, useRef } from "react";
import type { ProfileCustomization } from "@/types/profile";
import {
  fetchUserByClerkId,
  createBackendUser,
  updateBackendUser,
  backendUserToProfile,
} from "@/lib/api";

export function useProfileCustomization() {
  const { user, isLoaded } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileCustomization>({});
  const [backendUserId, setBackendUserId] = useState<string | null>(null);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const fetchedRef = useRef(false);

  // Fetch or create backend user when Clerk user is available
  useEffect(() => {
    if (!isLoaded || !user || fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        let backendUser = await fetchUserByClerkId(user.id);

        // UserSync may not have finished yet — retry once after a short delay
        if (!backendUser) {
          await new Promise((r) => setTimeout(r, 1000));
          backendUser = await fetchUserByClerkId(user.id);
        }

        // Fallback: create inline if UserSync still hasn't run
        if (!backendUser) {
          backendUser = await createBackendUser({
            clerkId: user.id,
            username: user.username ?? user.id,
            displayName: user.fullName ?? undefined,
            profileImage: user.imageUrl ?? undefined,
          });
        }

        setBackendUserId(backendUser.id);
        setProfile(backendUserToProfile(backendUser));
      } catch (err) {
        console.error("Failed to load profile from backend:", err);
      } finally {
        setIsProfileLoaded(true);
      }
    })();
  }, [isLoaded, user]);

  const updateProfile = useCallback(
    async (partial: Partial<ProfileCustomization>) => {
      if (!backendUserId) return;
      setIsSaving(true);
      try {
        const updated = await updateBackendUser(backendUserId, partial);
        setProfile(backendUserToProfile(updated));
      } finally {
        setIsSaving(false);
      }
    },
    [backendUserId],
  );

  // Wrapped with useReverification — Clerk auto-shows a verification modal
  const updateUsernameWithVerification = useReverification(
    async (newUsername: string) => {
      if (!user) return;
      await user.update({ username: newUsername });
    },
  );

  const updateUsername = useCallback(
    async (username: string) => {
      if (!user) return;
      setIsSaving(true);
      try {
        await updateUsernameWithVerification(username);
      } finally {
        setIsSaving(false);
      }
    },
    [user, updateUsernameWithVerification],
  );

  const updateProfileImage = useCallback(
    async (file: File) => {
      if (!user) return;
      setIsSaving(true);
      try {
        await user.setProfileImage({ file });
      } finally {
        setIsSaving(false);
      }
    },
    [user],
  );

  const removeProfileImage = useCallback(async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await user.setProfileImage({ file: null });
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  return {
    profile,
    updateProfile,
    updateUsername,
    updateProfileImage,
    removeProfileImage,
    isLoaded: isLoaded && isProfileLoaded,
    isSaving,
  };
}
