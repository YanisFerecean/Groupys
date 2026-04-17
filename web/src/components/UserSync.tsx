"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import {
  fetchUserByClerkId,
  createBackendUser,
  updateBackendUser,
} from "@/lib/api";
import { useUserStore } from "@/store/userStore";

// Module-level flag — survives React Strict Mode double-mounts and layout
// re-renders, so we never sync more than once per browser session.
let hasSynced = false;

export default function UserSync() {
  const { getToken, isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const runningRef = useRef(false);
  const setBackendUser = useUserStore((s) => s.setBackendUser);

  // True only while the async sync operation is in flight
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !isSignedIn || !user) return;
    if (hasSynced || runningRef.current) return;

    runningRef.current = true;
    hasSynced = true;
    setSyncing(true);

    (async () => {
      try {
        const token = await getToken();
        const existing = await fetchUserByClerkId(user.id, token);

        if (!existing) {
          const created = await createBackendUser({
            clerkId: user.id,
            username: user.username ?? user.id,
            displayName: user.fullName ?? undefined,
            profileImage: user.imageUrl ?? undefined,
          }, token);
          setBackendUser(created.id, created.username);
          router.replace("/onboarding");
        } else {
          setBackendUser(existing.id, existing.username);
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
          router.replace("/feed");
        }
      } catch (err) {
        console.error("Failed to sync user to backend:", err);
        hasSynced = false;
        runningRef.current = false;
      } finally {
        setSyncing(false);
      }
    })();
  }, [getToken, isAuthLoaded, isSignedIn, isLoaded, user, router]);

  // Only block the UI while actively syncing AND the user is on "/"
  if (!syncing || pathname !== "/") return null;

  return (
    <div className="fixed inset-0 z-[200] bg-surface flex items-center justify-center">
      <svg className="animate-spin h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>
  );
}
