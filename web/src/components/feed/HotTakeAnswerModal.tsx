"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchCommunities, searchUsers, type BackendUser, type CommunityRes } from "@/lib/api";
import { submitHotTakeAnswer, type HotTakeRes } from "@/lib/hot-take-api";
import MusicSearchInput, {
  type ArtistResult,
  type TrackResult,
  type AlbumResult,
} from "@/components/profile/MusicSearchInput";

interface Pending {
  name: string;
  imageUrl: string | null;
  musicType: string;
}

function UserSearchInput({ onSelect, token }: { onSelect: (name: string, img: string | null) => void; token: string | null }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BackendUser[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (q.length < 2) { setResults([]); setOpen(false); return; }
      try { const d = await searchUsers(q, token); setResults(d); setOpen(d.length > 0); } catch { setResults([]); }
    }, 300);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input value={query} onChange={(e) => handleChange(e.target.value)} onFocus={() => { if (results.length > 0) setOpen(true); }} placeholder="Search for a user..." />
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-surface-container bg-surface shadow-xl">
          {results.map((r) => (
            <button key={r.id} type="button" className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface-container-low transition-colors" onClick={() => { onSelect(r.displayName ?? r.username, r.profileImage ?? null); setOpen(false); setQuery(""); setResults([]); }}>
              {r.profileImage ? (
                <Image src={r.profileImage} alt={r.username} width={40} height={40} className="rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-surface-variant text-base">person</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.displayName ?? r.username}</p>
                <p className="text-xs text-on-surface-variant truncate">@{r.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CommunitySearchInput({ onSelect, token }: { onSelect: (name: string, img: string | null) => void; token: string | null }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommunityRes[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (q.length < 2) { setResults([]); setOpen(false); return; }
      try { const d = await searchCommunities(q, token); setResults(d); setOpen(d.length > 0); } catch { setResults([]); }
    }, 300);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input value={query} onChange={(e) => handleChange(e.target.value)} onFocus={() => { if (results.length > 0) setOpen(true); }} placeholder="Search for a community..." />
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-surface-container bg-surface shadow-xl">
          {results.map((r) => (
            <button key={r.id} type="button" className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface-container-low transition-colors" onClick={() => { onSelect(r.name, null); setOpen(false); setQuery(""); setResults([]); }}>
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.name}</p>
                {r.genre && <p className="text-xs text-on-surface-variant truncate">{r.genre}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface HotTakeAnswerModalProps {
  open: boolean;
  hotTake: HotTakeRes;
  onClose: () => void;
  onAnswered: () => void;
}

export default function HotTakeAnswerModal({ open, hotTake, onClose, onAnswered }: HotTakeAnswerModalProps) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [freeText, setFreeText] = useState("");
  const [showOnWidget, setShowOnWidget] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      getTokenRef.current().then(setToken);
      setPending(null);
      setFreeText("");
      setShowOnWidget(false);
    }
  }, [open]);

  const answerType = hotTake.answerType;
  const isFreeText = answerType === "FREETEXT";
  const canSubmit = isFreeText ? freeText.trim().length > 0 : !!pending;

  const answerTypeIcon =
    answerType === "SONG" ? "music_note" :
    answerType === "ALBUM" ? "album" :
    answerType === "COMMUNITY" ? "group" :
    answerType === "USER" ? "person" :
    "person";

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const tok = await getTokenRef.current();
      await submitHotTakeAnswer(
        hotTake.id,
        isFreeText ? freeText.trim() : pending!.name,
        isFreeText ? null : pending!.imageUrl,
        isFreeText ? null : pending!.musicType,
        showOnWidget,
        tok,
      );
      window.dispatchEvent(new Event("hot-take-answered"));
      onAnswered();
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
              local_fire_department
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Hot Take{hotTake.weekLabel ? ` · ${hotTake.weekLabel}` : ""}
            </span>
          </div>
          <DialogTitle className="text-base font-bold leading-snug text-left">
            {hotTake.question}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {isFreeText ? (
            <Input
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Type your answer..."
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            />
          ) : pending ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container">
              {pending.imageUrl ? (
                <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                  <Image src={pending.imageUrl} alt={pending.name} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>{answerTypeIcon}</span>
                </div>
              )}
              <p className="flex-1 min-w-0 text-sm font-semibold truncate">{pending.name}</p>
              <button type="button" onClick={() => setPending(null)} className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
          ) : answerType === "ARTIST" ? (
            <MusicSearchInput type="artist" placeholder="Search for an artist..." onSelect={(r: ArtistResult) => setPending({ name: r.name, imageUrl: r.imageUrl || null, musicType: "ARTIST" })} />
          ) : answerType === "ALBUM" ? (
            <MusicSearchInput type="album" placeholder="Search for an album..." onSelect={(r: AlbumResult) => setPending({ name: `${r.title} — ${r.artist}`, imageUrl: r.coverUrl || null, musicType: "ALBUM" })} />
          ) : answerType === "SONG" ? (
            <MusicSearchInput type="track" placeholder="Search for a song..." onSelect={(r: TrackResult) => setPending({ name: `${r.title} — ${r.artist}`, imageUrl: r.coverUrl || null, musicType: "SONG" })} />
          ) : answerType === "USER" ? (
            <UserSearchInput token={token} onSelect={(name, imageUrl) => setPending({ name, imageUrl, musicType: "USER" })} />
          ) : answerType === "COMMUNITY" ? (
            <CommunitySearchInput token={token} onSelect={(name, imageUrl) => setPending({ name, imageUrl, musicType: "COMMUNITY" })} />
          ) : null}

          {(canSubmit || isFreeText) && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showOnWidget}
                onChange={(e) => setShowOnWidget(e.target.checked)}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-xs text-on-surface-variant">Show on my profile widget</span>
            </label>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit my pick"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
