"use client";

import { UserButton } from "@clerk/nextjs";

interface TopBarProps {
  onMenuClick?: () => void;
  onSearchClick?: () => void;
}

export default function TopBar({ onMenuClick, onSearchClick }: TopBarProps) {

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 lg:h-20 z-40 bg-surface/80 backdrop-blur-xl border-b border-surface-container">
      <div className="relative flex items-center justify-between px-4 lg:px-12 h-full">
        {/* Hamburger (mobile only) */}
        <button
          className="lg:hidden p-2 -ml-1 text-on-surface-variant hover:text-on-surface transition-colors"
          onClick={onMenuClick}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        {/* Search — centered absolutely so it's independent of left/right content */}
        <div className="absolute left-[calc(50vw-16rem)] -translate-x-1/2 hidden lg:block w-full max-w-xl px-4">
          <button
            onClick={onSearchClick}
            className="flex items-center gap-3 bg-surface-container-high px-4 py-2.5 rounded-full w-full hover:bg-surface-container transition-colors text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-xl">
              search
            </span>
            <span className="text-sm font-semibold text-on-surface-variant/60">
              Search artists, albums, tracks, users, or communities...
            </span>
          </button>
        </div>

        {/* Search — mobile (inline, not centered) */}
        <button
          onClick={onSearchClick}
          className="lg:hidden flex items-center gap-3 bg-surface-container-high px-4 py-2.5 rounded-full flex-1 mx-3 hover:bg-surface-container transition-colors text-left cursor-pointer"
        >
          <span className="material-symbols-outlined text-on-surface-variant text-xl">
            search
          </span>
          <span className="text-sm font-semibold text-on-surface-variant/60">
            Search...
          </span>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-4 lg:gap-6 ml-auto">
          <UserButton appearance={{ elements: { avatarBox: { width: 40, height: 40 } } }} />
        </div>
      </div>
    </header>
  );
}
