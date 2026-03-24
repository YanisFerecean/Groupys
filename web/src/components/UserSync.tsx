"use client";

import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import {
  fetchUserByClerkId,
  createBackendUser,
  updateBackendUser,
} from "@/lib/api";

export default function UserSync() {
  const { getToken, isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !isSignedIn || !user || syncedRef.current) return;
    syncedRef.current = true;

    (async () => {
      try {
        const token = await getToken();
        const existing = await fetchUserByClerkId(user.id, token);
        if (!existing) {
          await createBackendUser({
            clerkId: user.id,
            username: user.username ?? user.id,
            displayName: user.fullName ?? undefined,
            profileImage: user.imageUrl ?? undefined,
          }, token);
          // New user — send to profile to set up their account
          if (pathname === "/") router.replace("/profile");
        } else {
          if (user.imageUrl && existing.profileImage !== user.imageUrl) {
            await updateBackendUser(existing.id, {
              displayName: existing.displayName ?? undefined,
              bio: existing.bio ?? undefined,
              country: existing.country ?? undefined,
              bannerUrl: existing.bannerUrl ?? undefined,
              accentColor: existing.accentColor ?? undefined,
              nameColor: existing.nameColor ?? undefined,
              profileImage: user.imageUrl,
            }, token);
          }
          // Returning user — send to feed
          if (pathname === "/") router.replace("/feed");
        }
      } catch (err) {
        console.error("Failed to sync user to backend:", err);
      }
    })();
  }, [getToken, isAuthLoaded, isSignedIn, isLoaded, user, pathname, router]);

  return null;
}
