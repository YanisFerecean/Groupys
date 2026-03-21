const trendingCommunities = [
  { rank: "01", name: "Neon Waves", tag: "Synthwave · Berlin" },
  { rank: "02", name: "Jazz Heads", tag: "Jazz · New York" },
  { rank: "03", name: "Sahara Sounds", tag: "Afrobeats · Lagos" },
];

export default function FeedSidebar() {
  return (
    <aside className="hidden xl:flex w-80 h-[calc(100vh-5rem)] sticky top-20 border-l border-surface-container-highest px-8 py-12 flex-col gap-12 overflow-y-auto">
      {/* Trending */}
      <div>
        <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/60 mb-6">
          Trending Now
        </h4>
        <div className="space-y-6">
          {trendingCommunities.map((item) => (
            <div
              key={item.rank}
              className="flex items-center gap-4 group cursor-pointer"
            >
              <span className="text-2xl font-black text-surface-container-highest group-hover:text-primary transition-colors">
                {item.rank}
              </span>
              <div>
                <p className="text-sm font-bold leading-none mb-1">
                  {item.name}
                </p>
                <p className="text-xs text-on-surface-variant/60">
                  {item.tag}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Your Circle */}
      <div className="bg-surface-container-low rounded-3xl p-6">
        <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-4">
          Your Circle
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container-lowest p-4 rounded-2xl">
            <p className="text-[10px] text-on-surface-variant/60 font-bold uppercase">
              Active
            </p>
            <p className="text-xl font-black text-primary">14</p>
          </div>
          <div className="bg-surface-container-lowest p-4 rounded-2xl">
            <p className="text-[10px] text-on-surface-variant/60 font-bold uppercase">
              New Matches
            </p>
            <p className="text-xl font-black">08</p>
          </div>
        </div>
        <button className="w-full mt-4 py-3 text-xs font-bold text-on-surface-variant/60 border border-surface-container-highest rounded-full hover:bg-surface-container-lowest transition-colors">
          View All Friends
        </button>
      </div>

      {/* Promo Card */}
      <div className="relative rounded-3xl overflow-hidden aspect-[4/5] bg-primary group cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-primary/40 opacity-60 mix-blend-overlay transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute bottom-0 left-0 p-6 text-on-primary">
          <span className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3">
            Live Session
          </span>
          <h5 className="text-2xl font-black leading-tight mb-2">
            Groupys Studio Sessions: NYC
          </h5>
          <p className="text-sm opacity-90 font-medium">
            Join the waitlist for the exclusive rooftop vinyl night.
          </p>
        </div>
      </div>
    </aside>
  );
}
