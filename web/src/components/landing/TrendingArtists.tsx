import Image from "next/image";

const artists = [
  {
    name: "PinkPantheress",
    listeners: "2980139",
    playcount: "311516615",
    url: "https://www.last.fm/music/PinkPantheress",
    image: "https://cdn-images.dzcdn.net/images/artist/dbf10322b8c415487c9caa678f4d82f6/1000x1000-000000-80-0-0.jpg",
  },
  {
    name: "The Weeknd",
    listeners: "5255927",
    playcount: "1103126973",
    url: "https://www.last.fm/music/The+Weeknd",
    image: "https://cdn-images.dzcdn.net/images/artist/581693b4724a7fcfa754455101e13a44/1000x1000-000000-80-0-0.jpg",
  },
  {
    name: "Kendrick Lamar",
    listeners: "5044326",
    playcount: "1016869675",
    url: "https://www.last.fm/music/Kendrick+Lamar",
    image: "https://cdn-images.dzcdn.net/images/artist/be0a7c550567f4af0ed202d7235b74d6/1000x1000-000000-80-0-0.jpg",
  },
  {
    name: "Radiohead",
    listeners: "8174549",
    playcount: "1354906405",
    url: "https://www.last.fm/music/Radiohead",
    image: "https://cdn-images.dzcdn.net/images/artist/96b688020014a21cb80a0268b90287f5/1000x1000-000000-80-0-0.jpg",
  },
];

export default function TrendingArtists() {
  return (
    <section className="py-20 md:py-32 border-t border-surface-container" id="trending">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-12 md:mb-20">
          <h2 className="text-3xl font-bold mb-4">Trending Right Now</h2>
          <p className="text-on-surface-variant">
            The most-listened artists on Last.fm this week.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {artists.map((artist, i) => (
            <a
              key={artist.name}
              href={artist.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center group block"
            >
              <div className="relative aspect-square rounded-full overflow-hidden mb-6 ring-offset-4 ring-transparent group-hover:ring-primary/30 ring-4 transition-all duration-500">
                <Image
                  alt={artist.name}
                  fill
                  className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  src={artist.image}
                  sizes="(max-width: 768px) calc(50vw - 40px), 300px"
                />
              </div>
              <h4 className="font-bold group-hover:text-primary transition-colors duration-300">
                {artist.name}
              </h4>
              <p className="text-xs text-on-surface-variant uppercase tracking-widest font-semibold mt-1">
                {(Math.round(parseInt(artist.listeners) / 100) * 100).toLocaleString()} listeners
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                {(Math.round(parseInt(artist.playcount) / 100) * 100).toLocaleString()} plays
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
