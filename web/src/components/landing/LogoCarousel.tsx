const logos = [
  { name: "Spotify",       color: "#1ED760", src: "/logos/spotify.svg" },
  { name: "Apple Music",   color: "#FA233B", src: "/logos/applemusic.svg" },
  { name: "Last.fm",       color: "#D51007", src: "/logos/lastdotfm.svg" },
  { name: "YouTube Music", color: "#FF0000", src: "/logos/youtubemusic.svg" },
  { name: "SoundCloud",    color: "#FF5500", src: "/logos/soundcloud.svg" },
  { name: "Tidal",         color: "#000000", src: "/logos/tidal.svg" },
  { name: "Deezer",        color: "#FF0092", src: "/logos/deezer.svg" },
];

// 4 copies so the strip is always wider than any viewport; animation moves exactly
// one copy width (-25% of total), making the loop reset imperceptible.
const track = [...logos, ...logos, ...logos, ...logos];

export default function LogoCarousel() {
  return (
    <section className="py-12 sm:py-16 border-t border-surface-container overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 mb-8 sm:mb-10">
        <p className="text-xs sm:text-sm text-on-surface-variant uppercase tracking-widest font-semibold text-center">
          Connects with your favourite platforms
        </p>
      </div>
      <div className="relative overflow-hidden">
        {/* fade edges — narrower on mobile so logos aren't hidden too early */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-40 z-10 bg-gradient-to-r from-surface to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-40 z-10 bg-gradient-to-l from-surface to-transparent" />

        <div
          className="flex w-max"
          style={{
            animation: "logo-scroll-quad var(--carousel-duration) linear infinite",
            willChange: "transform",
          }}
        >
          {track.map((logo, i) => (
            <div
              key={i}
              className="flex shrink-0 items-center gap-3 sm:gap-4 px-8 sm:px-14 py-2 sm:py-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo.src}
                alt={logo.name}
                width={44}
                height={44}
                loading="eager"
                decoding="async"
                className="h-8 w-8 sm:h-11 sm:w-11 shrink-0"
              />
              <span
                className="text-base sm:text-lg font-semibold whitespace-nowrap"
                style={{ color: logo.color }}
              >
                {logo.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
