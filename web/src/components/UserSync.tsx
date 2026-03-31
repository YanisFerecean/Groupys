"use client";

import { useEffect, useRef, useState } from "react";
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

  // Start false so it doesn't try to render/logic on the server
  const [redirecting, setRedirecting] = useState(false);

  // REMOVED: The useEffect that was causing the "cascading renders" error.
  // Instead, we handle the state reset inside the main logic or via the path change.

  useEffect(() => {
    // 1. Safety check for SSR and Auth
    if (!isLoaded || !isAuthLoaded || !isSignedIn || !user || syncedRef.current) return;

    // 2. Only run this if we are on the root path to avoid unnecessary syncs on every page load
    // (Optional: remove this check if you want to sync on every page mount)
    if (pathname !== "/") return;

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

          setRedirecting(true);
          router.replace("/profile");
        } else {
          // Sync profile image if it changed
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

          setRedirecting(true);
          router.replace("/feed");
        }
      } catch (err) {
        console.error("Failed to sync user to backend:", err);
        syncedRef.current = false; // Allow retry on error
      }
    })();
  }, [getToken, isAuthLoaded, isSignedIn, isLoaded, user, pathname, router]);

  // If we aren't on "/", we shouldn't show the redirecting overlay anyway
  if (!redirecting || pathname !== "/") return null;

  return (
      <div className="fixed inset-0 z-[200] bg-surface flex items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
  );
}