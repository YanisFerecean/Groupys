const GENRES = [
  { name: "Pop", emoji: "🎤" },
  { name: "Hip-Hop", emoji: "🎧" },
  { name: "R&B", emoji: "🎹" },
  { name: "Rock", emoji: "🎸" },
  { name: "Electronic", emoji: "⚡" },
  { name: "Jazz", emoji: "🎷" },
  { name: "Classical", emoji: "🎻" },
  { name: "Country", emoji: "🤠" },
  { name: "Reggae", emoji: "🌿" },
  { name: "Metal", emoji: "🤘" },
  { name: "Soul", emoji: "✨" },
  { name: "Blues", emoji: "🎺" },
  { name: "Latin", emoji: "💃" },
  { name: "Punk", emoji: "🔥" },
  { name: "Indie", emoji: "🌙" },
  { name: "K-Pop", emoji: "🌸" },
] as const;

interface GenreStepProps {
  selected: string[];
  onToggle: (genre: string) => void;
}

export default function GenreStep({ selected, onToggle }: GenreStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">
          What&apos;s your vibe?
        </h2>
        <p className="text-on-surface-variant text-sm">
          Pick at least one genre — choose as many as you like.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {GENRES.map(({ name, emoji }) => {
          const isSelected = selected.includes(name);
          return (
            <button
              key={name}
              onClick={() => onToggle(name)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 border ${
                isSelected
                  ? "bg-primary text-on-primary border-primary shadow-md shadow-primary/20"
                  : "bg-surface-container text-on-surface border-outline-variant hover:border-outline hover:bg-surface-container-high"
              }`}
            >
              {isSelected && (
                <span className="material-symbols-outlined text-base leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check
                </span>
              )}
              <span>{emoji}</span>
              <span>{name}</span>
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-on-surface-variant text-center">
          {selected.length} genre{selected.length !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
}
