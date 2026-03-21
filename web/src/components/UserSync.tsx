"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import {
  fetchUserByClerkId,
  createBackendUser,
  updateBackendUser,
} from "@/lib/api";

export default function UserSync() {
  const { user, isLoaded } = useUser();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || syncedRef.current) return;
    syncedRef.current = true;

    (async () => {
      try {
        const existing = await fetchUserByClerkId(user.id);
        if (!existing) {
          await createBackendUser({
            clerkId: user.id,
            username: user.username ?? user.id,
            displayName: user.fullName ?? undefined,
            profileImage: user.imageUrl ?? undefined,
          });
        } else if (user.imageUrl && existing.profileImage !== user.imageUrl) {
          await updateBackendUser(existing.id, {
            displayName: existing.displayName ?? undefined,
            bio: existing.bio ?? undefined,
            country: existing.country ?? undefined,
            bannerUrl: existing.bannerUrl ?? undefined,
            accentColor: existing.accentColor ?? undefined,
            nameColor: existing.nameColor ?? undefined,
            profileImage: user.imageUrl,
          });
        }
      } catch (err) {
        console.error("Failed to sync user to backend:", err);
      }
    })();
  }, [isLoaded, user]);

  return null;
}
