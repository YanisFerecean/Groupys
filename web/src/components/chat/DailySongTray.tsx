"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ExternalLink, Music, Pause, Play, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useUserStore } from "@/store/userStore";
import { usePreviewPlayer } from "@/hooks/usePreviewPlayer";
import { ApiError, DailySong, deleteDailySong, fetchDailySongFeed, postDailySong } from "@/lib/chat-api";
import { safeHttpUrl } from "@/lib/mediaUrl";
import { MusicPickerModal } from "@/components/music/MusicPickerModal";
import { MusicCardArtwork } from "@/components/music/MusicCardArtwork";
import type { TrackPayload } from "@/types/chat";

const FEED_REFRESH_COOLDOWN_MS = 15_000;
const RATE_LIMIT_BACKOFF_MS = 60_000;

function initials(name: string | null, username: string): string {
  return (name || username || "?").charAt(0).toUpperCase();
}

/** Status-style daily-song tray at the top of the inbox: post yours, tap a friend's to preview. */
export function DailySongTray() {
  const { getToken } = useAuth();
  const myUserId = useUserStore((s) => s.backendUserId);
  const preview = usePreviewPlayer();
  const [feed, setFeed] = useState<DailySong[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [viewing, setViewing] = useState<DailySong | null>(null);
  const getTokenRef = useRef(getToken);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const nextLoadAtRef = useRef(0);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const load = useCallback((force = false): Promise<void> => {
    const now = Date.now();
    if (inFlightRef.current) return inFlightRef.current;
    if (!force && now < nextLoadAtRef.current) return Promise.resolve();
    nextLoadAtRef.current = now + FEED_REFRESH_COOLDOWN_MS;
    const request = (async () => {
      try {
        const token = await getTokenRef.current();
        setFeed(await fetchDailySongFeed(token));
      } catch (e) {
        if (e instanceof ApiError && e.status === 429) nextLoadAtRef.current = Date.now() + RATE_LIMIT_BACKOFF_MS;
      }
    })();
    inFlightRef.current = request;
    void request.finally(() => {
      if (inFlightRef.current === request) inFlightRef.current = null;
    });
    return request;
  }, []);

  useEffect(() => {
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const mine = feed.find((s) => s.userId === myUserId) ?? null;
  const others = feed.filter((s) => s.userId !== myUserId);

  const handlePost = async (track: TrackPayload) => {
    setPickerOpen(false);
    try {
      const token = await getTokenRef.current();
      const { type: _type, ...ref } = track;
      void _type;
      await postDailySong(ref as unknown as Record<string, unknown>, token);
      await load(true);
      toast.success("Daily song posted");
    } catch {
      toast.error("Couldn't post your daily song");
    }
  };

  const handleClear = async () => {
    try {
      const token = await getTokenRef.current();
      await deleteDailySong(token);
      preview.stop();
      setViewing(null);
      await load(true);
    } catch {
      toast.error("Couldn't clear your daily song");
    }
  };

  const closeViewer = () => {
    preview.stop();
    setViewing(null);
  };

  const viewingIsMine = !!viewing && viewing.userId === myUserId;
  const viewingTrackId = viewing ? `daily:${viewing.userId}` : "";
  const viewingPlaying = !!viewing && preview.isPlaying(viewingTrackId);
  const viewingPreview = viewing ? safeHttpUrl(viewing.track.previewUrl) : null;
  const viewingProgress =
    viewingPlaying && preview.durationSec > 0 ? Math.min(1, preview.positionSec / preview.durationSec) : 0;
  const openUrl = viewing
    ? safeHttpUrl(viewing.track.appleMusicUrl) ??
      `https://music.apple.com/search?term=${encodeURIComponent(`${viewing.track.title} ${viewing.track.artist ?? ""}`.trim())}`
    : null;

  return (
    <div className="border-b border-surface-container-high">
      <div className="flex gap-3 overflow-x-auto px-3 py-3 custom-scrollbar">
        {/* Your song / compose */}
        <button
          type="button"
          onClick={() => (mine ? setViewing(mine) : setPickerOpen(true))}
          className="flex flex-col items-center w-16 shrink-0"
          title={mine ? "Your daily song" : "Add your daily song"}
        >
          <span
            className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden border-2 ${
              mine ? "border-primary" : "border-dashed border-primary"
            }`}
          >
            {mine && safeHttpUrl(mine.track.artworkUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={safeHttpUrl(mine.track.artworkUrl)!} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : mine ? (
              <Music className="w-5 h-5 text-primary" />
            ) : (
              <Plus className="w-5 h-5 text-primary" />
            )}
          </span>
          <span className="mt-1 text-[11px] font-medium text-on-surface truncate w-full text-center">
            {mine ? "Your song" : "Add song"}
          </span>
        </button>

        {others.map((item) => {
          const art = safeHttpUrl(item.track.artworkUrl);
          const avatar = safeHttpUrl(item.profileImage);
          return (
            <button
              key={item.userId}
              type="button"
              onClick={() => setViewing(item)}
              className="flex flex-col items-center w-16 shrink-0"
              title={`${item.displayName || item.username}: ${item.track.title}`}
            >
              <span className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden border-2 border-tertiary bg-surface-container-high">
                {art || avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={(art ?? avatar)!} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <span className="text-base font-bold text-primary">{initials(item.displayName, item.username)}</span>
                )}
              </span>
              <span className="mt-1 text-[11px] font-medium text-on-surface truncate w-full text-center">
                {item.displayName || item.username}
              </span>
            </button>
          );
        })}
      </div>

      {pickerOpen && (
        <MusicPickerModal title="Your daily song" onClose={() => setPickerOpen(false)} onPickTrack={(t) => void handlePost(t)} />
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeViewer}>
          <div
            role="dialog"
            aria-label="Daily song"
            className="w-full max-w-sm rounded-3xl bg-surface border border-surface-container-high shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-semibold text-on-surface-variant truncate">
                {viewingIsMine ? "Your daily song" : `${viewing.displayName || viewing.username}’s daily song`}
              </p>
              <button
                onClick={closeViewer}
                className="h-8 w-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-surface-container-high p-3">
              <MusicCardArtwork url={viewing.track.artworkUrl} alt={viewing.track.title} size={64} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] text-on-surface truncate">{viewing.track.title}</p>
                <p className="text-[13px] text-on-surface-variant truncate">{viewing.track.artist}</p>
                {viewingPreview && (
                  <div className="mt-2 h-1 rounded-full bg-surface-container overflow-hidden">
                    <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${viewingProgress * 100}%` }} />
                  </div>
                )}
              </div>
              {viewingPreview && (
                <button
                  type="button"
                  onClick={() => preview.play(viewingTrackId, viewingPreview)}
                  className="h-10 w-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0"
                  title={viewingPlaying ? "Pause preview" : "Play 30s preview"}
                >
                  {viewingPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              {openUrl && (
                <a
                  href={openUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-surface-container-high py-2 text-[13px] font-semibold text-on-surface hover:bg-surface-container-highest"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open
                </a>
              )}
              {viewingIsMine && (
                <button
                  type="button"
                  onClick={() => void handleClear()}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-error/30 py-2 text-[13px] font-semibold text-error hover:bg-error/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
