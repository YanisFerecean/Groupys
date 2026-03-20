"use client";

import { UserButton } from "@clerk/nextjs";

export default function TopBar() {
  return (
    <header className="fixed top-0 right-0 left-64 h-20 z-40 bg-surface/80 backdrop-blur-xl border-b border-surface-container">
      <div className="flex items-center justify-between px-12 h-full">
        {/* Search */}
        <div className="flex items-center gap-3 bg-surface-container-high px-4 py-2.5 rounded-full w-96 hover:opacity-80 transition-opacity">
          <span className="material-symbols-outlined text-on-surface-variant text-xl">search</span>
          <input
            className="bg-transparent border-none focus:outline-none text-sm font-semibold w-full placeholder:text-on-surface-variant/60"
            placeholder="Search your collection..."
            type="text"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-6">
          <button className="text-slate-500 hover:text-slate-800 transition-colors">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button className="text-slate-500 hover:text-slate-800 transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <UserButton />
        </div>
      </div>
    </header>
  );
}
