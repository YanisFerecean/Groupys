"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import SideNav from "@/components/app/SideNav";
import TopBar from "@/components/app/TopBar";
import SearchOverlay from "@/components/discover/SearchOverlay";
import SettingsDialog from "@/components/app/SettingsDialog";
import CreatePostModal from "@/components/ui/CreatePostModal";
import { fetchUserByClerkId } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const { getToken, isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  useWebSocket();

  // Extract community ID if on a community detail page
  const communityMatch = pathname?.match(/^\/discover\/community\/([^/]+)$/);
  const currentCommunityId = communityMatch?.[1];

  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const onboardingCheckedRef = useRef(false);

  // Redirect unauthenticated users to home
  useEffect(() => {
    if (isAuthLoaded && !isSignedIn) {
      router.replace("/");
    }
  }, [isAuthLoaded, isSignedIn, router]);

  // Load spotify connection status from backend
  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !isSignedIn || !user) return;
    getTokenRef.current().then((token) => {
      fetchUserByClerkId(user.id, token).then((bu) => {
        if (bu) setSpotifyConnected(bu.spotifyConnected);
      });
    });
  }, [isLoaded, isAuthLoaded, isSignedIn, user]);

  // Redirect new users (no onboarding done yet) to the onboarding flow
  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !isSignedIn || !user) return;
    if (onboardingCheckedRef.current) return;
    if (pathname?.startsWith("/onboarding")) return;

    onboardingCheckedRef.current = true;

    const key = `onboarding_done_${user.id}`;
    if (localStorage.getItem(key)) return;

    getTokenRef.current().then((token) => {
      fetchUserByClerkId(user.id, token).then((bu) => {
        if (!bu) return;
        // Existing users who already have widget data skip onboarding automatically
        const hasData = !!bu.widgets && bu.widgets !== "[]" && bu.widgets !== "null";
        if (hasData) {
          localStorage.setItem(key, "true");
        } else {
          router.replace("/onboarding");
        }
      }).catch(() => {/* non-critical — don't block the app */});
    });
  }, [isLoaded, isAuthLoaded, isSignedIn, user, pathname, router]);

  const handleSpotifyDisconnected = useCallback(() => {
    setSpotifyConnected(false);
  }, []);

  if (!isAuthLoaded || !isSignedIn) return null;

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <SideNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <TopBar
        onMenuClick={() => setSidebarOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
        onSettingsClick={() => setSettingsOpen(true)}
      />
      <main className="lg:ml-64 pt-16 lg:pt-20 min-h-screen">{children}</main>

      {/* Floating action button — hidden in DMs */}
      {!pathname.startsWith("/chat") && (
        <button
          onClick={() => setCreatePostOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-on-primary shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center"
          aria-label="Create post"
        >
          <span className="material-symbols-outlined text-2xl">add</span>
        </button>
      )}

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        spotifyConnected={spotifyConnected}
        onSpotifyDisconnected={handleSpotifyDisconnected}
      />
      <CreatePostModal
        open={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        initialCommunityId={currentCommunityId}
      />
    </div>
  );
}
