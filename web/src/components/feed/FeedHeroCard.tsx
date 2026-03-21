interface FeedHeroCardProps {
  title: string;
  artist: string;
  album: string;
  quality?: string;
  verified?: boolean;
  likes: string;
  comments: number;
  listeners: number;
}

export default function FeedHeroCard({
  title,
  artist,
  album,
  quality,
  verified,
  likes,
  comments,
  listeners,
}: FeedHeroCardProps) {
  return (
    <article className="mb-16 lg:mb-20">
      <div className="relative group cursor-pointer overflow-hidden rounded-3xl bg-surface-container-lowest transition-all hover:-translate-y-1">
        <div className="aspect-[16/9] w-full overflow-hidden relative bg-gradient-to-br from-surface-container-high to-surface-container-lowest">
          {/* Play Overlay */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/90 rounded-full flex items-center justify-center text-primary shadow-xl">
              <span
                className="material-symbols-outlined text-3xl lg:text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_arrow
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl lg:text-4xl font-extrabold tracking-tight leading-none mb-2">
                {title}
              </h3>
              <p className="text-base lg:text-xl text-on-surface-variant font-medium">
                {artist} — <span className="text-primary">{album}</span>
              </p>
            </div>
            {quality && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">
                  {quality}
                </span>
                {verified && (
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 mt-6 lg:mt-8 pt-6 border-t border-surface-container">
            <button className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">favorite</span>
              <span className="text-sm font-bold">{likes}</span>
            </button>
            <button className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined">
                chat_bubble_outline
              </span>
              <span className="text-sm font-bold">{comments}</span>
            </button>
            <button className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined">ios_share</span>
            </button>
            {listeners > 0 && (
              <div className="ml-auto flex -space-x-3">
                <div className="w-8 h-8 rounded-full border-2 border-white bg-surface-container-high" />
                <div className="w-8 h-8 rounded-full border-2 border-white bg-surface-container" />
                <div className="w-8 h-8 rounded-full border-2 border-white bg-surface-container-high flex items-center justify-center text-[10px] font-bold">
                  +{listeners}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
