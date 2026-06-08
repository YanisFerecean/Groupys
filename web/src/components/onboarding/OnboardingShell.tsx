"use client";

import type { ReactNode } from "react";

interface OnboardingShellProps {
  /** [current 1-based index, total]. Pass [0, n] to hide the bar (welcome). */
  progress: [number, number];
  children: ReactNode;
  /** Render a wider card for review/picker steps. */
  wide?: boolean;
}

export default function OnboardingShell({ progress, children, wide }: OnboardingShellProps) {
  const [current, total] = progress;

  return (
    <div className="min-h-screen bg-surface relative overflow-hidden flex flex-col items-center justify-center px-4 py-10">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-secondary/8 rounded-full blur-3xl pointer-events-none translate-y-1/3" />
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

      <div className={`relative z-10 w-full ${wide ? "max-w-2xl" : "max-w-lg"}`}>
        {/* Wordmark */}
        <div className="text-center mb-6">
          <span className="text-2xl font-black tracking-tight text-primary">Groupys</span>
        </div>

        {/* Progress bar */}
        {current > 0 && (
          <div className="flex justify-center gap-1.5 mb-6" aria-label={`Step ${current} of ${total}`}>
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i < current ? "w-8 bg-primary" : "w-4 bg-surface-container-high"
                }`}
              />
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/5">
          {children}
        </div>
      </div>
    </div>
  );
}
