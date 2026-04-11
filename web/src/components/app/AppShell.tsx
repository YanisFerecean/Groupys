"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import SideNav from "@/components/app/SideNav";
import TopBar from "@/components/app/TopBar";
import ProfileRightSidebar from "@/components/profile/ProfileRightSidebar";
import SearchOverlay from "@/components/discover/SearchOverlay";
import SettingsDialog from "@/components/app/SettingsDialog";
import CreatePostModal from "@/components/ui/CreatePostModal";
import { fetchUserByClerkId } from "@/lib/api";
import { fetchConversations } from "@/lib/chat-api";
import { useConversationStore } from "@/store/conversationStore";
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

  // Load conversations once on auth so the sidebar badge is always populated
  useEffect(() => {
    if (!isAuthLoaded || !isSignedIn) return;
    getTokenRef.current().then(async (token) => {
      try {
        const convos = await fetchConversations(token, undefined, 50);
        useConversationStore.getState().setConversations(convos);
      } catch { /* non-critical */ }
    });
  }, [isAuthLoaded, isSignedIn]);

  const handleSpotifyDisconnected = useCallback(() => {
    setSpotifyConnected(false);
  }, []);

  if (!isAuthLoaded || !isSignedIn) return null;

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <SideNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} onSettingsClick={() => setSettingsOpen(true)} onCreatePost={() => setCreatePostOpen(true)} />
      <TopBar
        onMenuClick={() => setSidebarOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
      />
      <ProfileRightSidebar />
      <main className={`lg:ml-64 pt-16 lg:pt-20 min-h-screen${pathname === "/profile" ? " lg:mr-52" : ""}`}>{children}</main>

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
