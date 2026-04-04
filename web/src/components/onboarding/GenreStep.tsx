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
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">
          What&apos;s your vibe?
        </h2>
        <p className="text-on-surface-variant text-sm">
          Pick at least one genre — choose as many as you like.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {GENRES.map(({ name, emoji }) => {
          const isSelected = selected.includes(name);
          return (
            <button
              key={name}
              onClick={() => onToggle(name)}
              className={`relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl font-semibold text-sm transition-all duration-200 ${
                isSelected
                  ? "bg-primary text-on-primary shadow-md shadow-primary/25 scale-[0.97]"
                  : "bg-surface-container text-on-surface hover:bg-surface-container-high hover:scale-[0.97]"
              }`}
            >
              <span className="text-2xl leading-none">{emoji}</span>
              <span className="text-[11px] font-bold tracking-tight leading-none">{name}</span>
              {isSelected && (
                <span
                  className="absolute top-1.5 right-1.5 material-symbols-outlined text-on-primary/80"
                  style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className={`text-xs text-center transition-all duration-200 ${selected.length > 0 ? "text-primary font-semibold" : "text-on-surface-variant/40"}`}>
        {selected.length > 0
          ? `${selected.length} genre${selected.length !== 1 ? "s" : ""} selected`
          : "Select at least one genre to continue"}
      </p>
    </div>
  );
}
