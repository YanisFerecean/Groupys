"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchSpotifyAuthUrl, disconnectSpotify } from "@/lib/spotify";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spotifyConnected: boolean;
  onSpotifyDisconnected: () => void;
}

export default function SettingsDialog({
  open,
  onOpenChange,
  spotifyConnected,
  onSpotifyDisconnected,
}: SettingsDialogProps) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const url = await fetchSpotifyAuthUrl(token);
      window.location.href = url;
    } catch (err) {
      console.error("Failed to connect Spotify:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      await disconnectSpotify(token);
      onSpotifyDisconnected();
    } catch (err) {
      console.error("Failed to disconnect Spotify:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Connections
            </h3>

            <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[#1DB954]">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Spotify</p>
                <p className="text-xs text-on-surface-variant">
                  {spotifyConnected
                    ? "Your account is connected"
                    : "Connect to import your music data"}
                </p>
              </div>

              {spotifyConnected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="shrink-0"
                >
                  {loading ? "..." : "Disconnect"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="shrink-0 bg-[#1DB954] hover:bg-[#1ed760] text-white"
                  onClick={handleConnect}
                  disabled={loading}
                >
                  {loading ? "Connecting..." : "Connect"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
