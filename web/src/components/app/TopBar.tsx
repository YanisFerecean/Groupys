"use client";

import { UserButton } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { History, MessageCircle } from "lucide-react";
import FriendsSheet from "@/components/friends/FriendsSheet";

interface TopBarProps {
  onMenuClick?: () => void;
  onSearchClick?: () => void;
  onSettingsClick?: () => void;
}

export default function TopBar({ onMenuClick, onSearchClick, onSettingsClick }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isProfile = pathname === "/profile" || pathname.startsWith("/profile/");
  const isMutuals = pathname === "/match" || pathname.startsWith("/match/");

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
          {isProfile && (
            <button
              onClick={onSettingsClick}
              className="text-slate-500 hover:text-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined">settings</span>
            </button>
          )}
          {isMutuals && (
            <>
              <button
                onClick={() => router.push("/match/history")}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-colors"
                aria-label="Match history"
              >
                <History className="w-5 h-5 text-primary" />
              </button>
              <button
                onClick={() => router.push("/chat")}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-colors"
                aria-label="Messages"
              >
                <MessageCircle className="w-5 h-5 text-primary" />
              </button>
            </>
          )}
          {isProfile && <FriendsSheet />}
          <UserButton />
        </div>
      </div>
    </header>
  );
}
