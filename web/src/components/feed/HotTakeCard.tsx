"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import {
  fetchCurrentHotTake,
  fetchFriendsHotTakeAnswers,
  fetchMyHotTakeAnswer,
  submitHotTakeAnswer,
  type HotTakeAnswerRes,
  type HotTakeRes,
} from "@/lib/hot-take-api";
import { searchCommunities, searchUsers, type BackendUser, type CommunityRes } from "@/lib/api";
import { useHotTakeStore } from "@/store/hotTakeStore";
import MusicSearchInput, {
  type ArtistResult,
  type TrackResult,
  type AlbumResult,
} from "@/components/profile/MusicSearchInput";
import { Input } from "@/components/ui/input";

interface Pending {
  name: string;
  imageUrl: string | null;
  musicType: string;
}

// ── User / community search inputs ──────────────────────────────────────────

function UserSearchInput({ onSelect, token }: { onSelect: (name: string, imageUrl: string | null) => void; token: string | null }) {
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
      try {
        const data = await searchUsers(q, token);
        setResults(data);
        setOpen(data.length > 0);
      } catch { setResults([]); }
    }, 300);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input value={query} onChange={(e) => handleChange(e.target.value)} onFocus={() => { if (results.length > 0) setOpen(true); }} placeholder="Search for a user…" />
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

function CommunitySearchInput({ onSelect, token }: { onSelect: (name: string, imageUrl: string | null) => void; token: string | null }) {
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
      try {
        const data = await searchCommunities(q, token);
        setResults(data);
        setOpen(data.length > 0);
      } catch { setResults([]); }
    }, 300);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input value={query} onChange={(e) => handleChange(e.target.value)} onFocus={() => { if (results.length > 0) setOpen(true); }} placeholder="Search for a community…" />
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

// ── Friends picks row ────────────────────────────────────────────────────────

function FriendPickRow({ answer }: { answer: HotTakeAnswerRes }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {answer.profileImage ? (
        <Image src={answer.profileImage} alt={answer.displayName ?? answer.username} width={32} height={32} className="rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>person</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{answer.displayName ?? answer.username}</p>
        <p className="text-xs text-on-surface-variant truncate">{answer.answer}</p>
      </div>
      {answer.imageUrl && (
        <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0">
          <Image src={answer.imageUrl} alt={answer.answer} fill className="object-cover" />
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function HotTakeCard() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const [hotTake, setHotTake] = useState<HotTakeRes | null>(null);
  const [myAnswer, setMyAnswer] = useState<HotTakeAnswerRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [freeText, setFreeText] = useState("");
  const [showOnWidget, setShowOnWidget] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);

  const [dismissed, setDismissed] = useState(false);
  const setHasUnanswered = useHotTakeStore((s) => s.setHasUnanswered);
  const [friendsAnswers, setFriendsAnswers] = useState<HotTakeAnswerRes[]>([]);
  const [friendsExpanded, setFriendsExpanded] = useState(false);

  const loadFriends = useCallback(async () => {
    const token = await getTokenRef.current();
    const data = await fetchFriendsHotTakeAnswers(token);
    setFriendsAnswers(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tok = await getTokenRef.current();
        const [ht, answer] = await Promise.all([
          fetchCurrentHotTake(),
          fetchMyHotTakeAnswer(tok),
        ]);
        if (!cancelled) {
          setToken(tok);
          setHotTake(ht);
          setMyAnswer(answer);
          if (ht && localStorage.getItem(`hot-take-dismissed-${ht.id}`) === "1") {
            setDismissed(true);
          }
          if (answer) loadFriends();
        }
      } catch {
        // silently fail — card just won't render
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadFriends]);

  // Listen for answer events from the sidebar modal
  useEffect(() => {
    const handler = async () => {
      const token = await getTokenRef.current();
      const answer = await fetchMyHotTakeAnswer(token);
      setMyAnswer(answer);
      setEditing(false);
      if (answer) loadFriends();
    };
    window.addEventListener("hot-take-answered", handler);
    return () => window.removeEventListener("hot-take-answered", handler);
  }, [loadFriends]);

  async function handleSubmit() {
    if (!hotTake) return;
    const answerType = hotTake.answerType;
    const isFreeText = answerType === "FREETEXT";
    if (isFreeText && !freeText.trim()) return;
    if (!isFreeText && !pending) return;

    setSubmitting(true);
    try {
      const token = await getTokenRef.current();
      const result = await submitHotTakeAnswer(
        hotTake.id,
        isFreeText ? freeText.trim() : pending!.name,
        isFreeText ? null : pending!.imageUrl,
        isFreeText ? null : pending!.musicType,
        showOnWidget,
        token,
      );
      setMyAnswer(result);
      setPending(null);
      setFreeText("");
      setEditing(false);
      window.dispatchEvent(new Event("hot-take-answered"));
      loadFriends();
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !hotTake || dismissed) return null;

  const answerType = hotTake.answerType;
  const answered = !!myAnswer && !editing;
  const isFreeText = answerType === "FREETEXT";
  const canSubmit = isFreeText ? freeText.trim().length > 0 : !!pending;

  const answerTypeIcon =
    answerType === "SONG" ? "music_note" :
    answerType === "ALBUM" ? "album" :
    answerType === "COMMUNITY" ? "group" :
    answerType === "USER" ? "person" :
    "person";

  return (
    <div className="rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/10 via-surface-container-low to-surface-container-low mb-6">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Hot Take
              {hotTake.weekLabel ? ` · ${hotTake.weekLabel}` : ""}
            </span>
          </div>
          <p className="text-base font-bold text-on-surface leading-snug">
            {hotTake.question}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {answered && (
            <button
              type="button"
              onClick={() => { setEditing(true); setPending(null); setFreeText(""); setShowOnWidget(false); }}
              className="text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Change
            </button>
          )}
          <button
            type="button"
            onClick={() => { localStorage.setItem(`hot-take-dismissed-${hotTake.id}`, "1"); setDismissed(true); setHasUnanswered(false); }}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
            aria-label="Dismiss hot take"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
      </div>

      {/* Answered state */}
      {answered && myAnswer && (
        <div className="px-5 pb-4 flex items-center gap-3">
          {myAnswer.imageUrl ? (
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow">
              <Image src={myAnswer.imageUrl} alt={myAnswer.answer} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}
              >
                {myAnswer.musicType === "SONG" || myAnswer.musicType === "track" ? "music_note" :
                 myAnswer.musicType === "ALBUM" || myAnswer.musicType === "album" ? "album" :
                 myAnswer.musicType === "COMMUNITY" ? "group" :
                 myAnswer.musicType === "USER" ? "person" : "local_fire_department"}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs text-on-surface-variant mb-0.5">Your pick</p>
            <p className="font-bold text-sm text-on-surface truncate">{myAnswer.answer}</p>
          </div>
          <span
            className="material-symbols-outlined text-primary ml-auto shrink-0"
            style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>
      )}

      {/* Input state */}
      {!answered && (
        <div className="px-5 pb-5 space-y-3">
          {isFreeText ? (
            <Input
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Type your answer…"
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
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
                    {answerTypeIcon}
                  </span>
                </div>
              )}
              <p className="flex-1 min-w-0 text-sm font-semibold truncate">{pending.name}</p>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
          ) : answerType === "ARTIST" ? (
            <MusicSearchInput
              type="artist"
              placeholder="Search for an artist…"
              onSelect={(r: ArtistResult) => setPending({ name: r.name, imageUrl: r.imageUrl || null, musicType: "ARTIST" })}
            />
          ) : answerType === "ALBUM" ? (
            <MusicSearchInput
              type="album"
              placeholder="Search for an album…"
              onSelect={(r: AlbumResult) => setPending({ name: `${r.title} — ${r.artist}`, imageUrl: r.coverUrl || null, musicType: "ALBUM" })}
            />
          ) : answerType === "SONG" ? (
            <MusicSearchInput
              type="track"
              placeholder="Search for a song…"
              onSelect={(r: TrackResult) => setPending({ name: `${r.title} — ${r.artist}`, imageUrl: r.coverUrl || null, musicType: "SONG" })}
            />
          ) : answerType === "USER" ? (
            <UserSearchInput
              token={token}
              onSelect={(name, imageUrl) => setPending({ name, imageUrl, musicType: "USER" })}
            />
          ) : answerType === "COMMUNITY" ? (
            <CommunitySearchInput
              token={token}
              onSelect={(name, imageUrl) => setPending({ name, imageUrl, musicType: "COMMUNITY" })}
            />
          ) : null}

          {/* Consent + submit */}
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
            {submitting ? "Submitting…" : "Submit my pick"}
          </button>
        </div>
      )}

      {/* Friends' picks */}
      <div className="border-t border-surface-container-high/50">
        {answered ? (
          <div className="px-5 py-3">
            <button
              type="button"
              onClick={() => setFriendsExpanded((e) => !e)}
              className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors w-full"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>group</span>
              See what your friends picked
              <span className="material-symbols-outlined ml-auto" style={{ fontSize: 16 }}>
                {friendsExpanded ? "expand_less" : "expand_more"}
              </span>
            </button>
            {friendsExpanded && (
              <div className="mt-2 divide-y divide-surface-container-high/50">
                {friendsAnswers.length === 0 ? (
                  <p className="text-xs text-on-surface-variant py-3 text-center">
                    None of your friends have shared their pick yet.
                  </p>
                ) : (
                  friendsAnswers.map((a) => <FriendPickRow key={a.id} answer={a} />)
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-3 flex items-center gap-2">
            <div className="flex-1 blur-sm pointer-events-none select-none">
              <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>group</span>
                See what your friends picked
              </div>
            </div>
            <span className="text-xs text-on-surface-variant/60 shrink-0">Answer first to unlock</span>
          </div>
        )}
      </div>
    </div>
  );
}
