import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SideNav from "@/components/app/SideNav";
import TopBar from "@/components/app/TopBar";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

// ── Mock data (replace with real API calls when backend is ready) ──────────────

const albumOfWeek = {
  title: "After Hours",
  artist: "The Weeknd",
  description:
    "A masterclass in synth-pop revivalism and cinematic storytelling. Dark, lush, and impossible to stop listening to.",
  genres: ["SYNTHWAVE", "R&B"],
  cover:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCYx0Rv1kn_t2zqOUJ5PU0fi10IqhWM7l6DyyMgQh4XZOvpmOhW69-iT20WAauKQTxIwKKEFgxc0pbtE0fHbwlk1uD4gTqOlZZ9bX-8hINEYQIysb4E66vX0rcJs_MN6Y2MIs9vYVnLJzQ9cmeDsWbDNQTtsdov0wa1HWcIrfcKdLs0HDcI-B7qdRwXvdGGE8q3IABxQgjjXbdhrYpkxZByBSb3_FRtSV3nag1Alxg_SlD1WbdHOHZQ7xaUp6hjTm1c_ehlxrjpfKU",
};

const recentAlbums = [
  {
    title: "Random Access Memories",
    artist: "Daft Punk",
    rating: 9,
    cover:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuABHaGv9QFdPCremQpqsyh-JRkvCd5b3KxeL0tnc24Z8nW1VE-H40gcdmVXQQr96wodUPTblEPoC3UUOWwDpEjFd5iccZ__JMTGNPj_jS0sxx4HfXCqIzGQrbkL2-xfxeM6BPu3R9_2bKf6ZTaR8OrP6IKprTNP4o-DQiy8091hyCJGxf45lY8lF4YIOPi3Q5XVsfPHd61o1TQuOtdZ9n_K-v3rgfBUWZjiv4xgpRKoORLdy1bGEmOKQke6hcOei-Ujdkf93pslYNA",
  },
  {
    title: "Discovery",
    artist: "Daft Punk",
    rating: 8,
    cover:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC7mZEhby0cg4VOqa639ONeUfsjR11pITL_lvpxnrhiOnAHgljcyiMzzPp7ZTeWu4lJD6P-CZWHGy2k7XNvWs0UUYrE3DhzsfjgPGopFn9O8PeMJui6B1Lf5EtW9Pbw6ZPd1zEC0WjxOLmRvmBHenH2_4pfjj3Knz59-s3YDR1IQCR1CP6SFnBC-QpVil3H0Z4lFIVYe4wCclJwIwxdVoXFz3LEA4ZmO5QOZOMNcH0_FjWB-Wq8n8XWZc5Pt7Dx9lCAmfefYHI2HAs",
  },
  {
    title: "Currents",
    artist: "Tame Impala",
    rating: 10,
    cover:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDoMMkvVYAqyDgaOQqywvH2DfAy7L31TRqKABBLUSaSQNHd7ud9OnpPyj9ewvhvSS8M464ft_IfIeR32CPvmX5-03SIIA5lCMkDwqSpEJ8i9pigW9MJC0PVCM7OhVWkjriu7adIaphlsjqhpJS55ka7C_czj5R19Y2dSUw-ZG3-wsS4wglGw7cOFVM8mAxcTrGWrFLHDCkq8QH8UP_Q0q_jGblmCZ6MoW0WiWPt--EZ90UbVFQD_YrEUy12oSG6ihzIwieM4dZLiZE",
  },
];

const topArtists = [
  {
    name: "Rosalía",
    genre: "Flamenco Pop",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCshpRMep2rYsB-G7OeER23ZnoSaUWGqrI-x4gSrgaVJYFlwLhx0HS7mhHFI2PkjWzQ4Zo_3tlHzwwC2beG0zAxYvgLATqqlJwUa8HX5EywB8_pStUmAPjH94G9Uehp_HNajDC_72cdGAkN6-h3eTPeUSBVEgw1Ma8yyYPtBu5UDUK0ABJeiERD7Wg7lPVM6eixhwPFWbGZ2Myknaw2onWXcC0gNRmn6BGtHQgzU-7Eyh78GX3g92w3AVT7lCKEqwjX1anavvLqG3M",
  },
  {
    name: "The Blaze",
    genre: "Electronic",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDoCIIph9ksgjRBp8gy4iJRuLe7o7DsNmBGHKYxtcZmRW5jxlJkIOuUS9Nn3cJZZMx_VJL1UDv6CJr6N8Osbnf4IpB-6gcT5jJcWxwlnxuaXcgbQqvX47PFNlxDKHfWWR_wLns3leJHMxlEEQZ_cg9aKErgXm01fgfxKBUcZJZN0NkIoHjpQPhx7ON1CZDjhSo9X0PWO5GStaboyAtm0CMBwpjEIXxjdE50M-MMsdHCcRtRYcUfMD292-uI4P1X28NQ967h0kF4p6k",
  },
  {
    name: "FKJ",
    genre: "Nu-Jazz",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB7yUvKxRWgyEM_95PiOFueEaAsKUUbsiLhu3Vch-HjSi6q1P1ApB67l7DNyI80xtG391ZImSAKWq2HQb15j90ogE33vmj-lcISRYrAU2Oh88WjlNtSE1csAj0lJxhgxcPswYVPDr25ozUfQGIxJ22CJeFDs0lxCAxi53REk2rk1dajjVM7mZJ_w9EjoY4WvrVWgnY8wUHJCyNZYslET0_ru9Fi057nyE0JEaEoeFkSfTjSghd5ZM4jU0K-WW5EnfpO0QfHcpxx5wg",
  },
];

const recentActivity = [
  { text: "Rated", highlight: "After Hours", suffix: "— 9/10", time: "2 hours ago", active: true },
  { text: "Joined community", highlight: "Synthwave Heads", suffix: "", time: "Yesterday", active: false },
  { text: "Completed Weekly Check-in", highlight: "", suffix: "", time: "Monday", active: false },
];

const stats = [
  { icon: "star", label: "Avg. Rating", value: "8.4 / 10" },
  { icon: "album", label: "Albums Rated", value: "24" },
  { icon: "how_to_reg", label: "Check-ins Done", value: "12" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const memberYear = new Date(user.createdAt).getFullYear();
  const displayName = user.fullName ?? user.username ?? "Music Fan";

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <SideNav />
      <TopBar />

      <main className="ml-64 pt-20 min-h-screen">
        {/* ── Profile Header ── */}
        <section className="px-12 pt-16 pb-10">
          <div className="flex items-end gap-10">
            {/* Avatar */}
            <div className="relative w-52 h-52 shrink-0 rounded-2xl overflow-hidden shadow-2xl">
              <img
                alt={displayName}
                className="w-full h-full object-cover"
                src={user.imageUrl}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>

            {/* Info */}
            <div className="flex-1 pb-2">
              <p className="text-sm text-on-surface-variant font-medium mb-3">
                Member since {memberYear}
              </p>
              <h1 className="text-[3.2rem] font-extrabold tracking-tighter leading-none mb-5 text-on-surface">
                {displayName}
              </h1>
              <div className="flex items-center gap-8 text-on-surface-variant font-medium flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold text-lg">24</span>
                  <span className="text-sm uppercase tracking-wide">Albums Rated</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold text-lg">3</span>
                  <span className="text-sm uppercase tracking-wide">Communities</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold text-lg">12</span>
                  <span className="text-sm uppercase tracking-wide">Check-ins</span>
                </div>
              </div>
            </div>

            {/* Share */}
            <div className="mb-2 shrink-0">
              <button className="p-3 bg-surface-container-high rounded-full hover:bg-surface-container-highest transition-colors">
                <span className="material-symbols-outlined">share</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── Content Grid ── */}
        <div className="px-12 grid grid-cols-12 gap-10 pb-24">
          {/* Left column */}
          <div className="col-span-8 space-y-14">
            {/* Album of the Week */}
            <div>
              <h2 className="text-xl font-bold tracking-tight mb-6">Album of the Week</h2>
              <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-8 flex items-center gap-10 group">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
                {/* Cover */}
                <div className="relative z-10 w-48 h-48 shrink-0 shadow-2xl transition-transform duration-500 group-hover:rotate-3">
                  <img
                    alt={albumOfWeek.title}
                    className="w-full h-full object-cover rounded-xl"
                    src={albumOfWeek.cover}
                  />
                  <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-xl">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_arrow
                    </span>
                  </div>
                </div>
                {/* Text */}
                <div className="relative z-10 flex-1">
                  <h3 className="text-4xl font-extrabold tracking-tighter leading-none mb-2">
                    {albumOfWeek.title}
                  </h3>
                  <p className="text-lg text-on-surface-variant font-medium mb-5">
                    {albumOfWeek.artist}
                  </p>
                  <p className="text-on-surface-variant leading-relaxed max-w-md mb-6">
                    {albumOfWeek.description}
                  </p>
                  <div className="flex items-center gap-4">
                    {albumOfWeek.genres.map((g) => (
                      <span key={g} className="text-xs font-bold text-primary tracking-widest">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Ratings */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold tracking-tight">Recent Ratings</h2>
                <button className="text-sm font-bold text-primary hover:opacity-70 transition-opacity">
                  View All
                </button>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {recentAlbums.map((album) => (
                  <div key={album.title} className="group cursor-pointer">
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-container mb-3">
                      <img
                        alt={album.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        src={album.cover}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-11 h-11 bg-white/90 rounded-full flex items-center justify-center">
                          <span
                            className="material-symbols-outlined text-primary"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            play_arrow
                          </span>
                        </div>
                      </div>
                      {/* Rating badge */}
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {album.rating}/10
                      </div>
                    </div>
                    <h4 className="font-bold text-on-surface truncate text-sm">{album.title}</h4>
                    <p className="text-xs text-on-surface-variant">{album.artist}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="col-span-4 space-y-10">
            {/* Stats */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-50 mb-6">
                Your Stats
              </h3>
              <div className="space-y-5">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-xl">
                        {stat.icon}
                      </span>
                      <span className="font-semibold text-sm">{stat.label}</span>
                    </div>
                    <span className="text-primary font-bold text-sm">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Artists */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-50 mb-4 px-1">
                Top Artists
              </h3>
              <div className="space-y-1">
                {topArtists.map((artist) => (
                  <div
                    key={artist.name}
                    className="flex items-center gap-4 p-2 rounded-xl hover:bg-surface-container-low transition-colors group cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-surface-container-high shrink-0">
                      <img
                        alt={artist.name}
                        className="w-full h-full object-cover"
                        src={artist.image}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm group-hover:text-primary transition-colors truncate">
                        {artist.name}
                      </p>
                      <p className="text-xs text-on-surface-variant">{artist.genre}</p>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      arrow_forward_ios
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-50 mb-4 px-1">
                Recent Activity
              </h3>
              <div className="relative pl-6 space-y-7 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-surface-container-highest">
                {recentActivity.map((item, i) => (
                  <div key={i} className="relative">
                    <div
                      className={`absolute -left-[1.375rem] top-1 w-3 h-3 rounded-full border-4 border-surface ${
                        item.active ? "bg-primary" : "bg-on-surface-variant/30"
                      }`}
                    />
                    <p className="text-sm font-semibold leading-snug">
                      {item.text}{" "}
                      {item.highlight && (
                        <span className="text-primary">{item.highlight}</span>
                      )}
                      {item.suffix && <span className="text-on-surface-variant font-normal"> {item.suffix}</span>}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">{item.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
