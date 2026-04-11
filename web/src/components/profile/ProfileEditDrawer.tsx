"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import type { ProfileCustomization } from "@/types/profile";
import { uploadProfileBanner } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ColorPickerField from "./ColorPickerField";
import BannerPicker from "./BannerPicker";
import MusicSearchInput from "./MusicSearchInput";
import type { TrackResult, ArtistResult, AlbumResult } from "./MusicSearchInput";
import CountrySelect from "./CountrySelect";
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
  initialTab?: "profile" | "customization" | "widgets";
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
  initialTab = "profile",
}: ProfileEditDrawerProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [form, setForm] = useState<ProfileCustomization>({ ...profile });
  const [username, setUsername] = useState(currentUsername);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
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

  // Sync widget colors and settings from external profile changes (e.g., updated via grid).
  // Only widget container colors and sizes are managed externally; preserve user-edited
  // widget content and profile fields inside the drawer.
  const prevColorsRef = useRef({
    albumsContainerColor: profile.albumsContainerColor,
    songsContainerColor: profile.songsContainerColor,
    artistsContainerColor: profile.artistsContainerColor,
    lastRatedAlbumContainerColor: profile.lastRatedAlbumContainerColor,
    currentlyListeningContainerColor: profile.currentlyListeningContainerColor,
    hotTakeContainerColor: profile.hotTakeContainerColor,
  });
  const prevWidgetSettingsRef = useRef({
    widgetOrder: profile.widgetOrder,
    widgetSizes: profile.widgetSizes,
    hiddenWidgets: profile.hiddenWidgets,
  });

  useEffect(() => {
    if (!open) return;

    const colorsChanged =
      profile.albumsContainerColor !== prevColorsRef.current.albumsContainerColor ||
      profile.songsContainerColor !== prevColorsRef.current.songsContainerColor ||
      profile.artistsContainerColor !== prevColorsRef.current.artistsContainerColor ||
      profile.lastRatedAlbumContainerColor !== prevColorsRef.current.lastRatedAlbumContainerColor ||
      profile.currentlyListeningContainerColor !== prevColorsRef.current.currentlyListeningContainerColor ||
      profile.hotTakeContainerColor !== prevColorsRef.current.hotTakeContainerColor;

    const settingsChanged =
      profile.widgetOrder !== prevWidgetSettingsRef.current.widgetOrder ||
      profile.widgetSizes !== prevWidgetSettingsRef.current.widgetSizes ||
      profile.hiddenWidgets !== prevWidgetSettingsRef.current.hiddenWidgets;

    if (!colorsChanged && !settingsChanged) return;

    // Update refs
    prevColorsRef.current = {
      albumsContainerColor: profile.albumsContainerColor,
      songsContainerColor: profile.songsContainerColor,
      artistsContainerColor: profile.artistsContainerColor,
      lastRatedAlbumContainerColor: profile.lastRatedAlbumContainerColor,
      currentlyListeningContainerColor: profile.currentlyListeningContainerColor,
      hotTakeContainerColor: profile.hotTakeContainerColor,
    };
    prevWidgetSettingsRef.current = {
      widgetOrder: profile.widgetOrder,
      widgetSizes: profile.widgetSizes,
      hiddenWidgets: profile.hiddenWidgets,
    };

    // Sync only the changed external fields into form state
    setForm((prev) => ({
      ...prev,
      ...(colorsChanged && {
        albumsContainerColor: profile.albumsContainerColor,
        songsContainerColor: profile.songsContainerColor,
        artistsContainerColor: profile.artistsContainerColor,
        lastRatedAlbumContainerColor: profile.lastRatedAlbumContainerColor,
        currentlyListeningContainerColor: profile.currentlyListeningContainerColor,
        hotTakeContainerColor: profile.hotTakeContainerColor,
      }),
      ...(settingsChanged && {
        widgetOrder: profile.widgetOrder,
        widgetSizes: profile.widgetSizes,
        hiddenWidgets: profile.hiddenWidgets,
      }),
    }));
  }, [
    open,
    profile.albumsContainerColor,
    profile.songsContainerColor,
    profile.artistsContainerColor,
    profile.lastRatedAlbumContainerColor,
    profile.currentlyListeningContainerColor,
    profile.hotTakeContainerColor,
    profile.widgetOrder,
    profile.widgetSizes,
    profile.hiddenWidgets,
  ]);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setForm({ ...profile });
      setUsername(currentUsername);
      setAvatarPreview(null);
      setActiveTab(initialTab);
      setPendingAvatarFile(null);
      setRemoveAvatar(false);
      setPendingBannerFile(null);
      setBannerPreview(null);
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

    if (pendingBannerFile) {
      try {
        const token = await getToken();
        if (!token) return;
        const updated = await uploadProfileBanner(pendingBannerFile, token);
        form.bannerUrl = updated.bannerUrl ?? undefined;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to upload banner.";
        setErrors((prev) => ({ ...prev, banner: message }));
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

  const handleBannerFileSelect = useCallback((file: File) => {
    setPendingBannerFile(file);
    const reader = new FileReader();
    reader.onload = () => setBannerPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleBannerClear = useCallback(() => {
    setPendingBannerFile(null);
    setBannerPreview(null);
    setForm((prev) => ({ ...prev, bannerUrl: undefined }));
  }, []);

  const displayedAvatar = removeAvatar
    ? null
    : avatarPreview ?? currentAvatarUrl;

  // ── Music helpers ─────────────────────────────────────────────────────────

  const clearSynced = (key: string) =>
    setForm((prev) => ({ ...prev, spotifySynced: { ...prev.spotifySynced, [key]: false } }));

  const isWidgetHidden = (key: string) => (form.hiddenWidgets ?? []).includes(key);
  const toggleWidgetHidden = (key: string) =>
    setForm((prev) => {
      const current = prev.hiddenWidgets ?? [];
      return {
        ...prev,
        hiddenWidgets: current.includes(key)
          ? current.filter((k) => k !== key)
          : [...current, key],
      };
    });

const addSongFromSearch = (result: TrackResult) => {
  const songs = [...(form.topSongs ?? [])];
  if (songs.length < 3) {
    songs.push({
      title: result.title,
      preview: result.preview,
        artist: result.artist,
        coverUrl: result.coverUrl,
      });
      set("topSongs", songs);
      clearSynced("topSongs");
    }
  };

  const removeSong = (index: number) => {
    const songs = [...(form.topSongs ?? [])];
    songs.splice(index, 1);
    set("topSongs", songs);
    clearSynced("topSongs");
  };

  const addArtistFromSearch = (result: ArtistResult) => {
    const artists = [...(form.topArtists ?? [])];
    if (artists.length < 3) {
      artists.push({
        id: result.id,
        name: result.name,
        imageUrl: result.imageUrl,
      });
      set("topArtists", artists);
      clearSynced("topArtists");
    }
  };

  const removeArtist = (index: number) => {
    const artists = [...(form.topArtists ?? [])];
    artists.splice(index, 1);
    set("topArtists", artists);
    clearSynced("topArtists");
  };

  const addAlbumFromSearch = (result: AlbumResult) => {
    const albums = [...(form.topAlbums ?? [])];
    if (albums.length < 3) {
      albums.push({
        id: result.id,
        title: result.title,
        artist: result.artist,
        coverUrl: result.coverUrl,
      });
      set("topAlbums", albums);
      clearSynced("topAlbums");
    }
  };

  const removeAlbum = (index: number) => {
    const albums = [...(form.topAlbums ?? [])];
    albums.splice(index, 1);
    set("topAlbums", albums);
    clearSynced("topAlbums");
  };

const setListeningFromSearch = (result: TrackResult) => {
  set("currentlyListening", {
    title: result.title,
    artist: result.artist,
    coverUrl: result.coverUrl,
    preview: result.preview,
  });
  clearSynced("currentlyListening");
};

  // ── Spotify sync handlers ──────────────────────────────────────────────────

  const setSynced = (key: string) =>
    setForm((prev) => ({ ...prev, spotifySynced: { ...prev.spotifySynced, [key]: true } }));

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
      setSynced("topArtists");
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
      setSynced("topSongs");
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
      setSynced("topAlbums");
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
        setSynced("currentlyListening");
      }
    } catch (err) {
      console.error("Failed to sync currently playing:", err);
    } finally {
      setSyncing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col rounded-3xl max-w-3xl overflow-hidden p-0 gap-0" showCloseButton={false}>
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-primary via-primary-container to-secondary shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-6 pb-4 shrink-0">
          <div>
            <DialogTitle className="text-2xl font-bold tracking-tight text-on-surface p-0">Edit Profile</DialogTitle>
            <p className="text-sm text-on-surface-variant mt-1">Make your profile uniquely yours</p>
          </div>
          <DialogPrimitive.Close asChild>
            <button className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant transition-colors">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </DialogPrimitive.Close>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
          <div className="px-8 shrink-0">
            <TabsList className="w-full justify-start bg-surface-container-low p-1.5 rounded-2xl h-auto gap-1">
              <TabsTrigger value="profile" className="rounded-xl px-5 py-2.5 text-sm gap-2 data-[state=active]:bg-surface-container-lowest data-[state=active]:shadow-sm">
                <span className="material-symbols-outlined text-lg">person</span>
                Profile
              </TabsTrigger>
              <TabsTrigger value="customization" className="rounded-xl px-5 py-2.5 text-sm gap-2 data-[state=active]:bg-surface-container-lowest data-[state=active]:shadow-sm">
                <span className="material-symbols-outlined text-lg">palette</span>
                Customization
              </TabsTrigger>
              <TabsTrigger value="widgets" className="rounded-xl px-5 py-2.5 text-sm gap-2 data-[state=active]:bg-surface-container-lowest data-[state=active]:shadow-sm">
                <span className="material-symbols-outlined text-lg">widgets</span>
                Widgets
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6">
            {/* ── Profile Tab ── */}
            <TabsContent value="profile" className="space-y-6">
              {/* Avatar card */}
              <div className="bg-surface-container-low rounded-2xl p-6">
                <div className="flex items-center gap-5">
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-surface-container-high shrink-0 ring-2 ring-surface-container-highest">
                    {displayedAvatar ? (
                      <Image
                        src={displayedAvatar}
                        alt="Avatar"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-surface-variant text-4xl">
                          person
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label className="text-base font-bold">Profile Picture</Label>
                    <p className="text-xs text-on-surface-variant mt-1 mb-3">JPG, PNG or GIF. Max 5MB.</p>
                    <div className="flex gap-2">
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
                        className="rounded-full px-4"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <span className="material-symbols-outlined text-sm mr-1">upload</span>
                        Upload
                      </Button>
                      {(currentAvatarUrl || avatarPreview) && !removeAvatar && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-error rounded-full px-4"
                          onClick={handleRemoveAvatar}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    {avatarPreview && !errors.avatar && (
                      <p className="text-xs text-primary mt-2 font-medium">
                        New image selected — will be saved on save.
                      </p>
                    )}
                    {errors.avatar && (
                      <p className="text-xs text-error font-medium mt-2">
                        {errors.avatar}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Identity card */}
              <div className="bg-surface-container-low rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-primary text-xl">badge</span>
                  <Label className="text-base font-bold">Identity</Label>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Username</Label>
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
                    className={`rounded-xl h-11 ${errors.username ? "border-error" : ""}`}
                  />
                  {errors.username && (
                    <p className="text-xs text-error font-medium">
                      {errors.username}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Display Name</Label>
                    <Input
                      value={form.displayName ?? ""}
                      onChange={(e) => set("displayName", e.target.value)}
                      placeholder="Your display name"
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Country</Label>
                    <CountrySelect
                      value={form.country ?? ""}
                      onChange={(value) => set("country", value || undefined)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Bio</Label>
                  <Textarea
                    value={form.bio ?? ""}
                    onChange={(e) => set("bio", e.target.value)}
                    placeholder="Tell people about yourself..."
                    rows={3}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Tags card */}
              <div className="bg-surface-container-low rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">sell</span>
                    <Label className="text-base font-bold">Tags</Label>
                  </div>
                  <span className="text-xs font-medium text-on-surface-variant bg-surface-container-highest px-2.5 py-1 rounded-full">{(form.tags ?? []).length}/5</span>
                </div>
                {(form.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(form.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="w-5 h-5 rounded-full hover:bg-primary/20 flex items-center justify-center transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {(form.tags ?? []).length < 5 && (
                  <div className="relative">
                    <div className="flex items-center gap-2 rounded-xl border border-surface-container-highest bg-surface-container-lowest px-4 h-11">
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
                        placeholder="Search genres or add a custom tag..."
                        className="flex-1 text-sm bg-transparent outline-none placeholder:text-on-surface-variant"
                      />
                      {tagQuery.trim().length > 0 && (
                        <button
                          type="button"
                          onClick={() => addTag(tagQuery.trim())}
                          className="w-7 h-7 rounded-full bg-primary hover:opacity-90 flex items-center justify-center shrink-0 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-sm text-on-primary">add</span>
                        </button>
                      )}
                    </div>
                    {tagQuery.trim().length > 0 && (
                      <div className="absolute z-10 mt-1.5 w-full rounded-xl border border-surface-container-highest bg-surface-container-lowest shadow-lg overflow-hidden">
                        {tagResults.map((g, i) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => addTag(g.name)}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container transition-colors ${i > 0 ? "border-t border-surface-container-high" : ""}`}
                          >
                            {g.name}
                          </button>
                        ))}
                        {!tagResults.some((g) => g.name.toLowerCase() === tagQuery.trim().toLowerCase()) && (
                          <button
                            type="button"
                            onClick={() => addTag(tagQuery.trim())}
                            className={`w-full text-left px-4 py-2.5 text-sm text-primary font-medium hover:bg-surface-container transition-colors flex items-center gap-2 ${tagResults.length > 0 ? "border-t border-surface-container-high" : ""}`}
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
            <TabsContent value="customization" className="space-y-6">
              <div className="bg-surface-container-low rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">wallpaper</span>
                  <Label className="text-base font-bold">Banner</Label>
                </div>
                <BannerPicker
                  value={form.bannerUrl ?? ""}
                  preview={bannerPreview}
                  onFileSelect={handleBannerFileSelect}
                  onClear={handleBannerClear}
                />
                {errors.banner && (
                  <p className="text-xs text-error font-medium">
                    {errors.banner}
                  </p>
                )}
              </div>

              <div className="bg-surface-container-low rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary text-xl">format_color_fill</span>
                  <Label className="text-base font-bold">Colors</Label>
                </div>
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
              </div>
            </TabsContent>

            {/* ── Widgets Tab ── */}
            <TabsContent value="widgets" className="space-y-5">
              {spotifyConnected && (
                <button
                  type="button"
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
                        spotifySynced: {
                          ...prev.spotifySynced,
                          topArtists: true,
                          topSongs: true,
                          topAlbums: true,
                          ...(playing ? { currentlyListening: true } : {}),
                        },
                      }));
                    } catch (err) {
                      console.error("Failed to sync all from Spotify:", err);
                    } finally {
                      setSyncing(null);
                    }
                  }}
                  disabled={syncing !== null}
                  className="w-full flex items-center justify-center gap-2.5 h-12 rounded-2xl border border-[#1DB954]/30 bg-[#1DB954]/5 text-[#1DB954] hover:bg-[#1DB954]/10 hover:text-[#1ed760] transition-colors font-semibold text-sm disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                  {syncing === "all" ? "Syncing all widgets..." : "Sync All from Spotify"}
                </button>
              )}

              {/* Last Rated Album */}
              <div className="flex items-center justify-between p-5 bg-surface-container-low rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-xl">album</span>
                  </div>
                  <div>
                    <Label className="font-bold text-sm">Last Rated Album</Label>
                    <p className="text-xs text-on-surface-variant mt-0.5">Show your most recent album rating</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => set("showLastRatedAlbum", !form.showLastRatedAlbum)}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                    form.showLastRatedAlbum ? "bg-primary" : "bg-surface-container-highest"
                  }`}
                  aria-label="Toggle last rated album widget"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      form.showLastRatedAlbum ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Hot Take */}
              <div className="flex items-center justify-between p-5 bg-surface-container-low rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                  </div>
                  <div>
                    <Label className="font-bold text-sm">Hot Take</Label>
                    <p className="text-xs text-on-surface-variant mt-0.5">Show this week&apos;s hot take answer</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => set("showHotTake", form.showHotTake === false)}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                    form.showHotTake !== false ? "bg-primary" : "bg-surface-container-highest"
                  }`}
                  aria-label="Toggle hot take widget"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      form.showHotTake !== false ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Top Albums */}
              <div className="space-y-3 p-5 bg-surface-container-low rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-xl">library_music</span>
                    </div>
                    <div>
                      <Label className="font-bold text-sm">Top Albums</Label>
                      <button
                        type="button"
                        onClick={() => toggleWidgetHidden("topAlbums")}
                        className="text-xs text-on-surface-variant hover:text-on-surface transition-colors"
                        title={isWidgetHidden("topAlbums") ? "Show widget" : "Hide widget"}
                      >
                        {isWidgetHidden("topAlbums") ? "Hidden" : "Visible"}
                        <span className="material-symbols-outlined align-text-bottom ml-0.5" style={{ fontSize: 14 }}>
                          {isWidgetHidden("topAlbums") ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>
                  {spotifyConnected && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="text-[#1DB954] hover:text-[#1ed760] gap-1.5 rounded-full"
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
                    className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-xl"
                  >
                    {album.coverUrl && (
                      <Image
                        src={album.coverUrl}
                        alt={album.title}
                        width={44}
                        height={44}
                        className="rounded-lg object-cover shrink-0"
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
                      className="w-7 h-7 rounded-full hover:bg-error/10 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors shrink-0"
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
              <div className="space-y-3 p-5 bg-surface-container-low rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-xl">headphones</span>
                    </div>
                    <div>
                      <Label className="font-bold text-sm">Currently Listening</Label>
                      <button
                        type="button"
                        onClick={() => toggleWidgetHidden("currentlyListening")}
                        className="text-xs text-on-surface-variant hover:text-on-surface transition-colors"
                        title={isWidgetHidden("currentlyListening") ? "Show widget" : "Hide widget"}
                      >
                        {isWidgetHidden("currentlyListening") ? "Hidden" : "Visible"}
                        <span className="material-symbols-outlined align-text-bottom ml-0.5" style={{ fontSize: 14 }}>
                          {isWidgetHidden("currentlyListening") ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>
                  {spotifyConnected && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="text-[#1DB954] hover:text-[#1ed760] gap-1.5 rounded-full"
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
                  <div className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-xl">
                    {form.currentlyListening.coverUrl && (
                      <Image
                        src={form.currentlyListening.coverUrl}
                        alt={form.currentlyListening.title}
                        width={48}
                        height={48}
                        className="rounded-lg object-cover shrink-0"
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
                      onClick={() => { set("currentlyListening", undefined); clearSynced("currentlyListening"); }}
                      className="w-7 h-7 rounded-full hover:bg-error/10 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors shrink-0"
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
              <div className="space-y-3 p-5 bg-surface-container-low rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-xl">music_note</span>
                    </div>
                    <div>
                      <Label className="font-bold text-sm">Top Songs</Label>
                      <button
                        type="button"
                        onClick={() => toggleWidgetHidden("topSongs")}
                        className="text-xs text-on-surface-variant hover:text-on-surface transition-colors"
                        title={isWidgetHidden("topSongs") ? "Show widget" : "Hide widget"}
                      >
                        {isWidgetHidden("topSongs") ? "Hidden" : "Visible"}
                        <span className="material-symbols-outlined align-text-bottom ml-0.5" style={{ fontSize: 14 }}>
                          {isWidgetHidden("topSongs") ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>
                  {spotifyConnected && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="text-[#1DB954] hover:text-[#1ed760] gap-1.5 rounded-full"
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
                    className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-xl"
                  >
                    <span className="text-xs font-bold w-6 text-center text-primary bg-primary/10 rounded-lg py-1 shrink-0">
                      {i + 1}
                    </span>
                    {song.coverUrl && (
                      <Image
                        src={song.coverUrl}
                        alt={song.title}
                        width={44}
                        height={44}
                        className="rounded-lg object-cover shrink-0"
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
                      className="w-7 h-7 rounded-full hover:bg-error/10 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors shrink-0"
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
              <div className="space-y-3 p-5 bg-surface-container-low rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-xl">star</span>
                    </div>
                    <div>
                      <Label className="font-bold text-sm">Top Artists</Label>
                      <button
                        type="button"
                        onClick={() => toggleWidgetHidden("topArtists")}
                        className="text-xs text-on-surface-variant hover:text-on-surface transition-colors"
                        title={isWidgetHidden("topArtists") ? "Show widget" : "Hide widget"}
                      >
                        {isWidgetHidden("topArtists") ? "Hidden" : "Visible"}
                        <span className="material-symbols-outlined align-text-bottom ml-0.5" style={{ fontSize: 14 }}>
                          {isWidgetHidden("topArtists") ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>
                  {spotifyConnected && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="text-[#1DB954] hover:text-[#1ed760] gap-1.5 rounded-full"
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
                    className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-xl"
                  >
                    {artist.imageUrl ? (
                      <Image
                        src={artist.imageUrl}
                        alt={artist.name}
                        width={44}
                        height={44}
                        className="rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
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
                      className="w-7 h-7 rounded-full hover:bg-error/10 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors shrink-0"
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

        {/* Footer actions */}
        {errors.general && (
          <div className="mx-8 mb-2 p-3 bg-error/10 border border-error/20 rounded-xl">
            <p className="text-sm text-error font-medium">{errors.general}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-surface-container-high shrink-0">
          <DialogPrimitive.Close asChild>
            <button className="px-5 py-2.5 rounded-full text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors">
              Cancel
            </button>
          </DialogPrimitive.Close>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-7 py-2.5 rounded-full text-sm font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
