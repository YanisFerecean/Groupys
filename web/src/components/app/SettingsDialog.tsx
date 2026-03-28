"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchSpotifyAuthUrl, disconnectSpotify } from "@/lib/spotify";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spotifyConnected: boolean;
  onSpotifyDisconnected: () => void;
}

function SpotifyIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
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
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl">
        <div className="px-7 pt-7 pb-2">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">Settings</DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-7 pb-7 space-y-6">
          {/* Connections section */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3">
              Connections
            </p>

            {/* Spotify card */}
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{ background: "linear-gradient(135deg, #0f2012 0%, #1a3a1f 60%, #0d2b1a 100%)" }}
            >
              {/* Subtle background circles */}
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10" style={{ background: "#1DB954" }} />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full opacity-[0.07]" style={{ background: "#1DB954" }} />

              <div className="relative p-5">
                <div className="flex items-start gap-4">
                  {/* Spotify logo */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "#1DB954" }}
                  >
                    <SpotifyIcon size={24} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-white">Spotify</p>
                      {spotifyConnected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "rgba(29,185,84,0.2)", color: "#1DB954" }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] inline-block" />
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 leading-snug">
                      {spotifyConnected
                        ? "Your music data is synced to your profile"
                        : "Connect to import your top tracks, artists, and currently playing"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  {spotifyConnected ? (
                    <>
                      <div className="flex items-center gap-1.5 text-white/40 text-xs">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                        Account linked
                      </div>
                      <button
                        onClick={handleDisconnect}
                        disabled={loading}
                        className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                        style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
                      >
                        {loading ? "Disconnecting…" : "Disconnect"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleConnect}
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 hover:brightness-110 active:scale-[0.98]"
                      style={{ background: "#1DB954", color: "#000" }}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin inline-block" />
                          Connecting…
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <SpotifyIcon size={16} />
                          Connect Spotify
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
