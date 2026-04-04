"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn, getContrastColor } from "@/lib/utils";
import type { ProfileCustomization } from "@/types/profile";
import TopAlbumsWidget from "./widgets/TopAlbumWidget";
import CurrentlyListeningWidget from "./widgets/CurrentlyListeningWidget";
import TopSongsWidget from "./widgets/TopSongsWidget";
import TopArtistsWidget from "./widgets/TopArtistsWidget";
import LastRatedAlbumWidget from "./widgets/LastRatedAlbumWidget";
import HotTakeWidget from "./widgets/HotTakeWidget";
import ColorPickerField from "./ColorPickerField";

type WidgetType = "topAlbums" | "currentlyListening" | "topSongs" | "topArtists" | "lastRatedAlbum" | "hotTake";
type WidgetSize = "small" | "normal";
type DropMode = "swap" | "before" | "after";

interface DragState {
  type: WidgetType;
  offsetX: number;
  offsetY: number;
  width: number;
  x: number;
  y: number;
}

interface ProfileWidgetGridProps {
  profile: ProfileCustomization;
  username: string;
  spotifyConnected?: boolean;
  isEditing?: boolean;
  onReorder?: (newOrder: string[]) => void;
  onSettingsChange?: (widgetType: WidgetType, color: string, size: WidgetSize) => void;
}

const WIDGET_COLOR_KEY: Partial<Record<WidgetType, keyof ProfileCustomization>> = {
  topAlbums: "albumsContainerColor",
  currentlyListening: "currentlyListeningContainerColor",
  topSongs: "songsContainerColor",
  topArtists: "artistsContainerColor",
  lastRatedAlbum: "lastRatedAlbumContainerColor",
  hotTake: "hotTakeContainerColor",
};

function getWidgetColSpan(_type: WidgetType, size: WidgetSize): string {
  if (size === "normal") return "col-span-2 lg:col-span-2";
  return ""; // small: col-span-1 (half of normal)
}

// ── Widget settings popover (color + size) ──────────────────────────────────

interface WidgetSettingsButtonProps {
  colorValue: string;
  sizeValue: WidgetSize;
  iconColor: string;
  onChange: (color: string, size: WidgetSize) => void;
}

function WidgetSettingsButton({ colorValue, sizeValue, iconColor, onChange }: WidgetSettingsButtonProps) {
  const [open, setOpen] = useState(false);
  const [localColor, setLocalColor] = useState(colorValue);
  const [localSize, setLocalSize] = useState<WidgetSize>(sizeValue);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalColor(colorValue); }, [colorValue]);
  useEffect(() => { setLocalSize(sizeValue); }, [sizeValue]);

  function openPopover(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) { close(); return; }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const maxH = window.innerHeight * 0.8;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const top = spaceBelow >= maxH
        ? rect.bottom + 8
        : Math.max(8, window.innerHeight - maxH - 8);
      setPopoverPos({ top, left: Math.max(8, rect.right - 288) });
    }
    setOpen(true);
  }

  function close() {
    setOpen(false);
    onChange(localColor, localSize);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) close();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, localColor, localSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const sizes: WidgetSize[] = ["small", "normal"];

  const popover = open && popoverPos ? createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[9999] w-72 rounded-2xl bg-surface border border-surface-container-high shadow-2xl p-4 overflow-y-auto"
      style={{ top: popoverPos.top, left: popoverPos.left, maxHeight: "80vh" }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold">Widget Settings</span>
        <button
          type="button"
          onClick={close}
          className="text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      {/* Size selector */}
      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-2">Size</p>
      <div className="flex gap-1.5 mb-5">
        {sizes.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setLocalSize(s)}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors",
              localSize === s
                ? "bg-primary text-on-primary"
                : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant",
            )}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-surface-container-high mb-4" />

      {/* Color picker */}
      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-3">Color</p>
      <ColorPickerField label="" value={localColor} onChange={setLocalColor} />
    </div>,
    document.body,
  ) : null;

  return (
    <div>
      <button
        ref={btnRef}
        type="button"
        onClick={openPopover}
        className="w-7 h-7 flex items-center justify-center"
      >
        <span
          className="material-symbols-outlined select-none"
          style={{ fontSize: 20, color: iconColor, opacity: 0.5 }}
        >
          palette
        </span>
      </button>
      {popover}
    </div>
  );
}

function getActiveWidgets(profile: ProfileCustomization): WidgetType[] {
  const hidden = profile.hiddenWidgets ?? [];
  const all: { type: WidgetType; active: boolean }[] = [
    { type: "topAlbums", active: !!profile.topAlbums?.length && !hidden.includes("topAlbums") },
    { type: "currentlyListening", active: !!profile.currentlyListening?.title && !hidden.includes("currentlyListening") },
    { type: "topSongs", active: !!profile.topSongs?.length && !hidden.includes("topSongs") },
    { type: "topArtists", active: !!profile.topArtists?.length && !hidden.includes("topArtists") },
    { type: "lastRatedAlbum", active: !!profile.showLastRatedAlbum && !hidden.includes("lastRatedAlbum") },
    { type: "hotTake", active: profile.showHotTake !== false && !hidden.includes("hotTake") },
  ];
  const defaultOrder: WidgetType[] = ["topAlbums", "currentlyListening", "topSongs", "topArtists", "lastRatedAlbum", "hotTake"];
  const order = (profile.widgetOrder as WidgetType[] | undefined) ?? defaultOrder;

  const inOrder = order.filter((t) => all.find((w) => w.type === t)?.active);
  const notInOrder = all.filter((w) => w.active && !order.includes(w.type)).map((w) => w.type);
  return [...inOrder, ...notInOrder];
}

function getWidgetSize(profile: ProfileCustomization, type: WidgetType): WidgetSize {
  return (profile.widgetSizes?.[type] ?? "normal") as WidgetSize;
}

function renderWidget(
  type: WidgetType,
  profile: ProfileCustomization,
  username: string,
  spotifyConnected?: boolean,
) {
  const size = getWidgetSize(profile, type);
  switch (type) {
    case "topAlbums":
      return <TopAlbumsWidget albums={profile.topAlbums} containerColor={profile.albumsContainerColor} size={size} />;
    case "currentlyListening":
      return <CurrentlyListeningWidget track={profile.currentlyListening} spotifyConnected={spotifyConnected} containerColor={profile.currentlyListeningContainerColor} size={size} />;
    case "topSongs":
      return <TopSongsWidget songs={profile.topSongs} containerColor={profile.songsContainerColor} size={size} />;
    case "topArtists":
      return <TopArtistsWidget artists={profile.topArtists} containerColor={profile.artistsContainerColor} size={size} />;
    case "lastRatedAlbum":
      return <LastRatedAlbumWidget username={username} containerColor={profile.lastRatedAlbumContainerColor} size={size} />;
    case "hotTake":
      return <HotTakeWidget username={username} containerColor={profile.hotTakeContainerColor} size={size} />;
  }
}

// Luminance of Spotify green #1DB954 using the same formula as getContrastColor
const SPOTIFY_GREEN_LUM = (0.299 * 29 + 0.587 * 185 + 0.114 * 84) / 255; // ≈ 0.497

function spotifyBadgeNeedsBg(containerColor?: string): boolean {
  if (!containerColor || !containerColor.startsWith("#") || containerColor.length < 7) return false;
  const r = parseInt(containerColor.slice(1, 3), 16);
  const g = parseInt(containerColor.slice(3, 5), 16);
  const b = parseInt(containerColor.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Need backdrop when the container luminance is close to Spotify green's (~0.497)
  return Math.abs(lum - SPOTIFY_GREEN_LUM) < 0.3;
}

function SpotifySyncBadge({ containerColor }: { containerColor?: string }) {
  const hasBg = spotifyBadgeNeedsBg(containerColor);
  return (
    <div
      className="absolute bottom-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full pointer-events-none"
      style={hasBg ? { background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" } : undefined}
      title="Synced from Spotify"
    >
      <svg viewBox="0 0 24 24" width="11" height="11" fill="#1DB954">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
      <span className="text-[10px] font-semibold" style={{ color: "#1DB954" }}>Spotify</span>
    </div>
  );
}

// 1×1 transparent GIF — used to suppress the native drag ghost
const EMPTY_IMG = (() => {
  if (typeof window === "undefined") return null;
  const img = new Image();
  img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  return img;
})();

interface DraggableWidgetProps {
  isSource: boolean;
  isOverSwap: boolean;
  isOverBefore: boolean;
  isOverAfter: boolean;
  colSpan: string;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, rect: DOMRect) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  settingsColor?: string;
  settingsSize?: WidgetSize;
  onSettingsChange?: (color: string, size: WidgetSize) => void;
  containerColor?: string;
  children: React.ReactNode;
}

function DraggableWidget({
  isSource,
  isOverSwap,
  isOverBefore,
  isOverAfter,
  colSpan,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  settingsColor,
  settingsSize,
  onSettingsChange,
  containerColor,
  children,
}: DraggableWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconColor = containerColor ? getContrastColor(containerColor) : "var(--color-on-surface-variant)";

  function handleHandleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (EMPTY_IMG) e.dataTransfer.setDragImage(EMPTY_IMG, 0, 0);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) onDragStart(e, rect);
  }

  return (
    <div
      ref={containerRef}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "relative group transition-all duration-150",
        colSpan,
        isSource ? "opacity-30 scale-[0.97]" : "",
        isOverSwap ? "outline outline-2 outline-offset-2 outline-primary/50 rounded-2xl" : "",
      )}
    >
      {isOverBefore && (
        <div className="absolute -left-3 top-2 bottom-2 w-0.5 bg-primary rounded-full z-20 pointer-events-none" />
      )}
      {isOverAfter && (
        <div className="absolute -right-3 top-2 bottom-2 w-0.5 bg-primary rounded-full z-20 pointer-events-none" />
      )}

      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {settingsColor !== undefined && settingsSize !== undefined && onSettingsChange && (
          <WidgetSettingsButton
            colorValue={settingsColor}
            sizeValue={settingsSize}
            iconColor={iconColor}
            onChange={onSettingsChange}
          />
        )}
        <div
          draggable
          onDragStart={handleHandleDragStart}
          onDragEnd={(e) => { e.stopPropagation(); onDragEnd(); }}
          className="w-7 h-7 flex items-center justify-center cursor-grab active:cursor-grabbing"
        >
          <span
            className="material-symbols-outlined select-none"
            style={{ fontSize: 20, color: iconColor, opacity: 0.5 }}
          >
            drag_indicator
          </span>
        </div>
      </div>

      {children}
    </div>
  );
}

export default function ProfileWidgetGrid({
  profile,
  username,
  spotifyConnected,
  isEditing,
  onReorder,
  onSettingsChange,
}: ProfileWidgetGridProps) {
  const [items, setItems] = useState<WidgetType[]>(() => getActiveWidgets(profile));
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [dropMode, setDropMode] = useState<DropMode>("swap");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(getActiveWidgets(profile));
  }, [profile]);

  // Track cursor position via dragover and move the overlay directly (no re-render)
  useEffect(() => {
    if (!dragState) return;
    const { offsetX, offsetY } = dragState;

    function onMove(e: DragEvent) {
      if (!overlayRef.current) return;
      if (e.clientX === 0 && e.clientY === 0) return; // suppress end-of-drag ghost jump
      overlayRef.current.style.transform = `translate(${e.clientX - offsetX}px, ${e.clientY - offsetY}px)`;
    }

    window.addEventListener("dragover", onMove);
    return () => window.removeEventListener("dragover", onMove);
  }, [dragState?.offsetX, dragState?.offsetY]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDragStart(i: number, e: React.DragEvent<HTMLDivElement>, rect: DOMRect) {
    setDragSourceIndex(i);
    setDragState({
      type: items[i],
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      x: e.clientX,
      y: e.clientY,
    });
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, i: number) {
    e.preventDefault();
    if (dragSourceIndex === i) return;
    setOverIndex(i);
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    if (relX < 0.25) setDropMode("before");
    else if (relX > 0.75) setDropMode("after");
    else setDropMode("swap");
  }

  function handleDrop(i: number) {
    if (dragSourceIndex === null) return;

    let next: WidgetType[];

    if (dropMode === "swap" && dragSourceIndex !== i) {
      next = [...items];
      [next[dragSourceIndex], next[i]] = [next[i], next[dragSourceIndex]];
    } else if (dropMode !== "swap") {
      const src = items[dragSourceIndex];
      const withoutSrc = items.filter((_, idx) => idx !== dragSourceIndex);
      const targetInNew = withoutSrc.indexOf(items[i]);
      const insertAt = dropMode === "after" ? targetInNew + 1 : targetInNew;
      withoutSrc.splice(insertAt, 0, src);
      next = withoutSrc;
    } else {
      setDragSourceIndex(null);
      setOverIndex(null);
      setDragState(null);
      return;
    }

    setItems(next);
    onReorder?.(next);
    setDragSourceIndex(null);
    setOverIndex(null);
    setDragState(null);
  }

  function handleDragEnd() {
    setDragSourceIndex(null);
    setOverIndex(null);
    setDragState(null);
  }

  if (!onReorder) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 px-6 md:px-12 py-10">
        {items.map((type) => {
          const size = getWidgetSize(profile, type);
          const isSynced = !!profile.spotifySynced?.[type];
          const colorKey = WIDGET_COLOR_KEY[type];
          const containerColor = colorKey ? (profile[colorKey] as string | undefined) : undefined;
          return (
            <div key={type} className={cn("relative", getWidgetColSpan(type, size))}>
              {renderWidget(type, profile, username, spotifyConnected)}
              {isSynced && <SpotifySyncBadge containerColor={containerColor} />}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 px-6 md:px-12 py-10"
        onDragOver={(e) => e.preventDefault()}
      >
        {items.map((type, i) => {
          const active = overIndex === i && dragSourceIndex !== i;
          const size = getWidgetSize(profile, type);
          const hasSettings = !!WIDGET_COLOR_KEY[type];
          const isSynced = !!profile.spotifySynced?.[type];
          const colorKey = WIDGET_COLOR_KEY[type];
          const containerColor = colorKey ? (profile[colorKey] as string | undefined) : undefined;
          return (
            <DraggableWidget
              key={type}
              isSource={dragSourceIndex === i}
              isOverSwap={active && dropMode === "swap"}
              isOverBefore={active && dropMode === "before"}
              isOverAfter={active && dropMode === "after"}
              colSpan={getWidgetColSpan(type, size)}
              onDragStart={(e, rect) => handleDragStart(i, e, rect)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={() => handleDrop(i)}
              onDragEnd={handleDragEnd}
              settingsColor={isEditing && hasSettings ? containerColor ?? "" : undefined}
              settingsSize={isEditing && hasSettings ? size : undefined}
              onSettingsChange={isEditing && hasSettings && onSettingsChange ? (color, sz) => onSettingsChange(type, color, sz) : undefined}
              containerColor={containerColor}
            >
              {renderWidget(type, profile, username, spotifyConnected)}
              {isSynced && <SpotifySyncBadge containerColor={containerColor} />}
            </DraggableWidget>
          );
        })}
      </div>

      {/* Custom drag overlay — fully opaque widget following the cursor */}
      {dragState && (
        <div
          ref={overlayRef}
          className="fixed top-0 left-0 z-[9999] pointer-events-none rotate-2 shadow-2xl"
          style={{
            width: dragState.width,
            transform: `translate(${dragState.x - dragState.offsetX}px, ${dragState.y - dragState.offsetY}px)`,
          }}
        >
          {renderWidget(dragState.type, profile, username, spotifyConnected)}
        </div>
      )}
    </>
  );
}
