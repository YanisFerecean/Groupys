"use client";

import Image from "next/image";
import StepFooter from "../StepFooter";

interface MusicIntroStepProps {
  onBack: () => void;
  onConnect: () => void;
  onManual: () => void;
}

export default function MusicIntroStep({ onBack, onConnect, onManual }: MusicIntroStepProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">
          Bring in your music
        </h2>
        <p className="text-on-surface-variant text-sm">
          Connect Apple Music to auto-fill your top artists, songs and albums — or add them yourself.
        </p>
      </div>

      <button
        onClick={onConnect}
        className="w-full flex items-center justify-center gap-2.5 rounded-2xl py-3.5 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
        style={{ background: "#FA243C" }}
      >
        <Image src="/logos/applemusic.svg" alt="" aria-hidden width={18} height={18} className="brightness-0 invert" />
        Connect Apple Music
      </button>

      <button
        onClick={onManual}
        className="w-full rounded-2xl py-3 text-sm font-bold text-on-surface bg-surface-container-high hover:bg-surface-container-highest transition-colors"
      >
        I&apos;ll pick my favourites
      </button>

      <StepFooter onBack={onBack} />
    </div>
  );
}
