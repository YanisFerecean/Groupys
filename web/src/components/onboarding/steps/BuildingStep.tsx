"use client";

export default function BuildingStep() {
  return (
    <div className="text-center space-y-6 py-10">
      <div className="mx-auto w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <div className="space-y-1">
        <h2 className="text-xl font-extrabold text-on-surface tracking-tight">
          Building your profile…
        </h2>
        <p className="text-on-surface-variant text-sm">
          Pulling in your top artists, songs and albums from Apple Music.
        </p>
      </div>
    </div>
  );
}
