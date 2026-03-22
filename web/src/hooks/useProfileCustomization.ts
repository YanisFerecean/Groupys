"use client";

import { useAuth, useUser, useReverification } from "@clerk/nextjs";
import { useState, useCallback, useEffect, useRef } from "react";
import type { ProfileCustomization } from "@/types/profile";
import {
  fetchUserByClerkId,
  createBackendUser,
  updateBackendUser,
  backendUserToProfile,
} from "@/lib/api";

export function useProfileCustomization() {
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  const { user, isLoaded } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileCustomization>({});
  const [backendUserId, setBackendUserId] = useState<string | null>(null);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const fetchedRef = useRef(false);

  // Fetch or create backend user when Clerk user is available
  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !user || fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const token = await getToken();
        let backendUser = await fetchUserByClerkId(user.id, token);

        // UserSync may not have finished yet — retry once after a short delay
        if (!backendUser) {
          await new Promise((r) => setTimeout(r, 1000));
          backendUser = await fetchUserByClerkId(user.id, token);
        }

        // Fallback: create inline if UserSync still hasn't run
        if (!backendUser) {
          backendUser = await createBackendUser({
            clerkId: user.id,
            username: user.username ?? user.id,
            displayName: user.fullName ?? undefined,
          }, token);
        }

        setBackendUserId(backendUser.id);
        setProfile(backendUserToProfile(backendUser));
      } catch (err) {
        console.error("Failed to load profile from backend:", err);
      } finally {
        setIsProfileLoaded(true);
      }
    })();
  }, [getToken, isAuthLoaded, isLoaded, user]);

  const updateProfile = useCallback(
    async (partial: Partial<ProfileCustomization>) => {
      if (!backendUserId) return;
      setIsSaving(true);
      try {
        const token = await getToken();
        const updated = await updateBackendUser(backendUserId, partial, token);
        setProfile(backendUserToProfile(updated));
      } finally {
        setIsSaving(false);
      }
    },
    [backendUserId, getToken],
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
