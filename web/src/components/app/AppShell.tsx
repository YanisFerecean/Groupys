"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import SideNav from "@/components/app/SideNav";
import TopBar from "@/components/app/TopBar";
import SearchOverlay from "@/components/discover/SearchOverlay";
import SettingsDialog from "@/components/app/SettingsDialog";
import { fetchUserByClerkId } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const { getToken, isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { user, isLoaded } = useUser();
  const router = useRouter();
  useWebSocket();

  // Redirect unauthenticated users to home
  useEffect(() => {
    if (isAuthLoaded && !isSignedIn) {
      router.replace("/");
    }
  }, [isAuthLoaded, isSignedIn, router]);

  // Load spotify connection status from backend
  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !isSignedIn || !user) return;
    getToken().then((token) => {
      fetchUserByClerkId(user.id, token).then((bu) => {
        if (bu) setSpotifyConnected(bu.spotifyConnected);
      });
    });
  }, [isLoaded, isAuthLoaded, isSignedIn, user, getToken]);

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
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        spotifyConnected={spotifyConnected}
        onSpotifyDisconnected={handleSpotifyDisconnected}
      />
    </div>
  );
}
