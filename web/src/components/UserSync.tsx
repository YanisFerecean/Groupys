"use client";

import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { fetchUserByClerkId, createBackendUser } from "@/lib/api";

export default function UserSync() {
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  const { user, isLoaded } = useUser();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !user || syncedRef.current) return;
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
          }, token);
        }
      } catch (err) {
        console.error("Failed to sync user to backend:", err);
      }
    })();
  }, [getToken, isAuthLoaded, isLoaded, user]);

  return null;
}
