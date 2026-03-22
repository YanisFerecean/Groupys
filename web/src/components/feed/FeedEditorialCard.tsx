interface FeedEditorialCardProps {
  label: string;
  title: string;
  description: string;
  curator: string;
}

export default function FeedEditorialCard({
  label,
  title,
  description,
  curator,
}: FeedEditorialCardProps) {
  return (
    <article className="mb-16 lg:mb-20">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 lg:gap-8 items-center">
        <div className="sm:col-span-5 aspect-square rounded-2xl overflow-hidden shadow-2xl transition-transform hover:rotate-2 bg-gradient-to-br from-surface-container to-surface-container-highest" />
        <div className="sm:col-span-7 py-4">
          <span className="text-primary font-bold text-xs uppercase tracking-[0.2em] mb-4 block">
            {label}
          </span>
          <h3 className="text-2xl lg:text-3xl font-extrabold tracking-tight mb-4">
            {title}
          </h3>
          <p className="text-on-surface-variant leading-relaxed mb-6 font-medium">
            Curated by{" "}
            <span className="text-on-surface font-bold">{curator}</span>.{" "}
            {description}
          </p>
          <div className="flex items-center gap-4">
            <button className="bg-surface-container-highest px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-surface-dim transition-colors">
              <span className="material-symbols-outlined text-lg">
                playlist_add
              </span>
              Save Playlist
            </button>
            <button className="text-primary font-bold text-sm underline underline-offset-8">
              Read Editorial
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
