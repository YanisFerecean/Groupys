"use client";

import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import DmButton from "./DmButton";

interface TopBarProps {
  onMenuClick?: () => void;
  onSearchClick?: () => void;
  onSettingsClick?: () => void;
}

export default function TopBar({ onMenuClick, onSearchClick, onSettingsClick }: TopBarProps) {
  const pathname = usePathname();
  const isProfile = pathname === "/profile" || pathname.startsWith("/profile/");
  const isFeed = pathname === "/feed" || pathname.startsWith("/feed/");

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 lg:h-20 z-40 bg-surface/80 backdrop-blur-xl border-b border-surface-container">
      <div className="flex items-center justify-between px-4 lg:px-12 h-full">
        {/* Hamburger (mobile only) */}
        <button
          className="lg:hidden p-2 -ml-1 text-on-surface-variant hover:text-on-surface transition-colors"
          onClick={onMenuClick}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        {/* Search */}
        <button
          onClick={onSearchClick}
          className="flex items-center gap-3 bg-surface-container-high px-4 py-2.5 rounded-full w-full max-w-96 hover:bg-surface-container transition-colors text-left cursor-pointer"
        >
          <span className="material-symbols-outlined text-on-surface-variant text-xl">
            search
          </span>
          <span className="text-sm font-semibold text-on-surface-variant/60">
            Search artists, albums, or tracks...
          </span>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-4 lg:gap-6">
          {isProfile && (
            <button
              onClick={onSettingsClick}
              className="text-slate-500 hover:text-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined">settings</span>
            </button>
          )}
          {isFeed && <DmButton />}
          <UserButton />
        </div>
      </div>
    </header>
  );
}
