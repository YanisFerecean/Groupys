"use client";

import { useState, useEffect } from "react";
import type { ProfileCustomization } from "@/types/profile";
import TopAlbumsWidget from "./widgets/TopAlbumWidget";
import CurrentlyListeningWidget from "./widgets/CurrentlyListeningWidget";
import TopSongsWidget from "./widgets/TopSongsWidget";
import TopArtistsWidget from "./widgets/TopArtistsWidget";
import LastRatedAlbumWidget from "./widgets/LastRatedAlbumWidget";

type WidgetType = "topAlbums" | "currentlyListening" | "topSongs" | "topArtists" | "lastRatedAlbum";
type DropMode = "swap" | "before" | "after";

interface ProfileWidgetGridProps {
  profile: ProfileCustomization;
  username: string;
  spotifyConnected?: boolean;
  onReorder?: (newOrder: string[]) => void;
}

function getActiveWidgets(profile: ProfileCustomization): WidgetType[] {
  const all: { type: WidgetType; active: boolean }[] = [
    { type: "topAlbums", active: !!profile.topAlbums?.length },
    { type: "currentlyListening", active: !!profile.currentlyListening?.title },
    { type: "topSongs", active: !!profile.topSongs?.length },
    { type: "topArtists", active: !!profile.topArtists?.length },
    { type: "lastRatedAlbum", active: !!profile.showLastRatedAlbum },
  ];
  const defaultOrder: WidgetType[] = ["topAlbums", "currentlyListening", "topSongs", "topArtists", "lastRatedAlbum"];
  const order = (profile.widgetOrder as WidgetType[] | undefined) ?? defaultOrder;

  const inOrder = order.filter((t) => all.find((w) => w.type === t)?.active);
  const notInOrder = all.filter((w) => w.active && !order.includes(w.type)).map((w) => w.type);
  return [...inOrder, ...notInOrder];
}

function renderWidget(
  type: WidgetType,
  profile: ProfileCustomization,
  username: string,
  spotifyConnected?: boolean,
) {
  switch (type) {
    case "topAlbums":
      return <TopAlbumsWidget albums={profile.topAlbums} containerColor={profile.albumsContainerColor} />;
    case "currentlyListening":
      return <CurrentlyListeningWidget track={profile.currentlyListening} spotifyConnected={spotifyConnected} />;
    case "topSongs":
      return <TopSongsWidget songs={profile.topSongs} containerColor={profile.songsContainerColor} />;
    case "topArtists":
      return <TopArtistsWidget artists={profile.topArtists} containerColor={profile.artistsContainerColor} />;
    case "lastRatedAlbum":
      return <LastRatedAlbumWidget username={username} />;
  }
}

interface DraggableWidgetProps {
  isSource: boolean;
  isOverSwap: boolean;
  isOverBefore: boolean;
  isOverAfter: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  children: React.ReactNode;
}

function DraggableWidget({
  isSource,
  isOverSwap,
  isOverBefore,
  isOverAfter,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  children,
}: DraggableWidgetProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={[
        "relative group transition-all duration-150",
        isSource ? "opacity-40 scale-[0.97]" : "",
        isOverSwap ? "outline outline-2 outline-offset-2 outline-primary/50 rounded-2xl" : "",
      ].filter(Boolean).join(" ")}
    >
      {/* Insert-before line in the left gap */}
      {isOverBefore && (
        <div className="absolute -left-3 top-2 bottom-2 w-0.5 bg-primary rounded-full z-20 pointer-events-none" />
      )}
      {/* Insert-after line in the right gap */}
      {isOverAfter && (
        <div className="absolute -right-3 top-2 bottom-2 w-0.5 bg-primary rounded-full z-20 pointer-events-none" />
      )}

      {/* Drag handle — draggable itself, not the container */}
      <div
        draggable
        onDragStart={(e) => { e.stopPropagation(); onDragStart(); }}
        onDragEnd={(e) => { e.stopPropagation(); onDragEnd(); }}
        className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <span
          className="material-symbols-outlined text-on-surface-variant/40 select-none"
          style={{ fontSize: 20 }}
        >
          drag_indicator
        </span>
      </div>

      {children}
    </div>
  );
}

export default function ProfileWidgetGrid({
  profile,
  username,
  spotifyConnected,
  onReorder,
}: ProfileWidgetGridProps) {
  const [items, setItems] = useState<WidgetType[]>(() => getActiveWidgets(profile));
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [dropMode, setDropMode] = useState<DropMode>("swap");

  useEffect(() => {
    setItems(getActiveWidgets(profile));
  }, [profile]);

  function handleDragStart(i: number) {
    setDragSourceIndex(i);
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
      // dragSourceIndex === i, no-op
      setDragSourceIndex(null);
      setOverIndex(null);
      return;
    }

    setItems(next);
    onReorder?.(next);
    setDragSourceIndex(null);
    setOverIndex(null);
  }

  function handleDragEnd() {
    setDragSourceIndex(null);
    setOverIndex(null);
  }

  if (!onReorder) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6 md:px-12 py-10">
        {items.map((type) => (
          <div key={type}>
            {renderWidget(type, profile, username, spotifyConnected)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6 md:px-12 py-10"
      onDragOver={(e) => e.preventDefault()}
    >
      {items.map((type, i) => {
        const active = overIndex === i && dragSourceIndex !== i;
        return (
          <DraggableWidget
            key={type}
            isSource={dragSourceIndex === i}
            isOverSwap={active && dropMode === "swap"}
            isOverBefore={active && dropMode === "before"}
            isOverAfter={active && dropMode === "after"}
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={() => handleDrop(i)}
            onDragEnd={handleDragEnd}
          >
            {renderWidget(type, profile, username, spotifyConnected)}
          </DraggableWidget>
        );
      })}
    </div>
  );
}
