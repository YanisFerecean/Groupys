"use client";

import { useState, useRef } from "react";
import type { ProfileCustomization } from "@/types/profile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ColorPickerField from "./ColorPickerField";
import BannerPicker from "./BannerPicker";
import MusicSearchInput from "./MusicSearchInput";
import type { TrackResult, ArtistResult, AlbumResult } from "./MusicSearchInput";
import { COUNTRIES } from "@/lib/countries";

// ── Clerk error parser ──────────────────────────────────────────────────────

interface ClerkAPIError {
  errors?: { message?: string; longMessage?: string; code?: string }[];
}

function parseClerkError(err: unknown, field: string): string {
  const clerkErr = err as ClerkAPIError;
  if (clerkErr?.errors?.length) {
    const first = clerkErr.errors[0];
    if (first.code === "form_identifier_exists") {
      return "This username is already taken.";
    }
    if (first.code === "form_param_format_invalid") {
      return "Invalid format. Only letters, numbers, and underscores are allowed.";
    }
    if (first.code === "form_param_too_short") {
      return "Too short — must be at least 3 characters.";
    }
    if (first.code === "form_param_too_long") {
      return "Too long — must be 64 characters or fewer.";
    }
    return first.longMessage ?? first.message ?? `Failed to update ${field}.`;
  }
  if (err instanceof Error) return err.message;
  return `Failed to update ${field}. Please try again.`;
}

// ── Props ───────────────────────────────────────────────────────────────────

interface ProfileEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileCustomization;
  currentUsername: string;
  currentAvatarUrl: string;
  onSave: (data: Partial<ProfileCustomization>) => Promise<void> | void;
  onUpdateUsername: (username: string) => Promise<void>;
  onUpdateProfileImage: (file: File) => Promise<void>;
  onRemoveProfileImage: () => Promise<void>;
  isSaving: boolean;
}

export default function ProfileEditDrawer({
  open,
  onOpenChange,
  profile,
  currentUsername,
  currentAvatarUrl,
  onSave,
  onUpdateUsername,
  onUpdateProfileImage,
  onRemoveProfileImage,
  isSaving,
}: ProfileEditDrawerProps) {
  const [form, setForm] = useState<ProfileCustomization>({ ...profile });
  const [username, setUsername] = useState(currentUsername);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setForm({ ...profile });
      setUsername(currentUsername);
      setAvatarPreview(null);
      setPendingAvatarFile(null);
      setRemoveAvatar(false);
      setErrors({});
    }
    onOpenChange(next);
  };

  const set = <K extends keyof ProfileCustomization>(
    key: K,
    value: ProfileCustomization[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setErrors({});

    if (username !== currentUsername && username.trim()) {
      try {
        await onUpdateUsername(username.trim());
      } catch (err: unknown) {
        const message = parseClerkError(err, "username");
        setErrors((prev) => ({ ...prev, username: message }));
        return;
      }
    }

    if (removeAvatar) {
      try {
        await onRemoveProfileImage();
      } catch (err: unknown) {
        const message = parseClerkError(err, "avatar");
        setErrors((prev) => ({ ...prev, avatar: message }));
        return;
      }
    } else if (pendingAvatarFile) {
      try {
        await onUpdateProfileImage(pendingAvatarFile);
      } catch (err: unknown) {
        const message = parseClerkError(err, "avatar");
        setErrors((prev) => ({ ...prev, avatar: message }));
        return;
      }
    }

    try {
      await onSave(form);
    } catch (err: unknown) {
      const message = parseClerkError(err, "profile");
      setErrors((prev) => ({ ...prev, general: message }));
      return;
    }

    onOpenChange(false);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingAvatarFile(file);
    setRemoveAvatar(false);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setRemoveAvatar(true);
    setPendingAvatarFile(null);
    setAvatarPreview(null);
  };

  const displayedAvatar = removeAvatar
    ? null
    : avatarPreview ?? currentAvatarUrl;

  // ── Music helpers ─────────────────────────────────────────────────────────

  const addSongFromSearch = (result: TrackResult) => {
    const songs = [...(form.topSongs ?? [])];
    if (songs.length < 3) {
      songs.push({
        title: result.title,
        artist: result.artist,
        coverUrl: result.coverUrl,
      });
      set("topSongs", songs);
    }
  };

  const removeSong = (index: number) => {
    const songs = [...(form.topSongs ?? [])];
    songs.splice(index, 1);
    set("topSongs", songs);
  };

  const addArtistFromSearch = (result: ArtistResult) => {
    const artists = [...(form.topArtists ?? [])];
    if (artists.length < 3) {
      artists.push({
        name: result.name,
        imageUrl: result.imageUrl,
      });
      set("topArtists", artists);
    }
  };

  const removeArtist = (index: number) => {
    const artists = [...(form.topArtists ?? [])];
    artists.splice(index, 1);
    set("topArtists", artists);
  };

  const addAlbumFromSearch = (result: AlbumResult) => {
    const albums = [...(form.topAlbums ?? [])];
    if (albums.length < 3) {
      albums.push({
        title: result.title,
        artist: result.artist,
        coverUrl: result.coverUrl,
      });
      set("topAlbums", albums);
    }
  };

  const removeAlbum = (index: number) => {
    const albums = [...(form.topAlbums ?? [])];
    albums.splice(index, 1);
    set("topAlbums", albums);
  };

  const setListeningFromSearch = (result: TrackResult) => {
    set("currentlyListening", {
      title: result.title,
      artist: result.artist,
      coverUrl: result.coverUrl,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Profile</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="w-full justify-start shrink-0 px-6">
            <TabsTrigger value="profile">
              <span className="material-symbols-outlined text-base">person</span>
              Profile
            </TabsTrigger>
            <TabsTrigger value="customization">
              <span className="material-symbols-outlined text-base">palette</span>
              Customization
            </TabsTrigger>
            <TabsTrigger value="widgets">
              <span className="material-symbols-outlined text-base">widgets</span>
              Widgets
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* ── Profile Tab ── */}
            <TabsContent value="profile" className="space-y-8">
              {/* Avatar */}
              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-surface-container-high shrink-0">
                    {displayedAvatar ? (
                      <img
                        src={displayedAvatar}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-surface-variant text-3xl">
                          person
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarSelect}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload New
                    </Button>
                    {(currentAvatarUrl || avatarPreview) && !removeAvatar && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-error"
                        onClick={handleRemoveAvatar}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                {avatarPreview && !errors.avatar && (
                  <p className="text-xs text-on-surface-variant">
                    New image selected — will be saved when you click Save.
                  </p>
                )}
                {errors.avatar && (
                  <p className="text-xs text-error font-medium">
                    {errors.avatar}
                  </p>
                )}
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors.username) setErrors((prev) => {
                      const { username: _, ...rest } = prev;
                      return rest;
                    });
                  }}
                  placeholder="Your username"
                  className={errors.username ? "border-error" : ""}
                />
                {errors.username && (
                  <p className="text-xs text-error font-medium">
                    {errors.username}
                  </p>
                )}
              </div>

              {/* Display Name & Country */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={form.displayName ?? ""}
                    onChange={(e) => set("displayName", e.target.value)}
                    placeholder="Your display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <select
                    value={form.country ?? ""}
                    onChange={(e) => set("country", e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select country...</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  value={form.bio ?? ""}
                  onChange={(e) => set("bio", e.target.value)}
                  placeholder="Tell people about yourself..."
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* ── Customization Tab ── */}
            <TabsContent value="customization" className="space-y-8">
              <BannerPicker
                value={form.bannerUrl ?? ""}
                onChange={(v) => set("bannerUrl", v)}
              />
              <div className="grid grid-cols-2 gap-4">
                <ColorPickerField
                  label="Accent Color"
                  value={form.accentColor ?? ""}
                  onChange={(v) => set("accentColor", v)}
                />
                <ColorPickerField
                  label="Name Color"
                  value={form.nameColor ?? ""}
                  onChange={(v) => set("nameColor", v)}
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                  Widget Colors
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <ColorPickerField
                    label="Albums"
                    value={form.albumsContainerColor ?? ""}
                    onChange={(v) => set("albumsContainerColor", v)}
                  />
                  <ColorPickerField
                    label="Songs"
                    value={form.songsContainerColor ?? ""}
                    onChange={(v) => set("songsContainerColor", v)}
                  />
                  <ColorPickerField
                    label="Artists"
                    value={form.artistsContainerColor ?? ""}
                    onChange={(v) => set("artistsContainerColor", v)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* ── Widgets Tab ── */}
            <TabsContent value="widgets" className="space-y-5">
              {/* Top Albums */}
              <div className="space-y-3 p-5 bg-surface-container-low rounded-xl">
                <Label className="font-bold">Top Albums</Label>
                {(form.topAlbums ?? []).map((album, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 bg-surface-container rounded-lg"
                  >
                    {album.coverUrl && (
                      <img
                        src={album.coverUrl}
                        alt={album.title}
                        className="w-10 h-10 rounded object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {album.title}
                      </p>
                      <p className="text-xs text-on-surface-variant truncate">
                        {album.artist}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAlbum(i)}
                      className="text-on-surface-variant hover:text-error transition-colors shrink-0"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                ))}
                {(form.topAlbums ?? []).length < 3 && (
                  <MusicSearchInput
                    type="album"
                    placeholder="Search to add an album..."
                    onSelect={addAlbumFromSearch}
                  />
                )}
              </div>

              {/* Currently Listening */}
              <div className="space-y-3 p-5 bg-surface-container-low rounded-xl">
                <Label className="font-bold">Currently Listening</Label>
                {form.currentlyListening?.title ? (
                  <div className="flex items-center gap-3 p-2 bg-surface-container rounded-lg">
                    {form.currentlyListening.coverUrl && (
                      <img
                        src={form.currentlyListening.coverUrl}
                        alt={form.currentlyListening.title}
                        className="w-12 h-12 rounded object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {form.currentlyListening.title}
                      </p>
                      <p className="text-xs text-on-surface-variant truncate">
                        {form.currentlyListening.artist}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => set("currentlyListening", undefined)}
                      className="text-on-surface-variant hover:text-error transition-colors shrink-0"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                ) : (
                  <MusicSearchInput
                    type="track"
                    placeholder="Search for a song..."
                    onSelect={setListeningFromSearch}
                  />
                )}
              </div>

              {/* Top Songs */}
              <div className="space-y-3 p-5 bg-surface-container-low rounded-xl">
                <Label className="font-bold">Top Songs</Label>
                {(form.topSongs ?? []).map((song, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 bg-surface-container rounded-lg"
                  >
                    <span className="text-xs font-bold w-5 text-center text-on-surface-variant shrink-0">
                      {i + 1}
                    </span>
                    {song.coverUrl && (
                      <img
                        src={song.coverUrl}
                        alt={song.title}
                        className="w-10 h-10 rounded object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{song.title}</p>
                      <p className="text-xs text-on-surface-variant truncate">
                        {song.artist}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSong(i)}
                      className="text-on-surface-variant hover:text-error transition-colors shrink-0"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                ))}
                {(form.topSongs ?? []).length < 3 && (
                  <MusicSearchInput
                    type="track"
                    placeholder="Search to add a song..."
                    onSelect={addSongFromSearch}
                  />
                )}
              </div>

              {/* Top Artists */}
              <div className="space-y-3 p-5 bg-surface-container-low rounded-xl">
                <Label className="font-bold">Top Artists</Label>
                {(form.topArtists ?? []).map((artist, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 bg-surface-container rounded-lg"
                  >
                    {artist.imageUrl ? (
                      <img
                        src={artist.imageUrl}
                        alt={artist.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-on-surface-variant text-lg">
                          person
                        </span>
                      </div>
                    )}
                    <p className="text-sm font-semibold truncate flex-1 min-w-0">
                      {artist.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeArtist(i)}
                      className="text-on-surface-variant hover:text-error transition-colors shrink-0"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                ))}
                {(form.topArtists ?? []).length < 3 && (
                  <MusicSearchInput
                    type="artist"
                    placeholder="Search to add an artist..."
                    onSelect={addArtistFromSearch}
                  />
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {errors.general && (
          <div className="mx-6 mb-2 p-3 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-sm text-error font-medium">{errors.general}</p>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
