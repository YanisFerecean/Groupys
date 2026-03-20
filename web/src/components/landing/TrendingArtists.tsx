import { getTopArtists } from "@/api/lastfm";

export default async function TrendingArtists() {
  let artists: Awaited<ReturnType<typeof getTopArtists>> = [];
  let error = false;

  try {
    artists = await getTopArtists(4);
  } catch {
    error = true;
  }

  return (
    <section className="py-20 md:py-32 border-t border-surface-container" id="trending">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-12 md:mb-20">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full font-bold tracking-widest text-xs uppercase mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Live from Last.fm
          </div>
          <h2 className="text-3xl font-bold mb-4">Trending Right Now</h2>
          <p className="text-on-surface-variant">
            The most-listened artists on Last.fm this week.
          </p>
        </div>

        {error ? (
          <p className="text-center text-on-surface-variant">
            Could not load trending artists. Check your LASTFM_API_KEY.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {artists.map((artist, i) => (
              <a
                key={artist.mbid || artist.name}
                href={artist.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center group block"
              >
                <div className="relative aspect-square rounded-full overflow-hidden mb-6 ring-offset-4 ring-transparent group-hover:ring-primary/30 ring-4 transition-all duration-500">
                  {artist.image ? (
                    <img
                      alt={artist.name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      src={artist.image}
                    />
                  ) : (
                    <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-surface-variant text-4xl">
                        person
                      </span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 w-7 h-7 bg-primary text-on-primary rounded-full flex items-center justify-center text-xs font-black shadow-md">
                    {i + 1}
                  </div>
                </div>
                <h4 className="font-bold group-hover:text-primary transition-colors duration-300">
                  {artist.name}
                </h4>
                <p className="text-xs text-on-surface-variant uppercase tracking-widest font-semibold mt-1">
                  {parseInt(artist.listeners).toLocaleString()} listeners
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {parseInt(artist.playcount).toLocaleString()} plays
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
