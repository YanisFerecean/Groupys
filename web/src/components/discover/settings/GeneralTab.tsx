"use client";

import { useRef, useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import CountrySelect from "@/components/profile/CountrySelect";
import { resizeImage } from "@/lib/imageResize";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

const TAG_SUGGESTIONS = [
  "Fan Club", "Discussion", "Covers", "Live Shows", "Vinyl",
  "Lyrics", "Remixes", "Setlists", "News", "Throwbacks",
];

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_URL}${url.replace(/^\/api/, "")}`;
}

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

interface GeneralTabProps {
  community: CommunityRes;
  onSaved: (updated: CommunityRes) => void;
}

export default function GeneralTab({ community, onSaved }: GeneralTabProps) {
  const { getToken } = useAuth();
  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description ?? "");
  const [country, setCountry] = useState(community.country ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(community.tags ?? []);
  const [submitting, setSubmitting] = useState(false);

  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(resolveMediaUrl(community.iconUrl));
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(resolveMediaUrl(community.bannerUrl));

  useEffect(() => {
    return () => {
      if (iconFile && iconPreview) URL.revokeObjectURL(iconPreview);
      if (bannerFile && bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (iconFile && iconPreview) URL.revokeObjectURL(iconPreview);
    const resized = await resizeImage(file, 256, 256, true);
    setIconFile(resized);
    setIconPreview(URL.createObjectURL(resized));
    e.target.value = "";
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (bannerFile && bannerPreview) URL.revokeObjectURL(bannerPreview);
    const resized = await resizeImage(file, 1500, 500, true);
    setBannerFile(resized);
    setBannerPreview(URL.createObjectURL(resized));
    e.target.value = "";
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      setTags((prev) => [...prev, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
    if (e.key === "Backspace" && !tagInput && tags.length > 0) setTags((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSubmitting(true);
    try {
      const token = await getToken();

      const res = await fetch(`${API_URL}/communities/${community.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          genre: community.genre,
          country: country.trim() || null,
          tags,
          artistId: community.artistId || null,
          imageUrl: community.imageUrl || null,
          bannerUrl: community.bannerUrl || null,
          iconType: community.iconType || null,
          iconUrl: community.iconUrl || null,
          blacklistedWords: community.blacklistedWords ?? [],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update community");
      }

      let updated: CommunityRes = await res.json();

      if (iconFile) {
        const form = new FormData();
        form.append("file", iconFile, iconFile.name);
        const iconRes = await fetch(`${API_URL}/communities/${community.id}/icon`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        if (iconRes.ok) updated = await iconRes.json();
      }

      if (bannerFile) {
        const form = new FormData();
        form.append("file", bannerFile, bannerFile.name);
        const bannerRes = await fetch(`${API_URL}/communities/${community.id}/banner`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        if (bannerRes.ok) updated = await bannerRes.json();
      }

      toast.success("Community updated");
      onSaved(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const availableSuggestions = TAG_SUGGESTIONS.filter((s) => !tags.includes(s));

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      {/* Banner picker */}
      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">
          Banner
        </label>
        <button
          type="button"
          onClick={() => bannerInputRef.current?.click()}
          className="relative group w-full h-28 rounded-2xl overflow-hidden bg-surface-container-high border-2 border-dashed border-surface-container-highest hover:border-primary/40 transition-colors flex items-center justify-center"
        >
          {bannerPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-on-surface-variant">
              <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
              <span className="text-xs">Upload banner</span>
            </div>
          )}
          {bannerPreview && (
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-base">edit</span>
            </div>
          )}
        </button>
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
      </div>

      {/* Icon picker */}
      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">
          Community Icon
        </label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => iconInputRef.current?.click()}
            className="relative group w-16 h-16 rounded-2xl overflow-hidden bg-surface-container-high border-2 border-dashed border-surface-container-highest hover:border-primary/40 transition-colors flex items-center justify-center shrink-0"
          >
            {iconPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={iconPreview} alt="Icon" className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-on-surface-variant text-2xl group-hover:text-on-surface transition-colors">
                add_photo_alternate
              </span>
            )}
            {iconPreview && (
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-base">edit</span>
              </div>
            )}
          </button>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Square image recommended.<br />Displayed in the community sidebar.
          </p>
        </div>
        <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
      </div>

      {/* Name */}
      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
          Community Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="w-full bg-surface-container-high rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline border-none outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
          placeholder="Community name"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full bg-surface-container-high rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline border-none outline-none focus:ring-2 focus:ring-primary/30 transition-shadow resize-none"
          placeholder="What is this community about?"
        />
      </div>

      {/* Country */}
      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
          Country
        </label>
        <CountrySelect value={country} onChange={setCountry} placeholder="Select a country..." />
      </div>

      {/* Tags */}
      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
          Tags <span className="text-outline font-normal normal-case">(up to 5)</span>
        </label>
        <div className="flex flex-wrap gap-2 bg-surface-container-high rounded-xl px-3 py-2.5 min-h-[44px] items-center focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-primary/70 transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
              </button>
            </span>
          ))}
          {tags.length < 5 && (
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-outline"
              placeholder={tags.length === 0 ? "Type and press Enter" : ""}
            />
          )}
        </div>
        {availableSuggestions.length > 0 && tags.length < 5 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {availableSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addTag(s)}
                className="text-xs text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full hover:bg-surface-container-high transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting || !name.trim()}
        className="w-full py-3 rounded-xl text-sm font-bold text-on-primary bg-primary hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
