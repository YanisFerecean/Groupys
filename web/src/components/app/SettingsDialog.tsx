"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { connectAppleMusicWeb, disconnectMusic, isAppleMusicWebMockEnabled } from "@/lib/appleMusic";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  musicConnected: boolean;
  onMusicConnected: () => void;
  onMusicDisconnected: () => void;
}

function AppleMusicIcon({ size = 20, monochrome = false }: { size?: number; monochrome?: boolean }) {
  return (
    <Image
      src="/logos/applemusic.svg"
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={monochrome ? "brightness-0 invert" : ""}
    />
  );
}

export default function SettingsDialog({
  open,
  onOpenChange,
  musicConnected,
  onMusicConnected,
  onMusicDisconnected,
}: SettingsDialogProps) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mockEnabled = isAppleMusicWebMockEnabled();

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      await connectAppleMusicWeb(token);
      onMusicConnected();
    } catch (err) {
      console.error("Failed to connect Apple Music:", err);
      setError(err instanceof Error ? err.message : "Failed to connect Apple Music.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      await disconnectMusic(token);
      onMusicDisconnected();
    } catch (err) {
      console.error("Failed to disconnect Apple Music:", err);
      setError(err instanceof Error ? err.message : "Failed to disconnect Apple Music.");
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

            {/* Apple Music card */}
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{ background: "linear-gradient(135deg, #2d0b12 0%, #45131f 60%, #2a0d15 100%)" }}
            >
              {/* Subtle background circles */}
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10" style={{ background: "#FA243C" }} />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full opacity-[0.07]" style={{ background: "#FA243C" }} />

              <div className="relative p-5">
                <div className="flex items-start gap-4">
                  {/* Apple Music icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255,255,255,0.95)" }}
                  >
                    <AppleMusicIcon size={24} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-white">Apple Music</p>
                      {musicConnected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "rgba(250,36,60,0.2)", color: "#FA243C" }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FA243C] inline-block" />
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 leading-snug">
                      {musicConnected
                        ? "Your music data is synced to your profile"
                        : mockEnabled
                          ? "Developer mock mode enabled for local Apple Music sync"
                          : "Connect to import your top tracks, artists, and currently playing"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  {musicConnected ? (
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
                      style={{ background: "#FA243C", color: "#fff" }}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                          Connecting…
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <AppleMusicIcon size={16} monochrome />
                          Connect Apple Music
                        </span>
                      )}
                    </button>
                  )}
                </div>

                {error && (
                  <p className="mt-3 text-xs text-red-300">{error}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
