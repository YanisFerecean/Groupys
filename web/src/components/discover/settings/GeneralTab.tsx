"use client";

import { useRef, useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import CountrySelect from "@/components/profile/CountrySelect";
import { resizeImage } from "@/lib/imageResize";
import { transferCommunityOwner, deleteCommunity } from "@/lib/api";

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

interface MemberRes {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  profileImage: string | null;
  role: string;
  joinedAt: string;
}

interface GeneralTabProps {
  community: CommunityRes;
  onSaved: (updated: CommunityRes) => void;
  members: MemberRes[];
  onMembersChange: (members: MemberRes[]) => void;
}

function avatarSrc(profileImage: string | null): string | null {
  if (!profileImage) return null;
  return profileImage.startsWith("http") ? profileImage : `${API_URL}${profileImage.replace(/^\/api/, "")}`;
}

function TransferPicker({
  candidates,
  communityId,
  onClose,
  onTransferred,
}: {
  candidates: MemberRes[];
  communityId: string;
  onClose: () => void;
  onTransferred: (newOwnerId: string) => void;
}) {
  const { getToken } = useAuth();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const filtered = search.trim()
    ? candidates.filter((m) => {
        const q = search.toLowerCase();
        return m.username.toLowerCase().includes(q) || (m.displayName ?? "").toLowerCase().includes(q);
      })
    : candidates;

  const handleConfirm = async () => {
    if (!selected) return;
    setConfirming(true);
    try {
      const token = await getToken();
      await transferCommunityOwner(communityId, selected, token);
      onTransferred(selected);
      toast.success("Ownership transferred successfully");
    } catch {
      toast.error("Failed to transfer ownership");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-primary/20 bg-surface-container-low p-4 space-y-3">
      <p className="text-sm font-semibold text-on-surface">Select new owner</p>

      <div className="flex items-center gap-2 bg-surface-container-high rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
        <span className="material-symbols-outlined text-on-surface-variant shrink-0" style={{ fontSize: 18 }}>search</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members…"
          className="flex-1 bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-outline"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        )}
      </div>

      <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
        {filtered.length === 0 && (
          <p className="text-xs text-on-surface-variant text-center py-4">No members match your search.</p>
        )}
        {filtered.map((m) => {
          const src = avatarSrc(m.profileImage);
          const isSelected = selected === m.userId;
          return (
            <button
              key={m.userId}
              type="button"
              onClick={() => setSelected(isSelected ? null : m.userId)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${
                isSelected ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-surface-container-high"
              }`}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-high shrink-0 flex items-center justify-center">
                {src ? (
                  <Image src={src} alt={m.displayName || m.username} width={32} height={32} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>person</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface truncate">{m.displayName || m.username}</p>
                <p className="text-xs text-on-surface-variant">@{m.username}</p>
              </div>
              {m.role === "admin" && (
                <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  Admin
                </span>
              )}
              {isSelected && (
                <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 rounded-xl text-sm font-semibold bg-surface-container-high text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selected || confirming}
          className="flex-1 py-2 rounded-xl text-sm font-bold bg-primary text-on-primary hover:brightness-110 transition-all disabled:opacity-50"
        >
          {confirming ? "Transferring…" : "Confirm Transfer"}
        </button>
      </div>
    </div>
  );
}

export default function GeneralTab({ community, onSaved, members, onMembersChange }: GeneralTabProps) {
  const { getToken } = useAuth();
  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description ?? "");
  const [country, setCountry] = useState(community.country ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(community.tags ?? []);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showTransferPicker, setShowTransferPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  const transferCandidates = members.filter((m) => m.role !== "owner");

  const handleDeleteCommunity = async () => {
    if (deleteInput !== community.name) return;
    setDeleting(true);
    try {
      const token = await getToken();
      await deleteCommunity(community.id, token);
      toast.success("Community deleted");
      router.push("/discover");
    } catch {
      toast.error("Failed to delete community");
      setDeleting(false);
    }
  };

  const handleTransferred = (newOwnerId: string) => {
    onMembersChange(
      members.map((m) => {
        if (m.role === "owner") return { ...m, role: "admin" };
        if (m.userId === newOwnerId) return { ...m, role: "owner" };
        return m;
      })
    );
    setShowTransferPicker(false);
  };

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

      {/* Danger Zone */}
      <div className="rounded-2xl bg-error p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">
          Danger Zone
        </p>
        <div>
          <button
            type="button"
            onClick={() => setShowTransferPicker((v) => !v)}
            className={`w-full py-2.5 rounded-2xl text-sm font-bold border transition-colors ${
              showTransferPicker
                ? "border-white/40 text-white bg-white/20"
                : "border-white/40 text-white hover:bg-white/10"
            }`}
          >
            Transfer Ownership
          </button>
          {showTransferPicker && (
            <TransferPicker
              candidates={transferCandidates}
              communityId={community.id}
              onClose={() => setShowTransferPicker(false)}
              onTransferred={handleTransferred}
            />
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => { setShowDeleteConfirm((v) => !v); setDeleteInput(""); }}
            className={`w-full py-2.5 rounded-2xl text-sm font-bold border transition-colors ${
              showDeleteConfirm
                ? "border-white/40 text-white bg-white/20"
                : "border-white/40 text-white hover:bg-white/10"
            }`}
          >
            Delete Community
          </button>
          {showDeleteConfirm && (
            <div className="mt-3 rounded-2xl border border-error/20 bg-surface-container-low p-4 space-y-3">
              <p className="text-sm font-semibold text-on-surface">Are you sure?</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                This will permanently delete <span className="font-semibold text-on-surface">{community.name}</span> along with all its posts, comments, banners, and icons. This cannot be undone.
              </p>
              <div>
                <p className="text-xs text-on-surface-variant mb-1.5">
                  Type <span className="font-semibold text-on-surface">{community.name}</span> to confirm
                </p>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder={community.name}
                  className="w-full bg-surface-container-high rounded-xl px-3 py-2 text-sm text-on-surface placeholder:text-outline border-none outline-none focus:ring-2 focus:ring-error/30 transition-shadow"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold bg-surface-container-high text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCommunity}
                  disabled={deleteInput !== community.name || deleting}
                  className="flex-1 py-2 rounded-xl text-sm font-bold bg-error text-on-error hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete Community"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
