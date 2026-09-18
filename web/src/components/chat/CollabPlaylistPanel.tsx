"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ListMusic, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { CollabPlaylist, CollabPlaylistTrack, fetchCollabPlaylist } from "@/lib/chat-api";
import { chatWs } from "@/lib/ws";
import { MusicCardArtwork } from "@/components/music/MusicCardArtwork";
import { PreviewButton } from "@/components/music/PreviewButton";

interface CollabPlaylistPanelProps {
  conversationId: string;
  /** Bumped whenever the COLLAB_PLAYLIST card changes so the list refetches. */
  version: number;
  onClose: () => void;
}

/**
 * Full list of songs members added to this conversation's collaborative playlist — the web
 * analog of the mobile playlist screen. Anyone in the chat can preview or remove a song; the
 * server broadcasts the refreshed card to both members.
 */
export function CollabPlaylistPanel({ conversationId, version, onClose }: CollabPlaylistPanelProps) {
  const { getToken } = useAuth();
  const [playlist, setPlaylist] = useState<CollabPlaylist | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      setPlaylist(await fetchCollabPlaylist(conversationId, token));
    } catch {
      toast.error("Couldn't load the playlist");
    } finally {
      setLoading(false);
    }
  }, [conversationId, getToken]);

  useEffect(() => {
    void load();
  }, [load, version]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const remove = (track: CollabPlaylistTrack) => {
    if (!window.confirm(`Remove "${track.title}" from the playlist?`)) return;
    // Optimistically drop the row; MESSAGE_UPDATED → version bump refetches the truth.
    setPlaylist((prev) =>
      prev
        ? {
            ...prev,
            tracks: prev.tracks.filter((t) => t.trackId !== track.trackId),
            trackCount: Math.max(0, prev.trackCount - 1),
          }
        : prev
    );
    chatWs.send({ type: "COLLAB_PLAYLIST_REMOVE", conversationId, trackId: track.trackId });
  };

  const tracks = playlist?.tracks ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Collaborative playlist"
        className="w-full max-w-md rounded-3xl bg-surface border border-surface-container-high shadow-xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-on-surface flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-primary" />
              {playlist?.title || "Playlist"}
            </h3>
            <p className="text-[12px] text-on-surface-variant">
              {tracks.length === 1 ? "1 song added" : `${tracks.length} songs added`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {loading ? (
            <div className="space-y-2 animate-pulse p-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-surface-container-high" />
              ))}
            </div>
          ) : tracks.length === 0 ? (
            <div className="py-10 text-center px-6">
              <ListMusic className="w-8 h-8 mx-auto text-on-surface-variant mb-2" />
              <p className="text-sm font-medium text-on-surface">No songs added yet</p>
              <p className="text-[12px] text-on-surface-variant mt-1">
                Use “Add to playlist” on any song card in the chat to start building it together.
              </p>
            </div>
          ) : (
            tracks.map((t) => {
              const adder = t.addedByDisplayName || t.addedByUsername;
              return (
                <div key={t.trackId} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-surface-container">
                  <MusicCardArtwork url={t.artworkUrl ?? undefined} alt={t.title} size={48}>
                    {t.previewUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <PreviewButton
                          trackId={`collab:${t.trackId}`}
                          previewUrl={t.previewUrl}
                          className="h-7 w-7 rounded-full flex items-center justify-center bg-white/90 text-black"
                          iconClassName="w-3.5 h-3.5"
                        />
                      </div>
                    )}
                  </MusicCardArtwork>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-on-surface truncate">{t.title}</p>
                    <p className="text-[12px] text-on-surface-variant truncate">{t.artist}</p>
                    {adder && <p className="text-[11px] text-on-surface-variant truncate">Added by {adder}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(t)}
                    title={`Remove ${t.title}`}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
