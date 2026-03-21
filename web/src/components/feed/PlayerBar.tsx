"use client";

export default function PlayerBar() {
  return (
    <footer className="fixed bottom-4 lg:bottom-6 left-1/2 -translate-x-1/2 w-[95%] lg:w-[90%] max-w-5xl h-16 lg:h-20 glass-nav bg-surface-container-lowest/70 rounded-full shadow-2xl z-50 px-4 lg:px-8 flex items-center justify-between border border-white/40">
      {/* Track info */}
      <div className="flex items-center gap-3 lg:gap-4 w-1/4 min-w-0">
        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg overflow-hidden bg-surface-container shrink-0" />
        <div className="min-w-0 hidden sm:block">
          <p className="text-sm font-bold leading-none truncate">
            Midnight City Visions
          </p>
          <p className="text-xs text-on-surface-variant/60 truncate">
            Digital Nomads
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-1 flex-1">
        <div className="flex items-center gap-4 lg:gap-6">
          <button className="hidden sm:block text-on-surface-variant/60 hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">shuffle</span>
          </button>
          <button className="text-on-surface hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-2xl lg:text-3xl">
              skip_previous
            </span>
          </button>
          <button className="w-10 h-10 lg:w-12 lg:h-12 bg-primary text-on-primary rounded-full flex items-center justify-center hover:scale-105 transition-transform">
            <span
              className="material-symbols-outlined text-2xl lg:text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              pause
            </span>
          </button>
          <button className="text-on-surface hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-2xl lg:text-3xl">
              skip_next
            </span>
          </button>
          <button className="hidden sm:block text-on-surface-variant/60 hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">repeat</span>
          </button>
        </div>
        <div className="w-full max-w-md hidden sm:flex items-center gap-3">
          <span className="text-[10px] font-bold text-on-surface-variant/60">
            2:45
          </span>
          <div className="flex-1 h-1 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="w-[65%] h-full bg-primary" />
          </div>
          <span className="text-[10px] font-bold text-on-surface-variant/60">
            4:12
          </span>
        </div>
      </div>

      {/* Volume */}
      <div className="hidden lg:flex items-center justify-end gap-4 w-1/4">
        <span className="material-symbols-outlined text-on-surface-variant/60">
          volume_up
        </span>
        <div className="w-24 h-1 bg-surface-container-highest rounded-full overflow-hidden">
          <div className="w-[80%] h-full bg-on-surface-variant" />
        </div>
        <span className="material-symbols-outlined text-on-surface-variant/60">
          queue_music
        </span>
      </div>
    </footer>
  );
}
