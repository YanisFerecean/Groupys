"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
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
import {
  fetchSpotifyTopArtists,
  fetchSpotifyTopTracks,
  fetchSpotifySavedAlbums,
  fetchSpotifyCurrentlyPlaying,
} from "@/lib/spotify";

// ── Error parsers ───────────────────────────────────────────────────────────

interface ClerkAPIError {
  errors?: { message?: string; longMessage?: string; code?: string }[];
}

function parseClerkError(err: unknown): string {
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
    return first.longMessage ?? first.message ?? "Failed to update username.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
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
  spotifyConnected?: boolean;
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
  spotifyConnected,
}: ProfileEditDrawerProps) {
  const [form, setForm] = useState<ProfileCustomization>({ ...profile });
  const [username, setUsername] = useState(currentUsername);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState<string | null>(null);
  const [tagQuery, setTagQuery] = useState("");
  const [tagResults, setTagResults] = useState<{ id: number; name: string }[]>([]);
  const [tagSearching, setTagSearching] = useState(false);
  const tagDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getToken } = useAuth();

  const searchTags = useCallback(async (text: string) => {
    setTagQuery(text);
    if (tagDebounceRef.current) clearTimeout(tagDebounceRef.current);
    if (text.length < 1) { setTagResults([]); return; }
    tagDebounceRef.current = setTimeout(async () => {
      setTagSearching(true);
      try {
        const token = await getToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api"}/genres?q=${encodeURIComponent(text)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const data = await res.json() as { id: number; name: string }[];
          setTagResults(data.slice(0, 5));
        }
      } catch { /* ignore */ } finally {
        setTagSearching(false);
      }
    }, 350);
  }, [getToken]);

  const addTag = useCallback((name: string) => {
    const current = form.tags ?? [];
    if (current.length >= 5 || current.includes(name)) return;
    set("tags", [...current, name]);
    setTagQuery("");
    setTagResults([]);
  }, [form.tags]);

  const removeTag = useCallback((name: string) => {
    set("tags", (form.tags ?? []).filter((t) => t !== name));
  }, [form.tags]);

  // Clear tag search when dialog closes
  useEffect(() => {
    if (!open) { setTagQuery(""); setTagResults([]); }
  }, [open]);

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
        setErrors((prev) => ({ ...prev, username: parseClerkError(err) }));
        return;
      }
    }

    if (removeAvatar) {
      try {
        await onRemoveProfileImage();
      } catch (err: unknown) {
        setErrors((prev) => ({ ...prev, avatar: parseClerkError(err) }));
        return;
      }
    } else if (pendingAvatarFile) {
      try {
        await onUpdateProfileImage(pendingAvatarFile);
      } catch (err: unknown) {
        setErrors((prev) => ({ ...prev, avatar: parseClerkError(err) }));
        return;
      }
    }

    try {
      await onSave(form);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save profile.";
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

  // ── Spotify sync handlers ──────────────────────────────────────────────────

  const syncTopArtists = async () => {
    const token = await getToken();
    if (!token) return;
    setSyncing("artists");
    try {
      const artists = await fetchSpotifyTopArtists(token);
      set(
        "topArtists",
        artists.map((a) => ({ name: a.name, imageUrl: a.imageUrl })),
      );
    } catch (err) {
      console.error("Failed to sync top artists:", err);
    } finally {
      setSyncing(null);
    }
  };

  const syncTopTracks = async () => {
    const token = await getToken();
    if (!token) return;
    setSyncing("tracks");
    try {
      const tracks = await fetchSpotifyTopTracks(token);
      set(
        "topSongs",
        tracks.map((t) => ({ title: t.title, artist: t.artist, coverUrl: t.coverUrl })),
      );
    } catch (err) {
      console.error("Failed to sync top tracks:", err);
    } finally {
      setSyncing(null);
    }
  };

  const syncSavedAlbums = async () => {
    const token = await getToken();
    if (!token) return;
    setSyncing("albums");
    try {
      const albums = await fetchSpotifySavedAlbums(token);
      set(
        "topAlbums",
        albums.map((a) => ({ title: a.title, artist: a.artist, coverUrl: a.coverUrl })),
      );
    } catch (err) {
      console.error("Failed to sync saved albums:", err);
    } finally {
      setSyncing(null);
    }
  };

  const syncCurrentlyPlaying = async () => {
    const token = await getToken();
    if (!token) return;
    setSyncing("listening");
    try {
      const track = await fetchSpotifyCurrentlyPlaying(token);
      if (track) {
        set("currentlyListening", {
          title: track.title,
          artist: track.artist,
          coverUrl: track.coverUrl,
        });
      }
    } catch (err) {
      console.error("Failed to sync currently playing:", err);
    } finally {
      setSyncing(null);
    }
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
                      <Image
                        src={displayedAvatar}
                        alt="Avatar"
                        fill
                        className="object-cover"
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
                      const { username: _username, ...rest } = prev;
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

              {/* Tags */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tags</Label>
                  <span className="text-xs text-on-surface-variant">{(form.tags ?? []).length}/5</span>
                </div>
                {/* Selected tags */}
                {(form.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(form.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-0.5 hover:text-error transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Search input */}
                {(form.tags ?? []).length < 5 && (
                  <div className="relative">
                    <div className="flex items-center gap-2 rounded-md border border-input bg-transparent px-3 h-9">
                      {tagSearching ? (
                        <span className="material-symbols-outlined text-base text-on-surface-variant animate-spin">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-base text-on-surface-variant">search</span>
                      )}
                      <input
                        type="text"
                        value={tagQuery}
                        onChange={(e) => searchTags(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && tagQuery.trim()) {
                            e.preventDefault();
                            addTag(tagQuery.trim());
                          }
                        }}
                        placeholder="Search or type a custom tag..."
                        className="flex-1 text-sm bg-transparent outline-none placeholder:text-on-surface-variant"
                      />
                      {tagQuery.trim().length > 0 && (
                        <button
                          type="button"
                          onClick={() => addTag(tagQuery.trim())}
                          className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0"
                        >
                          <span className="material-symbols-outlined text-sm text-on-primary">add</span>
                        </button>
                      )}
                    </div>
                    {/* Dropdown */}
                    {tagQuery.trim().length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border border-surface-container-high bg-surface shadow-md overflow-hidden">
                        {tagResults.map((g, i) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => addTag(g.name)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-container transition-colors ${i > 0 ? "border-t border-surface-container-high" : ""}`}
                          >
                            {g.name}
                          </button>
                        ))}
                        {!tagResults.some((g) => g.name.toLowerCase() === tagQuery.trim().toLowerCase()) && (
                          <button
                            type="button"
                            onClick={() => addTag(tagQuery.trim())}
                            className={`w-full text-left px-4 py-2 text-sm text-primary hover:bg-surface-container transition-colors flex items-center gap-2 ${tagResults.length > 0 ? "border-t border-surface-container-high" : ""}`}
                          >
                            <span className="material-symbols-outlined text-base">add_circle</span>
                            Add &quot;{tagQuery.trim()}&quot;
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
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
              {spotifyConnected && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-[#1DB954]/30 text-[#1DB954] hover:bg-[#1DB954]/10 hover:text-[#1ed760]"
                  onClick={async () => {
                    const token = await getToken();
                    if (!token) return;
                    setSyncing("all");
                    try {
                      const [artists, tracks, albums, playing] = await Promise.all([
                        fetchSpotifyTopArtists(token),
                        fetchSpotifyTopTracks(token),
                        fetchSpotifySavedAlbums(token),
                        fetchSpotifyCurrentlyPlaying(token),
                      ]);
                      setForm((prev) => ({
                        ...prev,
                        topArtists: artists.map((a) => ({ name: a.name, imageUrl: a.imageUrl })),
                        topSongs: tracks.map((t) => ({ title: t.title, artist: t.artist, coverUrl: t.coverUrl })),
                        topAlbums: albums.map((a) => ({ title: a.title, artist: a.artist, coverUrl: a.coverUrl })),
                        ...(playing ? { currentlyListening: { title: playing.title, artist: playing.artist, coverUrl: playing.coverUrl } } : {}),
                      }));
                    } catch (err) {
                      console.error("Failed to sync all from Spotify:", err);
                    } finally {
                      setSyncing(null);
                    }
                  }}
                  disabled={syncing !== null}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                  {syncing === "all" ? "Syncing all widgets..." : "Sync All from Spotify"}
                </Button>
              )}

              {/* Top Albums */}
              <div className="space-y-3 p-5 bg-surface-container-low rounded-xl">
                <div className="flex items-center justify-between">
                  <Label className="font-bold">Top Albums</Label>
                  {spotifyConnected && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="text-[#1DB954] hover:text-[#1ed760] gap-1.5"
                      onClick={syncSavedAlbums}
                      disabled={syncing !== null}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                      </svg>
                      {syncing === "albums" ? "Syncing..." : "Sync"}
                    </Button>
                  )}
                </div>
                {(form.topAlbums ?? []).map((album, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 bg-surface-container rounded-lg"
                  >
                    {album.coverUrl && (
                      <Image
                        src={album.coverUrl}
                        alt={album.title}
                        width={40}
                        height={40}
                        className="rounded object-cover shrink-0"
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
                <div className="flex items-center justify-between">
                  <Label className="font-bold">Currently Listening</Label>
                  {spotifyConnected && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="text-[#1DB954] hover:text-[#1ed760] gap-1.5"
                      onClick={syncCurrentlyPlaying}
                      disabled={syncing !== null}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                      </svg>
                      {syncing === "listening" ? "Syncing..." : "Sync"}
                    </Button>
                  )}
                </div>
                {form.currentlyListening?.title ? (
                  <div className="flex items-center gap-3 p-2 bg-surface-container rounded-lg">
                    {form.currentlyListening.coverUrl && (
                      <Image
                        src={form.currentlyListening.coverUrl}
                        alt={form.currentlyListening.title}
                        width={48}
                        height={48}
                        className="rounded object-cover shrink-0"
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
                <div className="flex items-center justify-between">
                  <Label className="font-bold">Top Songs</Label>
                  {spotifyConnected && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="text-[#1DB954] hover:text-[#1ed760] gap-1.5"
                      onClick={syncTopTracks}
                      disabled={syncing !== null}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                      </svg>
                      {syncing === "tracks" ? "Syncing..." : "Sync"}
                    </Button>
                  )}
                </div>
                {(form.topSongs ?? []).map((song, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 bg-surface-container rounded-lg"
                  >
                    <span className="text-xs font-bold w-5 text-center text-on-surface-variant shrink-0">
                      {i + 1}
                    </span>
                    {song.coverUrl && (
                      <Image
                        src={song.coverUrl}
                        alt={song.title}
                        width={40}
                        height={40}
                        className="rounded object-cover shrink-0"
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
                <div className="flex items-center justify-between">
                  <Label className="font-bold">Top Artists</Label>
                  {spotifyConnected && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="text-[#1DB954] hover:text-[#1ed760] gap-1.5"
                      onClick={syncTopArtists}
                      disabled={syncing !== null}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                      </svg>
                      {syncing === "artists" ? "Syncing..." : "Sync"}
                    </Button>
                  )}
                </div>
                {(form.topArtists ?? []).map((artist, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 bg-surface-container rounded-lg"
                  >
                    {artist.imageUrl ? (
                      <Image
                        src={artist.imageUrl}
                        alt={artist.name}
                        width={40}
                        height={40}
                        className="rounded-full object-cover shrink-0"
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
