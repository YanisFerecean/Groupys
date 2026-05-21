"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

interface CommunityRes {
  id: string;
  name: string;
  description: string | null;
  genre: string | null;
  country: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  iconType: string | null;
  iconUrl: string | null;
  tags: string[];
  artistId?: number | null;
  memberCount: number;
  createdById: string;
  createdAt: string;
  blacklistedWords?: string[];
}

interface ModerationTabProps {
  community: CommunityRes;
  onSaved: (updated: CommunityRes) => void;
}

export default function ModerationTab({ community, onSaved }: ModerationTabProps) {
  const { getToken } = useAuth();
  const [words, setWords] = useState<string[]>(community.blacklistedWords ?? []);
  const [wordInput, setWordInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addWord = (word: string) => {
    const normalized = word.trim().toLowerCase();
    if (normalized && !words.includes(normalized)) {
      setWords((prev) => [...prev, normalized]);
      setWordInput("");
    }
  };

  const removeWord = (word: string) => setWords((prev) => prev.filter((w) => w !== word));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addWord(wordInput); }
    if (e.key === "Backspace" && !wordInput && words.length > 0) setWords((prev) => prev.slice(0, -1));
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/communities/${community.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: community.name,
          description: community.description,
          genre: community.genre,
          country: community.country,
          tags: community.tags,
          artistId: community.artistId || null,
          imageUrl: community.imageUrl || null,
          bannerUrl: community.bannerUrl || null,
          iconType: community.iconType || null,
          iconUrl: community.iconUrl || null,
          blacklistedWords: words,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save");
      }

      const updated: CommunityRes = await res.json();
      toast.success("Blacklist updated");
      onSaved(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-on-surface mb-1">Word Blacklist</h3>
        <p className="text-xs text-on-surface-variant mb-4">
          Posts and comments containing these words will be rejected. Words are case-insensitive.
        </p>

        <div className="flex flex-wrap gap-2 bg-surface-container-high rounded-xl px-3 py-2.5 min-h-[48px] items-center focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
          {words.map((word) => (
            <span key={word} className="inline-flex items-center gap-1 bg-error/10 text-error text-xs font-semibold px-2.5 py-1 rounded-full">
              {word}
              <button type="button" onClick={() => removeWord(word)} className="hover:text-error/70 transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
              </button>
            </span>
          ))}
          <input
            type="text"
            value={wordInput}
            onChange={(e) => setWordInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-[140px] bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-outline"
            placeholder={words.length === 0 ? "Type a word and press Enter" : "Add another word…"}
          />
        </div>

        {words.length > 0 && (
          <p className="text-xs text-on-surface-variant mt-2">
            {words.length} word{words.length !== 1 ? "s" : ""} blocked
          </p>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={submitting}
        className="w-full py-3 rounded-xl text-sm font-bold text-on-primary bg-primary hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Save Blacklist"}
      </button>
    </div>
  );
}
